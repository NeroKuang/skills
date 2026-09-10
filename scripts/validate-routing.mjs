#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import {
  loadRoutingRegistry,
  validateRoutingRegistry,
} from './lib/routing/index.mjs';

function printHelp() {
  console.log(`Usage: node scripts/validate-routing.mjs [options]

Validate first-party routing.yaml metadata and third-party lock/overlays.

Options:
  --root <path>     Repository root (default: cwd)
  --json            Print machine-readable result
  --help            Show help

Exit codes:
  0  validation passed
  1  validation failed
  2  usage error
`);
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--root') options.root = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
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
    const registry = loadRoutingRegistry(options.root);
    const result = validateRoutingRegistry(registry, { repoRoot: options.root });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      console.log(
        `Validated ${result.counts.entries} routing entries ` +
          `(${result.counts.without_metadata} skills without metadata, ` +
          `${result.counts.lock_entries} lock entries)`,
      );
      for (const warning of result.warnings) {
        console.log(`WARN ${warning.id || '-'}: ${warning.message}`);
      }
      for (const error of result.errors) {
        console.error(`ERROR ${error.id || '-'}: ${error.message}`);
      }
      console.log(result.ok ? 'PASS' : 'FAIL');
    }

    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error(`validate-routing failed: ${err.message}`);
    process.exit(1);
  }
}

main();
