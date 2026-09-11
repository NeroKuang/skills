#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skillsRoot = path.join(root, 'skills');
const filter = (process.argv.slice(2).join(' ') || '').toLowerCase().trim();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === 'SKILL.md') out.push(full);
  }
  return out;
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return {};
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const block = content.slice(4, end).split('\n');
  const result = {};
  for (const line of block) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = value;
  }
  return result;
}

if (!fs.existsSync(skillsRoot)) {
  console.error('skills/ directory not found. Run this from the skills repository root.');
  process.exit(1);
}

const rows = walk(skillsRoot)
  .map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const meta = parseFrontmatter(content);
    const rel = path.relative(root, file).replaceAll('\\', '/');
    const bucket = rel.split('/')[1] || 'unknown';
    const skillName = meta.name || path.basename(path.dirname(file));
    const description = meta.description || '';
    const userOnly = /disable-model-invocation:\s*true/.test(content);
    return {
      skill: skillName,
      bucket,
      invocation: userOnly ? 'user-only' : 'model-eligible',
      description,
      path: rel,
      haystack: `${skillName} ${bucket} ${description} ${rel}`.toLowerCase(),
    };
  })
  .filter((row) => !filter || row.haystack.includes(filter))
  .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.skill.localeCompare(b.skill));

if (rows.length === 0) {
  console.log(`No skills matched: ${filter || '(all)'}`);
  process.exit(0);
}

console.log(`Skills: ${rows.length}${filter ? ` | filter: ${filter}` : ''}`);
console.log('');
for (const row of rows) {
  console.log(`[${row.bucket}] ${row.skill} (${row.invocation})`);
  if (row.description) console.log(`  ${row.description}`);
  console.log(`  ${row.path}`);
}
