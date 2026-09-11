import fs from 'node:fs';
import path from 'node:path';

import {
  ACTORS,
  PHASES,
  PROJECT_SELECTORS,
  SCHEMA_VERSION,
  SCOPES,
  SIDE_EFFECTS,
} from './constants.mjs';
import { findSecretViolations } from './secrets.mjs';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function pushError(errors, entryId, message) {
  errors.push({
    id: entryId || null,
    message,
  });
}

function hasProjectSelector(selectors = {}) {
  return PROJECT_SELECTORS.some((key) => {
    const value = selectors[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}

function collectKnownIds(registry) {
  const ids = new Set();
  for (const entry of registry.entries) {
    if (entry.id) ids.add(entry.id);
  }
  for (const entry of registry.discovered_without_metadata || []) {
    if (entry.id) ids.add(entry.id);
  }
  for (const item of registry.lock?.skills || []) {
    if (item.id) ids.add(item.id);
  }
  return ids;
}

function validateRequiresRefs(entry, knownIds, errors) {
  for (const req of asArray(entry.requires)) {
    if (typeof req === 'string') {
      if (!knownIds.has(req)) {
        pushError(errors, entry.id, `requires unknown skill "${req}"`);
      }
      continue;
    }
    if (req && typeof req === 'object') {
      if (req.skill && !knownIds.has(req.skill)) {
        pushError(errors, entry.id, `requires unknown skill "${req.skill}"`);
      }
      continue;
    }
    pushError(errors, entry.id, 'requires entries must be strings or {skill|capability} objects');
  }
}

function validateCompositionRefs(entry, knownIds, errors) {
  for (const field of ['composes_with', 'conflicts_with']) {
    for (const skillId of asArray(entry[field])) {
      if (!knownIds.has(skillId)) {
        pushError(errors, entry.id, `${field} references unknown skill "${skillId}"`);
      }
    }
  }
}

export function validateRoutingRegistry(registry, { repoRoot } = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Map();
  const root = repoRoot || registry.repoRoot;
  const knownIds = collectKnownIds(registry);

  for (const entry of registry.entries) {
    if (!entry.id) {
      pushError(errors, null, `routing entry missing id (${entry.routing_path || 'unknown path'})`);
      continue;
    }

    if (seen.has(entry.id)) {
      pushError(
        errors,
        entry.id,
        `duplicate skill id (also at ${seen.get(entry.id)})`,
      );
    } else {
      seen.set(entry.id, entry.routing_path || entry.skill_md || '<memory>');
    }

    if (entry.schema_version !== SCHEMA_VERSION) {
      pushError(
        errors,
        entry.id,
        `unsupported schema_version ${entry.schema_version}; expected ${SCHEMA_VERSION}`,
      );
    }

    if (!SCOPES.includes(entry.scope)) {
      pushError(errors, entry.id, `invalid scope "${entry.scope}"`);
    }

    const actors = asArray(entry.actors);
    if (actors.length === 0) {
      pushError(errors, entry.id, 'actors must be a non-empty list');
    }
    for (const actor of actors) {
      if (!ACTORS.includes(actor)) {
        pushError(errors, entry.id, `invalid actor "${actor}"`);
      }
    }

    const phases = asArray(entry.phases);
    if (phases.length === 0) {
      pushError(errors, entry.id, 'phases must be a non-empty list');
    }
    for (const phase of phases) {
      if (!PHASES.includes(phase)) {
        pushError(errors, entry.id, `invalid phase "${phase}"`);
      }
    }

    if (!SIDE_EFFECTS.includes(entry.side_effects)) {
      pushError(errors, entry.id, `invalid side_effects "${entry.side_effects}"`);
    }

    if (entry.scope === 'project-local' && !hasProjectSelector(entry.selectors)) {
      pushError(
        errors,
        entry.id,
        'project-local entries require at least one project selector',
      );
    }

    if (entry.scope === 'third-party' || entry.source?.type === 'third-party') {
      const repository = entry.source?.repository || entry.provenance?.source;
      const ref = entry.source?.ref || entry.provenance?.ref;
      if (!repository) {
        pushError(errors, entry.id, 'third-party entries require source repository provenance');
      }
      if (!ref) {
        pushError(errors, entry.id, 'third-party entries require a pinned ref');
      }
      if (!entry.lock_entry) {
        pushError(
          errors,
          entry.id,
          'third-party entries require a matching third-party/skills.lock.yaml record',
        );
      } else {
        if (entry.lock_entry.source && repository && entry.lock_entry.source !== repository) {
          pushError(
            errors,
            entry.id,
            `third-party lock/overlay repository mismatch (lock=${entry.lock_entry.source}, effective=${repository})`,
          );
        }
        if (entry.lock_entry.ref && ref && entry.lock_entry.ref !== ref) {
          pushError(
            errors,
            entry.id,
            `third-party lock/overlay ref mismatch (lock=${entry.lock_entry.ref}, effective=${ref})`,
          );
        }
      }
      if (entry.provenance_mismatch) {
        const details = (entry.provenance_mismatches || [])
          .map((item) => `${item.field}: lock=${item.lock} overlay=${item.overlay}`)
          .join('; ');
        pushError(
          errors,
          entry.id,
          `third-party lock/overlay provenance mismatch${details ? ` (${details})` : ''}`,
        );
      }
    }

    if (entry.provenance?.kind === 'first-party' || entry.source?.type === 'first-party') {
      if (!entry.skill_md) {
        pushError(errors, entry.id, 'first-party entries must map to an existing SKILL.md');
      } else {
        const absolute = path.isAbsolute(entry.skill_md)
          ? entry.skill_md
          : path.join(root, entry.skill_md);
        if (!fs.existsSync(absolute)) {
          pushError(errors, entry.id, `SKILL.md not found at ${entry.skill_md}`);
        }
      }
    }

    for (const finding of findSecretViolations(entry)) {
      pushError(errors, entry.id, `secret-like metadata at ${finding.path}: ${finding.reason}`);
    }

    validateRequiresRefs(entry, knownIds, errors);
    validateCompositionRefs(entry, knownIds, errors);
  }

  for (const item of registry.lock?.skills || []) {
    if (!item.id) {
      pushError(errors, null, 'skills.lock.yaml entry missing id');
      continue;
    }
    if (!item.source) {
      pushError(errors, item.id, 'skills.lock.yaml entry missing source');
    }
    if (!item.ref) {
      pushError(errors, item.id, 'skills.lock.yaml entry missing pinned ref');
    }
  }

  for (const missing of registry.discovered_without_metadata || []) {
    warnings.push({
      id: missing.id,
      message: `first-party skill has SKILL.md but no routing.yaml (${missing.skill_md})`,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      entries: registry.entries.length,
      without_metadata: (registry.discovered_without_metadata || []).length,
      lock_entries: (registry.lock?.skills || []).length,
    },
  };
}
