import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_INDEX_RELATIVE_PATH, SCHEMA_VERSION } from './constants.mjs';
import { loadRoutingRegistry } from './load-metadata.mjs';
import { validateRoutingRegistry } from './validate.mjs';

function stableSort(entries) {
  return [...entries].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function publicEntry(entry) {
  return {
    id: entry.id,
    scope: entry.scope,
    actors: entry.actors,
    phases: entry.phases,
    capabilities: entry.capabilities,
    side_effects: entry.side_effects,
    requires: entry.requires,
    composes_with: entry.composes_with,
    conflicts_with: entry.conflicts_with,
    selectors: entry.selectors,
    source: entry.source,
    priority: entry.priority,
    skill_md: entry.skill_md,
    routing_path: entry.routing_path,
    bucket: entry.bucket,
    admitted: entry.admitted,
    provenance: entry.provenance,
  };
}

function formatValidationFailure(validation) {
  return validation.errors
    .map((err) => `${err.id || '-'}: ${err.message}`)
    .join('; ');
}

/**
 * Build a deterministic machine-readable Skill index.
 * Never treats ~/.cursor/skills or ~/.agents/skills as canonical sources.
 * Fails clearly on invalid routing metadata before returning an index.
 */
export function buildSkillIndex(repoRoot, options = {}) {
  const registry = loadRoutingRegistry(repoRoot, options);
  const validation = validateRoutingRegistry(registry, {
    repoRoot: path.resolve(repoRoot),
  });

  if (!validation.ok) {
    const error = new Error(
      `Invalid routing metadata; refusing to build skill index: ${formatValidationFailure(validation)}`,
    );
    error.code = 'ROUTING_VALIDATION_FAILED';
    error.validation = validation;
    throw error;
  }

  const routable = stableSort(registry.entries).map(publicEntry);
  const withoutMetadata = [...(registry.discovered_without_metadata || [])].sort((a, b) =>
    String(a.id).localeCompare(String(b.id)),
  );

  const index = {
    schema_version: SCHEMA_VERSION,
    generated_at: options.generatedAt || null,
    repo_root_label: options.repoRootLabel || path.basename(path.resolve(repoRoot)),
    canonical_policy: {
      first_party_root: 'skills/',
      third_party_lock: 'third-party/skills.lock.yaml',
      third_party_overlays: 'third-party/routing/',
      non_canonical_roots: ['~/.cursor/skills', '~/.agents/skills'],
    },
    lock: {
      path: registry.lock.path,
      skills: [...(registry.lock.skills || [])]
        .map((item) => ({
          id: item.id,
          source: item.source,
          ref: item.ref,
          trust: item.trust || 'third-party',
          routing_metadata: item.routing_metadata || null,
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    },
    skills: routable,
    discovered_without_metadata: withoutMetadata,
    counts: {
      routable: routable.length,
      without_metadata: withoutMetadata.length,
      third_party_locked: (registry.lock.skills || []).length,
    },
  };

  return { index, registry, validation };
}

/**
 * Validate, then write the Skill index. Never writes on validation failure.
 */
export function writeSkillIndex(repoRoot, options = {}) {
  const relativeOut = options.outputRelativePath || DEFAULT_INDEX_RELATIVE_PATH;
  const outputPath = path.isAbsolute(relativeOut)
    ? relativeOut
    : path.join(repoRoot, relativeOut);

  const { index, registry, validation } = buildSkillIndex(repoRoot, {
    ...options,
    generatedAt: options.generatedAt || new Date().toISOString(),
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const payload = `${JSON.stringify(index, null, 2)}\n`;
  fs.writeFileSync(outputPath, payload, 'utf8');

  return {
    outputPath,
    relativePath: path.relative(repoRoot, outputPath).split(path.sep).join('/'),
    index,
    registry,
    validation,
  };
}
