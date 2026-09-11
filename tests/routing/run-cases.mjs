#!/usr/bin/env node

/**
 * Executable routing regression cases for Phase A.
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
  buildSkillIndex,
  loadRoutingRegistry,
  resolveSkillCandidates,
  validateRoutingRegistry,
  writeSkillIndex,
} from '../../scripts/lib/routing/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const fixtureRoot = path.join(repoRoot, 'tests/fixtures/routing');
const mismatchRoot = path.join(fixtureRoot, 'mismatch');

function loadFixtureRegistry() {
  return loadRoutingRegistry(fixtureRoot, {
    skillsRoot: path.join(fixtureRoot, 'skills'),
    lockPath: path.join(fixtureRoot, 'third-party/skills.lock.yaml'),
    overlayDir: path.join(fixtureRoot, 'third-party/routing'),
  });
}

function writeEmptyThirdParty(tempRoot) {
  fs.mkdirSync(path.join(tempRoot, 'third-party/routing'), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, 'third-party/skills.lock.yaml'),
    'schema_version: 1\nskills: []\n',
    'utf8',
  );
}

function copySkillFixture(tempRoot, fixtureName, targetRel) {
  const sourceDir = path.join(fixtureRoot, 'malformed', fixtureName);
  const targetDir = path.join(tempRoot, targetRel);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(path.join(sourceDir, 'SKILL.md'), path.join(targetDir, 'SKILL.md'));
  fs.copyFileSync(path.join(sourceDir, 'routing.yaml'), path.join(targetDir, 'routing.yaml'));
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

  const validation = validateRoutingRegistry(registry, { repoRoot: fixtureRoot });
  assert.equal(validation.ok, false);
  assert.ok(
    validation.errors.some(
      (err) => err.id === 'orphan-third-party' && /lock/i.test(err.message),
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
    writeEmptyThirdParty(tempRoot);
    copySkillFixture(tempRoot, 'bad-phase', 'skills/engineering/bad-phase');
    copySkillFixture(tempRoot, 'bad-scope', 'skills/engineering/bad-scope');
    copySkillFixture(tempRoot, 'bad-reference', 'skills/engineering/bad-reference');

    const registry = loadRoutingRegistry(tempRoot);
    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, false);
    assert.ok(
      validation.errors.some((err) => /invalid phase/.test(err.message)),
      'Case E: invalid phase must fail validation',
    );
    assert.ok(
      validation.errors.some((err) => /invalid scope/.test(err.message)),
      'Case E: invalid scope must fail validation',
    );
    assert.ok(
      validation.errors.some(
        (err) =>
          err.id === 'bad-reference' &&
          (/requires unknown skill/.test(err.message) ||
            /composes_with references unknown skill/.test(err.message)),
      ),
      'Case E: unresolved Skill reference must fail validation',
    );

    return {
      name: 'E',
      title: 'malformed metadata validation failure',
      result: 'PASS',
      detail: 'invalid phase/scope/reference produce validation failure',
      errors: validation.errors.map((err) => `${err.id}: ${err.message}`),
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseF() {
  const registry = loadFixtureRegistry();
  const resolved = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    actor: 'controller',
    phase: 'research',
    capabilities: ['external-research'],
    taskContract: {
      includeSkills: ['orphan-third-party'],
      includeThirdParty: true,
      explicitCapabilities: ['external-research'],
    },
  });

  assert.equal(resolved.after_scope_ids.includes('orphan-third-party'), false);
  assert.equal(resolved.candidate_ids.includes('orphan-third-party'), false);
  const exclusion = resolved.excluded.find(
    (item) =>
      item.id === 'orphan-third-party' &&
      item.reason === 'third-party-missing-lock-or-provenance',
  );
  assert.ok(exclusion, 'Case F: explicit include must still fail admission');
  assert.match(
    String(exclusion.note || ''),
    /cannot bypass/,
    'Case F: exclusion must note includeSkills cannot bypass admission',
  );

  return {
    name: 'F',
    title: 'explicit orphan third-party include still rejected',
    result: 'PASS',
    detail:
      'task-contract includeSkills=[orphan-third-party] still excluded without lock/provenance',
  };
}

function caseG() {
  fs.mkdirSync(path.join(mismatchRoot, 'skills'), { recursive: true });
  const registry = loadRoutingRegistry(mismatchRoot, {
    skillsRoot: path.join(mismatchRoot, 'skills'),
    lockPath: path.join(mismatchRoot, 'third-party/skills.lock.yaml'),
    overlayDir: path.join(mismatchRoot, 'third-party/routing'),
  });

  const entry = registry.entries.find((item) => item.id === 'mismatched-research');
  assert.ok(entry, 'Case G: mismatched-research overlay must load');
  assert.equal(entry.admitted, false);
  assert.equal(entry.provenance_mismatch, true);
  assert.equal(entry.source.repository, 'https://github.com/example/locked-research-skill');
  assert.equal(entry.source.ref, 'lock-ref-aaaa');

  const validation = validateRoutingRegistry(registry, { repoRoot: mismatchRoot });
  assert.equal(validation.ok, false);
  assert.ok(
    validation.errors.some(
      (err) =>
        err.id === 'mismatched-research' &&
        /provenance mismatch/i.test(err.message),
    ),
    'Case G: validator must reject lock/overlay provenance mismatch',
  );

  const resolved = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    actor: 'controller',
    phase: 'research',
    capabilities: ['external-research'],
    taskContract: {
      includeSkills: ['mismatched-research'],
      includeThirdParty: true,
    },
  });
  assert.equal(resolved.candidate_ids.includes('mismatched-research'), false);
  assert.ok(
    resolved.excluded.some(
      (item) =>
        item.id === 'mismatched-research' &&
        item.reason === 'third-party-lock-overlay-provenance-mismatch',
    ),
    'Case G: resolver must exclude mismatched third-party even when explicitly included',
  );

  return {
    name: 'G',
    title: 'lock/overlay provenance mismatch rejected',
    result: 'PASS',
    detail:
      'mismatched-research lock and overlay disagree on repository/ref; lock stays authoritative and entry is rejected',
    errors: validation.errors.map((err) => `${err.id}: ${err.message}`),
  };
}

function caseH() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-a-build-fail-'));
  const outputPath = path.join(tempRoot, 'out', 'skill-index.json');
  try {
    writeEmptyThirdParty(tempRoot);
    copySkillFixture(tempRoot, 'bad-reference', 'skills/engineering/bad-reference');

    let threw = false;
    try {
      writeSkillIndex(tempRoot, { outputRelativePath: outputPath });
    } catch (err) {
      threw = true;
      assert.equal(err.code, 'ROUTING_VALIDATION_FAILED');
      assert.ok(
        /Invalid routing metadata/.test(err.message),
        'Case H: builder must fail clearly on malformed metadata',
      );
      assert.ok(
        err.validation?.errors?.some((item) => /unknown skill/.test(item.message)),
        'Case H: builder failure must carry unresolved reference errors',
      );
    }

    assert.equal(threw, true, 'Case H: writeSkillIndex must throw');
    assert.equal(
      fs.existsSync(outputPath),
      false,
      'Case H: invalid metadata must not emit a skill index artifact',
    );

    return {
      name: 'H',
      title: 'malformed build-index fails closed',
      result: 'PASS',
      detail:
        'build/write path exits with ROUTING_VALIDATION_FAILED and does not emit a valid index',
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseI() {
  const registry = loadFixtureRegistry();
  const result = resolveSkillCandidates(registry.entries, {
    repository: 'example/pali-admin',
    workingPath: '/tmp/example-pali-admin',
    actor: 'executor',
    phase: 'operate',
    capabilities: ['terminal', 'deployment'],
    taskContract: {
      includeSkills: ['lobster-ping'],
    },
  });

  assert.equal(
    assertNotVisibleAfterScope(result, 'lobster-ping'),
    true,
    'Case I: lobster-ping must be excluded at scope even when includeSkills names it',
  );
  assert.equal(result.after_scope_ids.includes('lobster-ping'), false);
  assert.equal(result.candidate_ids.includes('lobster-ping'), false);

  const exclusion = result.excluded.find(
    (item) =>
      item.id === 'lobster-ping' &&
      item.stage === 'scope' &&
      item.reason === 'project-local-selector-mismatch',
  );
  assert.ok(exclusion, 'Case I: project-local-selector-mismatch required');
  assert.match(
    String(exclusion.note || ''),
    /cannot bypass project-local/,
    'Case I: exclusion must note includeSkills cannot bypass project-local selectors',
  );

  // Matching project-local Skills may still receive task-contract precedence.
  const matched = resolveSkillCandidates(registry.entries, {
    repository: 'example/lobster',
    workingPath: '/tmp/example-lobster',
    actor: 'executor',
    phase: 'operate',
    capabilities: ['terminal', 'deployment'],
    taskContract: {
      includeSkills: ['lobster-ping'],
    },
  });
  const included = matched.candidates.find((item) => item.id === 'lobster-ping');
  assert.ok(included, 'Case I: matching project-local include must survive');
  assert.equal(included.resolution?.layer, 'task-contract');

  return {
    name: 'I',
    title: 'explicit project-local include still requires selectors',
    result: 'PASS',
    detail:
      'includeSkills=[lobster-ping] with active repository=example/pali-admin still excluded at scope as project-local-selector-mismatch',
    after_scope_ids: result.after_scope_ids,
  };
}

function caseJ() {
  const registry = loadRoutingRegistry(repoRoot);
  const validation = validateRoutingRegistry(registry, { repoRoot });
  assert.equal(validation.ok, true, 'Case J: repository classification must PASS');
  assert.equal((registry.unclassified_first_party || []).length, 0);
  assert.ok(registry.entries.length >= 39, 'Case J: expected first-party metadata backfill');
  const { index } = buildSkillIndex(repoRoot);
  assert.equal(index.counts.without_metadata, 0);
  assert.equal(index.skills.length, index.counts.routable);

  return {
    name: 'J',
    title: 'complete first-party classification',
    result: 'PASS',
    detail: `routable=${index.counts.routable}, exempted=${index.counts.exempted}, unclassified=0`,
  };
}

function caseK() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-b-unclassified-'));
  const outputPath = path.join(tempRoot, 'skill-index.json');
  try {
    writeEmptyThirdParty(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'routing'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'routing/non-routable.yaml'),
      'schema_version: 1\nskills: []\n',
      'utf8',
    );
    const skillDir = path.join(tempRoot, 'skills/engineering/orphan-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: orphan-skill\ndescription: Missing metadata fixture.\n---\n\n# Orphan\n',
      'utf8',
    );

    const registry = loadRoutingRegistry(tempRoot);
    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, false);
    assert.ok(
      validation.errors.some((err) => /unclassified/.test(err.message)),
      'Case K: unclassified first-party must fail validation',
    );

    let threw = false;
    try {
      writeSkillIndex(tempRoot, { outputRelativePath: outputPath });
    } catch (err) {
      threw = true;
      assert.equal(err.code, 'ROUTING_VALIDATION_FAILED');
    }
    assert.equal(threw, true);
    assert.equal(fs.existsSync(outputPath), false);

    return {
      name: 'K',
      title: 'missing first-party classification fails',
      result: 'PASS',
      detail: 'SKILL.md without routing.yaml or exemption fails validation and build-index',
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseL() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-b-bad-exemption-'));
  try {
    writeEmptyThirdParty(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'routing'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'skills/engineering'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'routing/non-routable.yaml'),
      [
        'schema_version: 1',
        'skills:',
        '  - id: missing-skill',
        '    path: skills/engineering/missing-skill/SKILL.md',
        '    reason: stale exemption for Case L',
        '',
      ].join('\n'),
      'utf8',
    );

    const registry = loadRoutingRegistry(tempRoot);
    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, false);
    assert.ok(
      validation.errors.some(
        (err) =>
          err.id === 'missing-skill' &&
          /does not exist|does not match a discovered first-party Skill/.test(err.message),
      ),
      'Case L: invalid exemption must fail validation',
    );

    return {
      name: 'L',
      title: 'invalid exemption fails',
      result: 'PASS',
      detail: 'stale/missing exemption path fails validation',
      errors: validation.errors.map((err) => `${err.id}: ${err.message}`),
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseM() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-b-exempt-'));
  try {
    writeEmptyThirdParty(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'routing'), { recursive: true });
    const skillDir = path.join(tempRoot, 'skills/misc/legacy-compat');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: legacy-compat\ndescription: Explicitly non-routable fixture.\n---\n\n# Legacy Compat\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tempRoot, 'routing/non-routable.yaml'),
      [
        'schema_version: 1',
        'skills:',
        '  - id: legacy-compat',
        '    path: skills/misc/legacy-compat/SKILL.md',
        '    reason: compatibility-only fixture excluded from routing',
        '',
      ].join('\n'),
      'utf8',
    );

    const registry = loadRoutingRegistry(tempRoot);
    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, true, 'Case M: valid exemption must PASS validation');
    assert.equal(registry.entries.some((entry) => entry.id === 'legacy-compat'), false);
    assert.ok(registry.exempted_first_party.some((entry) => entry.id === 'legacy-compat'));

    const { index } = buildSkillIndex(tempRoot);
    assert.equal(index.skills.some((entry) => entry.id === 'legacy-compat'), false);
    assert.ok(index.exempted_first_party.some((entry) => entry.id === 'legacy-compat'));

    const resolved = resolveSkillCandidates(registry.entries, {
      actor: 'executor',
      phase: 'implement',
      capabilities: ['terminal'],
      taskContract: { includeSkills: ['legacy-compat'] },
    });
    assert.equal(resolved.candidate_ids.includes('legacy-compat'), false);

    return {
      name: 'M',
      title: 'exempt Skill stays out of candidates/index skills',
      result: 'PASS',
      detail:
        'legacy-compat appears in exempted_first_party only; absent from routable skills and resolver candidates',
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseN() {
  const phaseA = [caseA, caseB, caseC, caseD, caseE, caseF, caseG, caseH, caseI];
  const results = phaseA.map((run) => run());
  assert.equal(results.length, 9);
  assert.ok(results.every((item) => item.result === 'PASS'));

  return {
    name: 'N',
    title: 'Phase A admission invariants survive metadata backfill',
    result: 'PASS',
    detail: 'Cases A-I re-executed in-process: 9/9 PASS',
  };
}

function caseO() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-b-crossed-exemption-'));
  try {
    writeEmptyThirdParty(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'routing'), { recursive: true });
    for (const id of ['skill-a', 'skill-b']) {
      const dir = path.join(tempRoot, `skills/engineering/${id}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'SKILL.md'),
        `---\nname: ${id}\ndescription: Crossed exemption fixture.\n---\n\n# ${id}\n`,
        'utf8',
      );
    }
    fs.writeFileSync(
      path.join(tempRoot, 'routing/non-routable.yaml'),
      [
        'schema_version: 1',
        'skills:',
        '  - id: skill-a',
        '    path: skills/engineering/skill-b/SKILL.md',
        '    reason: deliberately crossed id/path pair',
        '',
      ].join('\n'),
      'utf8',
    );

    const registry = loadRoutingRegistry(tempRoot);
    assert.equal(registry.exempted_first_party.length, 0);
    assert.equal(registry.unclassified_first_party.length, 2);
    assert.ok(registry.unclassified_first_party.every((item) => ['skill-a', 'skill-b'].includes(item.id)));

    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, false);
    assert.ok(
      validation.errors.some(
        (err) => err.id === 'skill-a' && /id\/path mismatch/.test(err.message),
      ),
      'Case O: crossed exemption must fail validation',
    );

    return {
      name: 'O',
      title: 'crossed exemption id/path fails and exempts neither Skill',
      result: 'PASS',
      detail: 'skill-a/skill-b remain unclassified; validation reports id/path mismatch',
      errors: validation.errors.map((err) => `${err.id}: ${err.message}`),
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseP() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-b-bad-capability-'));
  try {
    writeEmptyThirdParty(tempRoot);
    fs.mkdirSync(path.join(tempRoot, 'routing'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'routing/non-routable.yaml'),
      'schema_version: 1\nskills: []\n',
      'utf8',
    );
    const skillDir = path.join(tempRoot, 'skills/engineering/bad-capability');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: bad-capability\ndescription: Invalid capability fixture.\n---\n\n# Bad Capability\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(skillDir, 'routing.yaml'),
      [
        'schema_version: 1',
        'id: bad-capability',
        'scope: shared-base',
        'actors:',
        '  - executor',
        'phases:',
        '  - implement',
        'capabilities:',
        '  - soruce-read',
        'side_effects: none',
        'requires:',
        '  - capability: not-a-real-capability',
        '  - {}',
        'composes_with: []',
        'conflicts_with: []',
        'selectors: {}',
        'source:',
        '  type: first-party',
        '',
      ].join('\n'),
      'utf8',
    );

    const registry = loadRoutingRegistry(tempRoot);
    const validation = validateRoutingRegistry(registry, { repoRoot: tempRoot });
    assert.equal(validation.ok, false);
    assert.ok(validation.errors.some((err) => /invalid capability "soruce-read"/.test(err.message)));
    assert.ok(
      validation.errors.some((err) => /requires invalid capability "not-a-real-capability"/.test(err.message)),
    );
    assert.ok(
      validation.errors.some((err) => /requires object must include skill or capability/.test(err.message)),
    );

    return {
      name: 'P',
      title: 'capability vocabulary fail-closed validation',
      result: 'PASS',
      detail: 'invalid capabilities and requires.capability values fail validation',
      errors: validation.errors.map((err) => `${err.id}: ${err.message}`),
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function caseQ() {
  const registry = loadRoutingRegistry(repoRoot);
  const byId = new Map(registry.entries.map((entry) => [entry.id, entry]));

  const domain = byId.get('domain-modeling');
  assert.ok(domain);
  assert.ok(domain.capabilities.includes('source-read'));
  assert.ok(domain.capabilities.includes('source-write'));

  const grill = byId.get('grill-with-docs');
  assert.ok(grill);
  assert.ok(grill.capabilities.includes('source-write'));
  assert.ok(grill.capabilities.includes('human-input'));

  const toSpec = byId.get('to-spec');
  assert.ok(toSpec);
  assert.ok(toSpec.capabilities.includes('source-read'));
  assert.ok(toSpec.capabilities.includes('human-input'));
  assert.ok(toSpec.capabilities.includes('source-write'));
  assert.equal(toSpec.capabilities.includes('github-write'), false);

  const diagnosing = byId.get('diagnosing-bugs');
  assert.ok(diagnosing);
  assert.ok(diagnosing.capabilities.includes('source-read'));
  assert.ok(diagnosing.capabilities.includes('terminal'));
  assert.equal(diagnosing.capabilities.includes('tests'), false);

  // Hard AND semantics: diagnosing-bugs must remain selectable without tests.
  const resolved = resolveSkillCandidates([diagnosing], {
    actor: 'executor',
    phase: 'investigate',
    capabilities: ['source-read', 'terminal'],
  });
  assert.equal(resolved.candidate_ids.includes('diagnosing-bugs'), true);

  return {
    name: 'Q',
    title: 'hard-capability semantic spot-check',
    result: 'PASS',
    detail:
      'domain-modeling/grill-with-docs/to-spec/diagnosing-bugs capabilities match hard-requirement semantics',
  };
}

function caseR() {
  const registry = loadRoutingRegistry(repoRoot);
  const byId = new Map(registry.entries.map((entry) => [entry.id, entry]));

  const trackerNeutral = ['to-spec', 'to-tickets', 'triage', 'wayfinder'];
  for (const id of trackerNeutral) {
    const entry = byId.get(id);
    assert.ok(entry, `Case R: missing ${id}`);
    assert.equal(entry.capabilities.includes('github-read'), false, `${id} must not hard-require github-read`);
    assert.equal(entry.capabilities.includes('github-write'), false, `${id} must not hard-require github-write`);
  }

  // Without github-* available, tracker-agnostic Skills must still survive capability filtering.
  const candidates = resolveSkillCandidates(
    trackerNeutral.map((id) => byId.get(id)),
    {
      actor: 'both',
      phase: 'design',
      capabilities: ['source-read', 'source-write', 'human-input'],
    },
  );
  assert.ok(candidates.candidate_ids.includes('to-spec'));

  const setup = byId.get('setup-matt-pocock-skills');
  assert.ok(setup.capabilities.includes('source-read'));
  assert.ok(setup.capabilities.includes('human-input'));
  assert.ok(setup.capabilities.includes('source-write'));
  assert.ok(setup.capabilities.includes('terminal'));
  assert.equal(setup.capabilities.includes('git-write'), false);

  const implementSpec = byId.get('implement-spec');
  assert.ok(implementSpec.capabilities.includes('source-read'));
  assert.ok(implementSpec.capabilities.includes('git-write'));
  assert.ok(implementSpec.capabilities.includes('source-write'));
  assert.ok(implementSpec.capabilities.includes('terminal'));
  assert.equal(implementSpec.capabilities.includes('github-write'), false);

  const wizard = byId.get('wizard');
  assert.ok(wizard.capabilities.includes('source-read'));
  assert.ok(wizard.capabilities.includes('terminal'));
  assert.ok(wizard.capabilities.includes('source-write'));
  assert.ok(wizard.capabilities.includes('human-input'));

  const tdd = byId.get('tdd');
  assert.ok(tdd.capabilities.includes('source-read'));
  assert.ok(tdd.capabilities.includes('source-write'));
  assert.ok(tdd.capabilities.includes('tests'));
  assert.ok(tdd.capabilities.includes('terminal'));
  assert.equal(tdd.capabilities.includes('human-input'), false);

  return {
    name: 'R',
    title: 'tracker-neutral and remaining hard-capability cleanup',
    result: 'PASS',
    detail:
      'tracker-agnostic Skills accept non-GitHub capability sets; setup/implement-spec/wizard/tdd hard caps corrected',
  };
}

function main() {
  const demo = process.argv.includes('--demo');
  const cases = [
    caseA,
    caseB,
    caseC,
    caseD,
    caseE,
    caseF,
    caseG,
    caseH,
    caseI,
    caseJ,
    caseK,
    caseL,
    caseM,
    caseN,
    caseO,
    caseP,
    caseQ,
    caseR,
  ];
  const results = [];

  for (const run of cases) {
    try {
      results.push(run());
    } catch (err) {
      results.push({
        name: run.name?.replace(/^case/i, '') || '?',
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
