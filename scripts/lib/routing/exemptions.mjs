import fs from 'node:fs';
import path from 'node:path';

import { SCHEMA_VERSION } from './constants.mjs';
import { loadYamlFile } from './parse-yaml.mjs';

function toPosix(p) {
  return p.split(path.sep).join('/');
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
