#!/usr/bin/env node

const fs = require('fs');

/**
 * Git commit-msg hook to validate conventional commit format
 */

const commitMsgFile = process.argv[2];
const commitMsg = fs.readFileSync(commitMsgFile, 'utf8').trim();

// Conventional commit pattern
const conventionalPattern = /^(feat|fix|perf|refactor|style|test|chore|docs|ci|build|revert)(\(.+\))?(!)?: .+/;

// Skip validation for merge commits, revert commits, and version bumps
const skipPatterns = [
    /^Merge branch/,
    /^Merge pull request/,
    /^Revert /,
    /^chore: bump version/,
    /^chore\(release\):/,
];

// Check if commit message should be skipped
const shouldSkip = skipPatterns.some(pattern => pattern.test(commitMsg));

if (shouldSkip) {
    process.exit(0);
}

// Validate conventional commit format
if (!conventionalPattern.test(commitMsg)) {
    console.error('\n❌ Invalid commit message format!\n');
    console.error('Commit messages must follow the Conventional Commits specification:');
    console.error('  <type>(<scope>): <description>\n');
    console.error('Types: feat, fix, perf, refactor, style, test, chore, docs, ci, build, revert');
    console.error('Use ! after type/scope for breaking changes: feat!: breaking change\n');
    console.error('Examples:');
    console.error('  feat: add new search feature');
    console.error('  fix: resolve indexing issue');
    console.error('  feat!: breaking change in API');
    console.error('  docs: update README\n');
    console.error(`Your message: "${commitMsg}"\n`);
    process.exit(1);
}

process.exit(0);

