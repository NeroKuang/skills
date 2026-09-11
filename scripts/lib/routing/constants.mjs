export const SCHEMA_VERSION = 1;

export const SCOPES = Object.freeze([
  'shared-base',
  'private-user',
  'project-local',
  'third-party',
]);

export const ACTORS = Object.freeze(['controller', 'executor', 'both']);

export const PHASES = Object.freeze([
  'discover',
  'research',
  'investigate',
  'design',
  'plan',
  'implement',
  'verify',
  'review',
  'operate',
  'recover',
  'teach',
]);

export const SIDE_EFFECTS = Object.freeze([
  'none',
  'local-write',
  'repo-write',
  'external-write',
  'production-write',
]);

export const CAPABILITIES = Object.freeze([
  'source-read',
  'source-write',
  'git-read',
  'git-write',
  'github-read',
  'github-write',
  'terminal',
  'tests',
  'build',
  'http',
  'database-read',
  'database-write',
  'browser',
  'external-research',
  'deployment',
  'human-input',
]);

export const PROJECT_SELECTORS = Object.freeze([
  'repository',
  'path',
  'marker_file',
  'explicit_project_id',
]);

export const SCOPE_PRECEDENCE = Object.freeze({
  'task-contract': 100,
  'project-local': 80,
  'private-user': 60,
  'shared-base': 40,
  'third-party': 20,
});

export const FILTER_PIPELINE = Object.freeze([
  'scope',
  'actor',
  'capability',
  'phase',
]);

/** Paths that must never be treated as canonical Skill sources. */
export const NON_CANONICAL_ROOTS = Object.freeze([
  '~/.cursor/skills',
  '~/.agents/skills',
]);

export const DEFAULT_INDEX_RELATIVE_PATH = 'routing/generated/skill-index.json';
