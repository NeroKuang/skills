#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const projectRoot = path.resolve(readArg('--project', process.cwd()));
const outDir = path.resolve(readArg('--out', path.join(process.cwd(), 'intake', 'cursor', 'snapshot')));
const homeDir = os.homedir();

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'vendor',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
]);

const findings = [];
const warnings = [];

function normalizeSlashes(value) {
  return value.replaceAll('\\', '/');
}

function displayPath(filePath) {
  const absolute = path.resolve(filePath);
  const home = path.resolve(homeDir);
  if (absolute === home) return '~';
  if (absolute.startsWith(`${home}${path.sep}`)) {
    return `~/${normalizeSlashes(path.relative(home, absolute))}`;
  }
  return normalizeSlashes(absolute);
}

function safeSegment(value) {
  return value
    .replace(/^~\//, 'home/')
    .replace(/^[A-Za-z]:\//, '')
    .replace(/[^A-Za-z0-9._/-]+/g, '_')
    .replace(/\.\./g, '_');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function redact(text) {
  let result = text;
  const patterns = [
    /(Bearer\s+)[A-Za-z0-9._~+\/-]{8,}/gi,
    /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|secret|client[_-]?secret|private[_-]?key|authorization)\s*[:=]\s*["']?)[^\s"']{6,}/gi,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
    /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]{12,}\b/g,
  ];

  for (const pattern of patterns) {
    result = result.replace(pattern, (_match, prefix) => prefix ? `${prefix}[REDACTED]` : '[REDACTED]');
  }

  return result;
}

function classify(filePath, scope) {
  const normalized = normalizeSlashes(filePath);
  const lower = normalized.toLowerCase();

  if (lower.endsWith('/skill.md')) {
    return { kind: 'skill', sourceType: detectSkillSource(lower), scope };
  }

  if (lower.endsWith('/agents.md')) {
    return { kind: 'agents', sourceType: 'agents-md', scope };
  }

  if (lower.includes('/.cursor/rules/imported/') && lower.endsWith('.mdc')) {
    return { kind: 'rule', sourceType: 'remote-imported-rule', scope };
  }

  if (lower.includes('/.cursor/rules/') && lower.endsWith('.mdc')) {
    return { kind: 'rule', sourceType: scope === 'user' ? 'user-file-rule' : 'project-rule', scope };
  }

  return null;
}

function detectSkillSource(lowerPath) {
  if (lowerPath.includes('/.cursor/skills/')) return 'cursor-skill';
  if (lowerPath.includes('/.agents/skills/')) return 'agents-skill';
  if (lowerPath.includes('/.claude/skills/')) return 'claude-compatible-skill';
  if (lowerPath.includes('/.codex/skills/')) return 'codex-compatible-skill';
  return 'skill';
}

function shouldCollectProjectFile(filePath) {
  const normalized = normalizeSlashes(filePath).toLowerCase();

  if (normalized.endsWith('/agents.md')) return true;
  if (normalized.includes('/.cursor/rules/') && normalized.endsWith('.mdc')) return true;

  return [
    '/.cursor/skills/',
    '/.agents/skills/',
    '/.claude/skills/',
    '/.codex/skills/',
  ].some((marker) => normalized.includes(marker) && normalized.endsWith('/skill.md'));
}

function walk(root, onFile) {
  if (!fs.existsSync(root)) return;

  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (error) {
    warnings.push(`Cannot read ${displayPath(root)}: ${error.message}`);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      if (normalizeSlashes(fullPath).includes('/.cursor/.nero-framework/')) continue;
      walk(fullPath, onFile);
      continue;
    }

    if (entry.isFile()) onFile(fullPath);
  }
}

function collectFile(filePath, scope) {
  const meta = classify(filePath, scope);
  if (!meta) return;

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warnings.push(`Cannot read ${displayPath(filePath)}: ${error.message}`);
    return;
  }

  const redacted = redact(raw);
  const redactionChanged = redacted !== raw;
  const normalizedContent = redacted.replace(/\r\n/g, '\n').trim();
  const sourcePath = displayPath(filePath);

  const artifactRel = normalizeSlashes(path.join(
    'artifacts',
    meta.kind === 'agents' ? 'agents' : `${meta.kind}s`,
    scope,
    safeSegment(sourcePath),
  ));

  findings.push({
    kind: meta.kind,
    sourceType: meta.sourceType,
    scope: meta.scope,
    sourcePath,
    artifactPath: artifactRel,
    sha256: sha256(normalizedContent),
    bytes: Buffer.byteLength(raw),
    redactionChanged,
    content: redacted,
  });
}

walk(projectRoot, (filePath) => {
  if (shouldCollectProjectFile(filePath)) collectFile(filePath, 'project');
});

const userRoots = [
  path.join(homeDir, '.cursor', 'skills'),
  path.join(homeDir, '.agents', 'skills'),
  path.join(homeDir, '.claude', 'skills'),
  path.join(homeDir, '.codex', 'skills'),
  path.join(homeDir, '.cursor', 'rules'),
];

