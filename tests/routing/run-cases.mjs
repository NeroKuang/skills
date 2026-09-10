#!/usr/bin/env node

/**
 * Executable Cases A-E for Phase A routing foundation.
 * Uses only synthetic fixture names. No private intake data.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  assertNotVisibleAfterScope,
  loadRoutingRegistry,
  resolveSkillCandidates,
  validateRoutingRegistry,
} from '../../scripts/lib/routing/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const fixtureRoot = path.join(repoRoot, 'tests/fixtures/routing');

function loadFixtureRegistry() {
  return loadRoutingRegistry(fixtureRoot, {
    skillsRoot: path.join(fixtureRoot, 'skills'),
    lockPath: path.join(fixtureRoot, 'third-party/skills.lock.yaml'),
    overlayDir: path.join(fixtureRoot, 'third-party/routing'),
  });
}

function caseA() {
  const registry = loadFixtureRegistry();
  const result = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    workingPath: '/tmp/example-pali-admin',
    actor: 'executor',
    phase: 'operate',
    capabilities: ['terminal', 'deployment'],
  });

  assert.equal(
    assertNotVisibleAfterScope(result, 'lobster-ping'),
    true,
    'Case A: lobster-ping must be excluded at scope stage',
  );
  assert.equal(
    result.candidate_ids.includes('lobster-ping'),
    false,
    'Case A: lobster-ping must not reach semantic candidates',
  );
  const scopeExclusion = result.excluded.find(
    (item) => item.id === 'lobster-ping' && item.stage === 'scope',
  );
  assert.ok(scopeExclusion, 'Case A: scope exclusion evidence required');
  assert.equal(scopeExclusion.reason, 'project-local-selector-mismatch');

  return {
    name: 'A',
    title: 'project-local isolation',
    result: 'PASS',
    detail:
      'lobster-ping (repository=example/lobster) excluded at scope before semantic routing when active repository=example/pali-admin',
    after_scope_ids: result.after_scope_ids,
  };
}

function caseB() {
  const registry = loadFixtureRegistry();
  const result = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    actor: 'controller',
    phase: 'operate',
    capabilities: ['source-read', 'github-read'],
  });

  assert.equal(result.candidate_ids.includes('executor-deploy'), false);
  const actorHit = result.excluded.find(
    (item) => item.id === 'executor-deploy' && item.stage === 'actor',
  );
  assert.ok(actorHit, 'Case B: actor exclusion required');

  // Also prove capability filtering when actor would otherwise pass.
  const capabilityOnly = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    actor: 'executor',
    phase: 'operate',
    capabilities: ['source-read'],
  });
  const capHit = capabilityOnly.excluded.find(
    (item) => item.id === 'executor-deploy' && item.stage === 'capability',
  );
  assert.ok(capHit, 'Case B: capability exclusion required when terminal missing');

  return {
    name: 'B',
    title: 'actor filtering',
    result: 'PASS',
    detail:
      'executor-deploy excluded for controller without terminal; also excluded by capability when terminal missing',
  };
}

function caseC() {
  const registry = loadFixtureRegistry();
  const result = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    actor: 'executor',
    phase: 'implement',
    capabilities: ['source-write', 'terminal'],
  });

  assert.equal(result.candidate_ids.includes('shared-impl'), true);
  assert.equal(result.candidate_ids.includes('lobster-ping'), false);
  assert.equal(result.after_scope_ids.includes('shared-impl'), true);

  return {
    name: 'C',
    title: 'shared-base fallback',
    result: 'PASS',
    detail: 'shared-impl remains available when no more-specific candidate matches',
    candidate_ids: result.candidate_ids,
  };
}

function caseD() {
  const registry = loadFixtureRegistry();

  // Resolver excludes orphan third-party lacking lock admission.
  const resolved = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    actor: 'controller',
    phase: 'research',
    capabilities: ['external-research'],
    taskContract: {
      explicitCapabilities: ['external-research'],
      includeThirdParty: true,
    },
  });

  assert.equal(resolved.after_scope_ids.includes('orphan-third-party'), false);
  assert.equal(resolved.candidate_ids.includes('orphan-third-party'), false);
  assert.equal(resolved.candidate_ids.includes('example-synth-research'), true);

  const orphanExclusion = resolved.excluded.find(
    (item) =>
      item.id === 'orphan-third-party' &&
      item.reason === 'third-party-missing-lock-or-provenance',
  );
  assert.ok(orphanExclusion, 'Case D: missing lock must exclude orphan overlay');

  // Validator also fails when orphan overlays are present.
  const validation = validateRoutingRegistry(registry, { repoRoot: fixtureRoot });
  assert.equal(validation.ok, false);
  assert.ok(
    validation.errors.some(
      (err) =>
        err.id === 'orphan-third-party' &&
        /lock/i.test(err.message),
    ),
    'Case D: validator must reject third-party without lock',
  );

  return {
    name: 'D',
    title: 'third-party admission requires lock/provenance',
    result: 'PASS',
    detail:
      'orphan-third-party excluded/invalid without lock; example-synth-research admitted with lock+ref',
  };
}

function caseE() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-a-malformed-'));
  try {
    const skillsRoot = path.join(tempRoot, 'skills/engineering/bad-phase');
    fs.mkdirSync(skillsRoot, { recursive: true });
    fs.copyFileSync(
      path.join(fixtureRoot, 'malformed/bad-phase/SKILL.md'),
      path.join(skillsRoot, 'SKILL.md'),
    );
    fs.copyFileSync(
      path.join(fixtureRoot, 'malformed/bad-phase/routing.yaml'),
      path.join(skillsRoot, 'routing.yaml'),
    );
    fs.mkdirSync(path.join(tempRoot, 'third-party/routing'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'third-party/skills.lock.yaml'),
      'schema_version: 1\nskills: []\n',
      'utf8',
    );

    const registry = loadRoutingRegistry(tempRoot);
    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, false);
    assert.ok(
      validation.errors.some((err) => /invalid phase/.test(err.message)),
      'Case E: invalid phase must fail validation',
    );

    // Second malformed fixture: invalid scope.
    const scopeRoot = path.join(tempRoot, 'skills/engineering/bad-scope');
    fs.mkdirSync(scopeRoot, { recursive: true });
    fs.copyFileSync(
      path.join(fixtureRoot, 'malformed/bad-scope/SKILL.md'),
      path.join(scopeRoot, 'SKILL.md'),
    );
    fs.copyFileSync(
      path.join(fixtureRoot, 'malformed/bad-scope/routing.yaml'),
      path.join(scopeRoot, 'routing.yaml'),
    );
    const registry2 = loadRoutingRegistry(tempRoot);
    const validation2 = validateRoutingRegistry(registry2, { repoRoot: tempRoot });
    assert.equal(validation2.ok, false);
    assert.ok(
      validation2.errors.some((err) => /invalid scope/.test(err.message)),
      'Case E: invalid scope must fail validation',
    );

    return {
      name: 'E',
      title: 'malformed metadata validation failure',
      result: 'PASS',
      detail: 'invalid phase/scope produce non-zero validation failure',
      errors: validation2.errors.map((err) => `${err.id}: ${err.message}`),
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const demo = process.argv.includes('--demo');
  const cases = [caseA, caseB, caseC, caseD, caseE];
  const results = [];

  for (const run of cases) {
    try {
      results.push(run());
    } catch (err) {
      results.push({
        name: run.name?.replace('case', '') || '?',
        title: run.name || 'unknown',
        result: 'FAIL',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const item of results) {
    const prefix = demo ? `Case ${item.name}:` : `[${item.name}]`;
    console.log(`${prefix} ${item.title}`);
    console.log(`Result: ${item.result}`);
    console.log(`Detail: ${item.detail}`);
    if (item.after_scope_ids) {
      console.log(`After scope ids: ${item.after_scope_ids.join(', ') || '(none)'}`);
    }
    if (item.candidate_ids) {
      console.log(`Candidates: ${item.candidate_ids.join(', ')}`);
    }
    if (item.errors) {
      console.log(`Errors: ${item.errors.join(' | ')}`);
    }
    console.log('');
  }

  const failed = results.filter((item) => item.result !== 'PASS');
  if (failed.length) {
    console.error(`FAILED: ${failed.length}/${results.length}`);
    process.exit(1);
  }

  console.log(`PASSED: ${results.length}/${results.length}`);
}

main();
