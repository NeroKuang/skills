#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import {
  DEFAULT_INDEX_RELATIVE_PATH,
  buildSkillIndex,
  writeSkillIndex,
} from './lib/routing/index.mjs';

function printHelp() {
  console.log(`Usage: node scripts/build-skill-index.mjs [options]

Build a deterministic Skill routing index from first-party routing.yaml
files and third-party lock/overlays.

Options:
  --root <path>     Repository root (default: cwd)
  --out <path>      Output path relative to root or absolute
                    (default: ${DEFAULT_INDEX_RELATIVE_PATH})
  --stdout          Print JSON to stdout instead of writing a file
  --help            Show help

Notes:
  - SKILL.md remains behavioral source of truth.
  - routing.yaml is routing metadata only.
  - ~/.cursor/skills and ~/.agents/skills are never canonical sources.
`);
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    out: DEFAULT_INDEX_RELATIVE_PATH,
    stdout: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--stdout') {
      options.stdout = true;
    } else if (arg === '--root') {
      options.root = path.resolve(argv[++i]);
    } else if (arg === '--out') {
      options.out = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (options.help) {
    printHelp();
    return;
  }

  try {
    if (options.stdout) {
      const { index } = buildSkillIndex(options.root);
      process.stdout.write(`${JSON.stringify(index, null, 2)}\n`);
      return;
    }

    const result = writeSkillIndex(options.root, {
      outputRelativePath: options.out,
    });
    console.log(`Wrote ${result.relativePath}`);
    console.log(
      `Routable skills: ${result.index.counts.routable}; without metadata: ${result.index.counts.without_metadata}`,
    );
  } catch (err) {
    console.error(`build-skill-index failed: ${err.message}`);
    process.exit(1);
  }
}

main();
