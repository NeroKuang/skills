import fs from 'node:fs';
import path from 'node:path';

import { SCHEMA_VERSION } from './constants.mjs';
import {
  findBoundExemption,
  isCanonicalExemptionPath,
  loadNonRoutableExemptions,
} from './exemptions.mjs';
import { loadYamlFile } from './parse-yaml.mjs';

export {
  findBoundExemption,
  isCanonicalExemptionPath,
  loadNonRoutableExemptions,
} from './exemptions.mjs';

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walkSkillMarkdown(skillsRoot) {
  const out = [];
  if (!fs.existsSync(skillsRoot)) return out;

  const stack = [skillsRoot];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name === 'SKILL.md') out.push(full);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function normalizeSource(source, { defaultType }) {
  if (!source || typeof source !== 'object') {
    return { type: defaultType };
  }
  return { ...source };
}

function normalizeEntry(raw, extras = {}) {
  const capabilities = Array.isArray(raw.capabilities) ? [...raw.capabilities] : [];
  const actors = Array.isArray(raw.actors) ? [...raw.actors] : [];
  const phases = Array.isArray(raw.phases) ? [...raw.phases] : [];
  const requires = Array.isArray(raw.requires) ? [...raw.requires] : [];
  const composes_with = Array.isArray(raw.composes_with) ? [...raw.composes_with] : [];
  const conflicts_with = Array.isArray(raw.conflicts_with) ? [...raw.conflicts_with] : [];
  const selectors =
    raw.selectors && typeof raw.selectors === 'object' && !Array.isArray(raw.selectors)
      ? structuredClone(raw.selectors)
      : {};

  return {
    schema_version: raw.schema_version ?? SCHEMA_VERSION,
    id: raw.id,
    scope: raw.scope,
    actors,
    phases,
    capabilities,
    side_effects: raw.side_effects ?? 'none',
    requires,
    composes_with,
    conflicts_with,
    selectors,
    source: normalizeSource(raw.source, { defaultType: extras.defaultSourceType }),
    priority: typeof raw.priority === 'number' ? raw.priority : 50,
    supports_modes: Array.isArray(raw.supports_modes) ? [...raw.supports_modes] : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    ...extras,
  };
}

export function loadThirdPartyLock(repoRoot, { lockPath } = {}) {
  const resolved =
    lockPath ||
    path.join(repoRoot, 'third-party', 'skills.lock.yaml');
  if (!fs.existsSync(resolved)) {
    return { path: toPosix(path.relative(repoRoot, resolved) || 'third-party/skills.lock.yaml'), skills: [] };
  }
  const data = loadYamlFile(fs, resolved);
  const skills = Array.isArray(data.skills) ? data.skills : [];
  return {
    path: toPosix(path.relative(repoRoot, resolved)),
    schema_version: data.schema_version ?? SCHEMA_VERSION,
    skills,
  };
}

export function loadFirstPartyRoutingEntries(repoRoot, { skillsRoot } = {}) {
  const root = skillsRoot || path.join(repoRoot, 'skills');
  const entries = [];

  for (const skillMd of walkSkillMarkdown(root)) {
    const skillDir = path.dirname(skillMd);
    const routingPath = path.join(skillDir, 'routing.yaml');
    const relSkillMd = toPosix(path.relative(repoRoot, skillMd));
    const bucket = toPosix(path.relative(root, skillDir)).split('/')[0] || 'unknown';
    const directoryName = path.basename(skillDir);

    if (!fs.existsSync(routingPath)) {
      entries.push({
        id: directoryName,
        scope: null,
        metadata_present: false,
        skill_md: relSkillMd,
        routing_path: null,
        bucket,
        provenance: {
          kind: 'first-party',
          path: toPosix(path.relative(repoRoot, skillDir)),
        },
      });
      continue;
    }

    const raw = loadYamlFile(fs, routingPath);
    const normalized = normalizeEntry(raw, {
      defaultSourceType: 'first-party',
      metadata_present: true,
      skill_md: relSkillMd,
      routing_path: toPosix(path.relative(repoRoot, routingPath)),
      bucket,
      provenance: {
        kind: 'first-party',
        path: toPosix(path.relative(repoRoot, skillDir)),
      },
    });
    entries.push(normalized);
  }

  return entries;
}

function compareLockOverlayProvenance(lockEntry, overlaySource = {}) {
  if (!lockEntry) {
    return {
      ok: false,
      reason: 'missing-lock',
      mismatches: [],
    };
  }
  if (!lockEntry.source || !lockEntry.ref) {
    return {
      ok: false,
      reason: 'incomplete-lock',
      mismatches: [],
    };
  }

  const mismatches = [];
  const overlayRepository = overlaySource.repository;
  const overlayRef = overlaySource.ref;

  if (overlayRepository && overlayRepository !== lockEntry.source) {
    mismatches.push({
      field: 'repository',
      lock: lockEntry.source,
      overlay: overlayRepository,
    });
  }
  if (overlayRef && overlayRef !== lockEntry.ref) {
    mismatches.push({
      field: 'ref',
      lock: lockEntry.ref,
      overlay: overlayRef,
    });
  }

  if (mismatches.length > 0) {
    return {
      ok: false,
      reason: 'lock-overlay-provenance-mismatch',
      mismatches,
    };
  }

  return {
    ok: true,
    reason: null,
    mismatches: [],
  };
}

