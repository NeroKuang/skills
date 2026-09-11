import fs from 'node:fs';
import path from 'node:path';

import { SCHEMA_VERSION } from './constants.mjs';
import { loadYamlFile } from './parse-yaml.mjs';

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/**
 * Canonical first-party exemption paths are repo-relative posix paths to SKILL.md.
 * Absolute paths, drive paths, and traversal segments are rejected.
 */
export function isCanonicalExemptionPath(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.replaceAll('\\', '/');
  if (normalized !== value) return false;
  if (path.isAbsolute(normalized)) return false;
  if (/^[A-Za-z]:/.test(normalized)) return false;
  if (normalized.startsWith('/') || normalized.includes('\0')) return false;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..' || part === '')) return false;
  if (!normalized.startsWith('skills/')) return false;
  if (!normalized.endsWith('/SKILL.md')) return false;
  return true;
}

/**
 * An exemption matches a Skill only when BOTH id and exact skill_md path agree.
 */
export function findBoundExemption(entry, exemptions = []) {
  if (!entry?.id || !entry?.skill_md) return null;
  return (
    exemptions.find(
      (item) => item.id === entry.id && item.path === entry.skill_md,
    ) || null
  );
}

/**
 * Load explicit first-party non-routable exemptions.
 * Preferred path: routing/non-routable.yaml
 */
export function loadNonRoutableExemptions(repoRoot, { exemptionsPath } = {}) {
  const resolved =
    exemptionsPath || path.join(repoRoot, 'routing', 'non-routable.yaml');
  if (!fs.existsSync(resolved)) {
    return {
      path: toPosix(path.relative(repoRoot, resolved) || 'routing/non-routable.yaml'),
      present: false,
      skills: [],
    };
  }

  const data = loadYamlFile(fs, resolved);
  const skills = Array.isArray(data.skills) ? data.skills : [];
  return {
    path: toPosix(path.relative(repoRoot, resolved)),
    present: true,
    schema_version: data.schema_version ?? SCHEMA_VERSION,
    skills: skills.map((item) => ({
      id: item.id,
      path: item.path,
      reason: item.reason,
    })),
  };
}
