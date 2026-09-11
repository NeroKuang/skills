import { FILTER_PIPELINE, SCOPE_PRECEDENCE } from './constants.mjs';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function actorMatches(entryActors, requestActor) {
  if (!requestActor) return true;
  const actors = asArray(entryActors);
  if (actors.includes('both')) return true;
  return actors.includes(requestActor);
}

function capabilityMatches(entryCapabilities, availableCapabilities) {
  const required = asArray(entryCapabilities);
  if (required.length === 0) return true;
  if (!availableCapabilities) return false;
  const available = new Set(asArray(availableCapabilities));
  return required.every((cap) => available.has(cap));
}

function phaseMatches(entryPhases, requestPhase) {
  if (!requestPhase) return true;
  const phases = asArray(entryPhases);
  if (phases.length === 0) return true;
  return phases.includes(requestPhase);
}

function pathMatches(patterns, workingPath) {
  if (!workingPath) return false;
  const normalized = workingPath.replaceAll('\\', '/');
  return asArray(patterns).some((pattern) => {
    const needle = String(pattern).replaceAll('\\', '/');
    return normalized.includes(needle);
  });
}

function markerMatches(markers, workingPath, { existsSync } = {}) {
  if (!workingPath || typeof existsSync !== 'function') return false;
  return asArray(markers).some((marker) => {
    const candidate = workingPath.endsWith(marker)
      ? workingPath
      : `${workingPath.replace(/\/$/, '')}/${marker}`;
    return existsSync(candidate);
  });
}

/**
 * Project-local selector match. All declared selector groups are ANDed.
 * Within a group, values are ORed.
 */
export function projectLocalMatches(entry, context = {}) {
  const selectors = entry.selectors || {};
  const declared = Object.keys(selectors).filter((key) => {
    const value = selectors[key];
    return Array.isArray(value) ? value.length > 0 : value != null && value !== '';
  });

  if (declared.length === 0) return false;

  for (const key of declared) {
    const value = selectors[key];
    if (key === 'repository') {
      const active = context.repository;
      if (!active || !asArray(value).includes(active)) return false;
      continue;
    }
    if (key === 'path') {
      if (!pathMatches(value, context.workingPath)) return false;
      continue;
    }
    if (key === 'marker_file') {
      if (!markerMatches(value, context.workingPath, context)) return false;
      continue;
    }
    if (key === 'explicit_project_id') {
      const projectId = context.explicitProjectId || context.projectId;
      if (!projectId || !asArray(value).includes(projectId)) return false;
      continue;
    }
    // Unknown selector keys fail closed for project-local.
    return false;
  }

  return true;
}

function privateUserMatches(entry, context = {}) {
  const task = context.taskContract || {};
  if (task.includePrivateUser === true) return true;
  if (asArray(task.includeSkills).includes(entry.id)) return true;

  const wanted = new Set([
    ...asArray(task.explicitCapabilities),
    ...asArray(context.requestedCapabilities),
  ]);
  if (wanted.size === 0) return false;

  const selectors = entry.selectors || {};
  const explicit = asArray(selectors.explicit_capabilities);
  return explicit.some((cap) => wanted.has(cap));
}

export function thirdPartyAdmitted(entry) {
  if (entry.admitted === false) return false;
  if (entry.provenance_mismatch) return false;
  const source = entry.source || {};
  const repository = source.repository || entry.provenance?.source;
  const ref = source.ref || entry.provenance?.ref;
  if (!repository || !ref) return false;
  if (entry.lock_entry == null && entry.admitted !== true) return false;
  return true;
}

function thirdPartyAdmissionFailureReason(entry) {
  if (entry.provenance_mismatch) {
    return 'third-party-lock-overlay-provenance-mismatch';
  }
  return 'third-party-missing-lock-or-provenance';
}

function isThirdPartyEntry(entry) {
  return entry.scope === 'third-party' || entry.source?.type === 'third-party';
}

function thirdPartyMatches(entry, context = {}) {
  if (!thirdPartyAdmitted(entry)) return false;
  const task = context.taskContract || {};
  if (asArray(task.includeSkills).includes(entry.id)) return true;
  if (task.includeThirdParty === true) return true;

  const wanted = new Set([
    ...asArray(task.explicitCapabilities),
    ...asArray(context.requestedCapabilities),
  ]);
  const caps = asArray(entry.capabilities);
  if (wanted.size > 0 && caps.some((cap) => wanted.has(cap))) return true;

  // Overlay may declare explicit task triggers via selectors.explicit_capabilities.
  const explicit = asArray(entry.selectors?.explicit_capabilities);
  if (explicit.some((cap) => wanted.has(cap))) return true;

  // Without an explicit match, third-party stays out of the default candidate set.
  return false;
}

/**
 * Scope resolution before actor/capability/phase filters.
 * Project-local mismatches are excluded here so later stages never see them.
 * Task-contract includeSkills may raise precedence, but never bypasses
 * hard admission invariants (third-party lock/provenance, project-local selectors).
 */