for (const root of userRoots) {
  walk(root, (filePath) => {
    const normalized = normalizeSlashes(filePath).toLowerCase();
    if (normalized.endsWith('/skill.md') || normalized.endsWith('.mdc')) {
      collectFile(filePath, 'user');
    }
  });
}

fs.mkdirSync(outDir, { recursive: true });

for (const finding of findings) {
  const artifactAbsolute = path.join(outDir, finding.artifactPath);
  fs.mkdirSync(path.dirname(artifactAbsolute), { recursive: true });
  fs.writeFileSync(artifactAbsolute, finding.content, 'utf8');
  delete finding.content;
}

const duplicateMap = new Map();
for (const finding of findings) {
  const group = duplicateMap.get(finding.sha256) ?? [];
  group.push(finding.sourcePath);
  duplicateMap.set(finding.sha256, group);
}

const duplicateGroups = [...duplicateMap.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([hash, paths]) => ({ hash, paths }));

const counts = findings.reduce((acc, finding) => {
  acc.total += 1;
  acc[finding.kind] = (acc[finding.kind] ?? 0) + 1;
  if (finding.sourceType === 'remote-imported-rule') acc.imported += 1;
  if (finding.redactionChanged) acc.redacted += 1;
  return acc;
}, { total: 0, skill: 0, rule: 0, agents: 0, imported: 0, redacted: 0 });

const inventory = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  projectRoot: displayPath(projectRoot),
  platform: process.platform,
  nodeVersion: process.version,
  counts,
  manualCaptureRequired: [
    'Cursor account User Rules from Customize, when not represented by local files',
    'Cursor Team Rules managed on Cursor servers, when applicable',
  ],
  warnings,
  duplicateGroups,
  items: findings,
};

fs.writeFileSync(
  path.join(outDir, 'inventory.json'),
  `${JSON.stringify(inventory, null, 2)}\n`,
  'utf8',
);

const summaryLines = [
  '# Cursor Inventory Snapshot',
  '',
  `Generated: ${inventory.generatedAt}`,
  `Project: ${inventory.projectRoot}`,
  `Platform: ${inventory.platform}`,
  '',
  '## Counts',
  '',
  `- Total: ${counts.total}`,
  `- Skills: ${counts.skill}`,
  `- Rules: ${counts.rule}`,
  `- AGENTS files: ${counts.agents}`,
  `- Imported rules: ${counts.imported}`,
  `- Files changed by automatic redaction: ${counts.redacted}`,
  `- Exact duplicate groups: ${duplicateGroups.length}`,
  '',
  '## Manual capture required',
  '',
  ...inventory.manualCaptureRequired.map((item) => `- ${item}`),
  '',
  '## Items',
  '',
  '| Kind | Scope | Source | Path | SHA256 | Redacted |',
  '| --- | --- | --- | --- | --- | --- |',
  ...findings.map((item) => `| ${item.kind} | ${item.scope} | ${item.sourceType} | \`${item.sourcePath}\` | \`${item.sha256.slice(0, 12)}\` | ${item.redactionChanged ? 'yes' : 'no'} |`),
  '',
  '## Exact duplicate groups',
  '',
];

if (duplicateGroups.length === 0) {
  summaryLines.push('None detected.', '');
} else {
  for (const group of duplicateGroups) {
    summaryLines.push(`### ${group.hash.slice(0, 12)}`, '');
    for (const sourcePath of group.paths) summaryLines.push(`- \`${sourcePath}\``);
    summaryLines.push('');
  }
}

if (warnings.length > 0) {
  summaryLines.push('## Warnings', '');
  for (const warning of warnings) summaryLines.push(`- ${warning}`);
  summaryLines.push('');
}

fs.writeFileSync(path.join(outDir, 'inventory.md'), `${summaryLines.join('\n')}\n`, 'utf8');

const manualDir = path.join(outDir, 'manual');
fs.mkdirSync(manualDir, { recursive: true });
fs.writeFileSync(
  path.join(manualDir, 'README.md'),
  [
    '# Manual Cursor Rule Capture',
    '',
    'Some Cursor settings are not guaranteed to exist as readable local files.',
    '',
    'If account User Rules or Team Rules need to be included, review them manually for secrets and save them here before pushing the intake PR.',
    '',
    'Suggested filenames:',
    '',
    '- `account-user-rules.md`',
    '- `team-rules.md`',
    '',
    'Do not invent unavailable rule content.',
    '',
  ].join('\n'),
  'utf8',
);

console.log('Cursor inventory complete.');
console.log(`Output: ${displayPath(outDir)}`);
console.log(`Items: ${counts.total}`);
console.log(`Skills: ${counts.skill}`);
console.log(`Rules: ${counts.rule}`);
console.log(`AGENTS: ${counts.agents}`);
console.log(`Imported rules: ${counts.imported}`);
console.log(`Exact duplicate groups: ${duplicateGroups.length}`);
console.log(`Redaction warnings: ${counts.redacted}`);
if (warnings.length > 0) console.log(`Read warnings: ${warnings.length}`);