export function loadThirdPartyRoutingOverlays(repoRoot, { overlayDir, lock } = {}) {
  const dir = overlayDir || path.join(repoRoot, 'third-party', 'routing');
  const lockData = lock || loadThirdPartyLock(repoRoot);
  const lockById = new Map(
    (lockData.skills || []).map((item) => [item.id, item]),
  );

  if (!fs.existsSync(dir)) return [];

  const overlays = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .filter((name) => name !== 'README.yaml' && name !== 'README.yml')
    .sort((a, b) => a.localeCompare(b));

  return overlays.map((name) => {
    const full = path.join(dir, name);
    const raw = loadYamlFile(fs, full);
    const lockEntry = lockById.get(raw.id) || null;
    const agreement = compareLockOverlayProvenance(lockEntry, raw.source || {});
    const admitted = Boolean(lockEntry && agreement.ok);

    // Lock is authoritative whenever present. Overlay provenance may only
    // duplicate the lock values; mismatches are recorded and rejected.
    const authoritativeSource = {
      type: 'third-party',
      repository: lockEntry?.source || raw.source?.repository || null,
      ref: lockEntry?.ref || raw.source?.ref || null,
    };

    const normalized = normalizeEntry(raw, {
      defaultSourceType: 'third-party',
      metadata_present: true,
      skill_md: null,
      routing_path: toPosix(path.relative(repoRoot, full)),
      bucket: 'third-party',
      lock_entry: lockEntry,
      admitted,
      provenance_mismatch: agreement.reason === 'lock-overlay-provenance-mismatch',
      provenance_mismatches: agreement.mismatches,
      provenance: {
        kind: 'third-party',
        lock_path: lockData.path,
        overlay_path: toPosix(path.relative(repoRoot, full)),
        source: authoritativeSource.repository,
        ref: authoritativeSource.ref,
        agreement: agreement.reason || 'ok',
      },
    });

    normalized.source = authoritativeSource;
    return normalized;
  });
}

/**
 * Load all routable metadata from a repository-like root.
 * Never reads ~/.cursor/skills or ~/.agents/skills.
 */
export function loadRoutingRegistry(repoRoot, options = {}) {
  const absoluteRoot = path.resolve(repoRoot);
  const firstParty = loadFirstPartyRoutingEntries(absoluteRoot, {
    skillsRoot: options.skillsRoot
      ? path.resolve(options.skillsRoot)
      : path.join(absoluteRoot, 'skills'),
  });
  const lock = loadThirdPartyLock(absoluteRoot, {
    lockPath: options.lockPath ? path.resolve(options.lockPath) : undefined,
  });
  const thirdParty = loadThirdPartyRoutingOverlays(absoluteRoot, {
    overlayDir: options.overlayDir
      ? path.resolve(options.overlayDir)
      : path.join(absoluteRoot, 'third-party', 'routing'),
    lock,
  });
  const exemptions = loadNonRoutableExemptions(absoluteRoot, {
    exemptionsPath: options.exemptionsPath
      ? path.resolve(options.exemptionsPath)
      : undefined,
  });

  const withMetadata = [
    ...firstParty.filter((entry) => entry.metadata_present),
    ...thirdParty,
  ];

  const withoutMetadata = firstParty.filter((entry) => !entry.metadata_present);
  const exempted = [];
  const unclassified = [];

  for (const entry of withoutMetadata) {
    // Hard bind: id AND exact skill_md path must both match one exemption.
    // Crossed pairs must not exempt either Skill.
    const exemption = findBoundExemption(entry, exemptions.skills);
    if (exemption && isCanonicalExemptionPath(exemption.path)) {
      exempted.push({
        id: entry.id,
        skill_md: entry.skill_md,
        bucket: entry.bucket,
        reason: exemption.reason || null,
        exemption_path: exemption.path || null,
        provenance: entry.provenance,
      });
    } else {
      unclassified.push({
        id: entry.id,
        skill_md: entry.skill_md,
        bucket: entry.bucket,
        provenance: entry.provenance,
      });
    }
  }

  return {
    repoRoot: absoluteRoot,
    lock,
    exemptions,
    // Backward-compatible alias used by Phase A callers/tests.
    discovered_without_metadata: unclassified,
    unclassified_first_party: unclassified,
    exempted_first_party: exempted,
    entries: withMetadata,
  };
}