export function filterByScope(entries, context = {}) {
  const task = context.taskContract || {};
  const include = new Set(asArray(task.includeSkills));
  const exclude = new Set(asArray(task.excludeSkills));
  const surviving = [];
  const excluded = [];

  for (const entry of entries) {
    if (exclude.has(entry.id)) {
      excluded.push({ id: entry.id, stage: 'scope', reason: 'task-contract-exclude' });
      continue;
    }

    if (include.has(entry.id)) {
      if (entry.scope === 'project-local' && !projectLocalMatches(entry, context)) {
        excluded.push({
          id: entry.id,
          stage: 'scope',
          reason: 'project-local-selector-mismatch',
          selectors: entry.selectors || {},
          active_repository: context.repository || null,
          note: 'task-contract includeSkills cannot bypass project-local selectors',
        });
        continue;
      }
      if (isThirdPartyEntry(entry) && !thirdPartyAdmitted(entry)) {
        excluded.push({
          id: entry.id,
          stage: 'scope',
          reason: thirdPartyAdmissionFailureReason(entry),
          note: 'task-contract includeSkills cannot bypass third-party admission',
        });
        continue;
      }
      surviving.push({
        ...entry,
        resolution: {
          layer: 'task-contract',
          precedence: SCOPE_PRECEDENCE['task-contract'],
        },
      });
      continue;
    }

    if (entry.scope === 'project-local') {
      if (!projectLocalMatches(entry, context)) {
        excluded.push({
          id: entry.id,
          stage: 'scope',
          reason: 'project-local-selector-mismatch',
          selectors: entry.selectors || {},
          active_repository: context.repository || null,
        });
        continue;
      }
      surviving.push({
        ...entry,
        resolution: {
          layer: 'project-local',
          precedence: SCOPE_PRECEDENCE['project-local'],
        },
      });
      continue;
    }

    if (entry.scope === 'private-user') {
      if (!privateUserMatches(entry, context)) {
        excluded.push({
          id: entry.id,
          stage: 'scope',
          reason: 'private-user-not-requested',
        });
        continue;
      }
      surviving.push({
        ...entry,
        resolution: {
          layer: 'private-user',
          precedence: SCOPE_PRECEDENCE['private-user'],
        },
      });
      continue;
    }

    if (entry.scope === 'third-party') {
      if (!thirdPartyMatches(entry, context)) {
        excluded.push({
          id: entry.id,
          stage: 'scope',
          reason: thirdPartyAdmitted(entry)
            ? 'third-party-not-requested'
            : thirdPartyAdmissionFailureReason(entry),
        });
        continue;
      }
      surviving.push({
        ...entry,
        resolution: {
          layer: 'third-party',
          precedence: SCOPE_PRECEDENCE['third-party'],
        },
      });
      continue;
    }

    if (entry.scope === 'shared-base') {
      surviving.push({
        ...entry,
        resolution: {
          layer: 'shared-base',
          precedence: SCOPE_PRECEDENCE['shared-base'],
        },
      });
      continue;
    }

    excluded.push({
      id: entry.id,
      stage: 'scope',
      reason: `unknown-or-missing-scope:${entry.scope}`,
    });
  }

  return { surviving, excluded };
}

export function filterByActor(entries, context = {}) {
  const surviving = [];
  const excluded = [];
  for (const entry of entries) {
    if (!actorMatches(entry.actors, context.actor)) {
      excluded.push({
        id: entry.id,
        stage: 'actor',
        reason: 'actor-mismatch',
        required_actors: asArray(entry.actors),
        request_actor: context.actor || null,
      });
      continue;
    }
    surviving.push(entry);
  }
  return { surviving, excluded };
}

export function filterByCapability(entries, context = {}) {
  const surviving = [];
  const excluded = [];
  for (const entry of entries) {
    if (!capabilityMatches(entry.capabilities, context.capabilities)) {
      excluded.push({
        id: entry.id,
        stage: 'capability',
        reason: 'capability-mismatch',
        required_capabilities: asArray(entry.capabilities),
        available_capabilities: asArray(context.capabilities),
      });
      continue;
    }
    surviving.push(entry);
  }
  return { surviving, excluded };
}

export function filterByPhase(entries, context = {}) {
  const surviving = [];
  const excluded = [];
  for (const entry of entries) {
    if (!phaseMatches(entry.phases, context.phase)) {
      excluded.push({
        id: entry.id,
        stage: 'phase',
        reason: 'phase-mismatch',
        skill_phases: asArray(entry.phases),
        request_phase: context.phase || null,
      });
      continue;
    }
    surviving.push(entry);
  }
  return { surviving, excluded };
}

function stableSortCandidates(entries) {
  return [...entries].sort((a, b) => {
    const pa = a.resolution?.precedence ?? 0;
    const pb = b.resolution?.precedence ?? 0;
    if (pb !== pa) return pb - pa;
    const priA = typeof a.priority === 'number' ? a.priority : 50;
    const priB = typeof b.priority === 'number' ? b.priority : 50;
    if (priB !== priA) return priB - priA;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Deterministic routing candidate resolution.
 * Order: scope -> actor -> capability -> phase
 * Semantic SKILL.md selection happens after this function returns.
 */
export function resolveSkillCandidates(entries, context = {}) {
  const stages = [];
  let current = [...entries];
  let allExcluded = [];

  const run = (name, fn) => {
    const { surviving, excluded } = fn(current, context);
    stages.push({
      name,
      input_count: current.length,
      surviving_ids: surviving.map((e) => e.id),
      excluded,
    });
    current = surviving;
    allExcluded = allExcluded.concat(excluded);
  };

  run('scope', filterByScope);
  run('actor', filterByActor);
  run('capability', filterByCapability);
  run('phase', filterByPhase);

  const candidates = stableSortCandidates(current);

  return {
    pipeline: FILTER_PIPELINE.slice(),
    context: {
      repository: context.repository || null,
      workingPath: context.workingPath || null,
      actor: context.actor || null,
      phase: context.phase || null,
      capabilities: asArray(context.capabilities),
      taskContract: context.taskContract || {},
    },
    stages,
    excluded: allExcluded,
    candidates,
    candidate_ids: candidates.map((entry) => entry.id),
    // Convenience: ids visible after scope stage only (Case A proof surface).
    after_scope_ids: stages.find((s) => s.name === 'scope')?.surviving_ids || [],
  };
}

export function assertNotVisibleAfterScope(result, skillId) {
  return !result.after_scope_ids.includes(skillId);
}
