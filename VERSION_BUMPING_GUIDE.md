# Version Bumping Guide

This document explains how to use the automated version bumping system for the @scwar/nestjs-seeker package.

## Overview

The version bumping system automatically determines the appropriate version bump (patch, minor, or major) based on:
- Git commit messages (using conventional commits)
- File changes and content analysis
- Breaking changes detection

## Quick Start

### Automatic Version Bump
```bash
# Automatically determine and bump version
npm run version:auto
```

### Manual Version Bumps
```bash
# Patch version (1.0.0 → 1.0.1)
npm run version:patch

# Minor version (1.0.0 → 1.1.0)
npm run version:minor

# Major version (1.0.0 → 2.0.0)
npm run version:major
```

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Types
- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `perf:` - Performance improvements (patch version bump)
- `refactor:` - Code refactoring (patch version bump)
- `style:` - Code style changes (patch version bump)
- `test:` - Test additions/updates (no version bump)
- `docs:` - Documentation updates (no version bump)
- `chore:` - Maintenance tasks (no version bump)
- `ci:` - CI/CD changes (no version bump)
- `build:` - Build system changes (no version bump)
- `revert:` - Reverted changes (no version bump)

### Breaking Changes
Use `!` after the type/scope to indicate breaking changes:
```bash
git commit -m "feat!: breaking change in API"
git commit -m "fix(auth)!: remove deprecated method"
```

### Examples
```bash
# Feature commit (minor version bump)
git commit -m "feat: add new search feature"

# Bug fix commit (patch version bump)
git commit -m "fix: resolve indexing issue"

# Breaking change commit (major version bump)
git commit -m "feat!: breaking change in API"

# Documentation commit (no version bump)
git commit -m "docs: update README with examples"

# Test commit (no version bump)
git commit -m "test: add unit tests for search service"
```

## Release Process

### Automated Release (Recommended)
```bash
# Complete release process with automatic version bump
npm run release:auto

# Manual release with specific version bump
npm run release:patch
npm run release:minor
npm run release:major
```

### Manual Release Steps
```bash
# 1. Bump version and update changelog
npm run version:auto

# 2. Build and test
npm run build && npm test

# 3. Commit changes
git add .
git commit -m "chore: bump version to $(node -p \"require('./package.json').version\")"

# 4. Create tag
git tag "v$(node -p \"require('./package.json').version\")"

# 5. Push changes and tag
git push && git push --tags

# 6. Publish to npm
npm publish
```

## Changelog Management

The changelog is automatically updated with each version bump:

```bash
# Update changelog with recent changes
npm run changelog:update
```

## GitHub Actions Integration

The package includes automated workflows:

### CI Workflow (`.github/workflows/ci.yml`)
- Runs on push/PR to main/develop
- Tests across Node.js versions 18, 20
- Linting, formatting, and security checks

### Release Workflow (`.github/workflows/release.yml`)
- Triggers on tag push or manual dispatch
- Automatic version bumping
- Changelog generation
- NPM publishing
- GitHub release creation

## Git Hooks

### Commit Message Hook
- Validates conventional commit format
- Provides helpful error messages and examples
- Automatically installed via `npm install`

## How It Works

### 1. Commit Analysis
The system analyzes git commits since the last tag to determine:
- Breaking changes (`!:` in commit messages)
- New features (`feat:` commits)
- Bug fixes (`fix:` commits)

### 2. File Analysis
Scans changed files for:
- Breaking change indicators (`BREAKING CHANGE`, `@deprecated`)
- Feature additions
- Bug fixes

### 3. Version Determination
- **Major**: Breaking changes detected
- **Minor**: New features added
- **Patch**: Bug fixes or other changes

### 4. Automatic Updates
- Updates `package.json` version
- Updates `CHANGELOG.md` with new entries
- Categorizes changes by type

## Troubleshooting

### Common Issues

#### "No names found, cannot describe anything"
- This occurs when no git tags exist
- The system will default to patch version
- Create an initial tag: `git tag v1.0.0`

#### Version bump not working
- Ensure you're using conventional commit format
- Check that git hooks are properly installed
- Verify you have write permissions to package.json

#### Changelog not updating
- Check that CHANGELOG.md exists and is writable
- Ensure git history is accessible
- Verify the script has proper permissions

### Manual Override
If automatic version bumping fails:
```bash
# Manual version bump
npm version patch --no-git-tag-version

# Manual changelog update
npm run changelog:update
```

## Best Practices

### 1. Always Use Conventional Commits
- Follow the format: `type(scope): description`
- Use appropriate types for changes
- Mark breaking changes with `!`

### 2. Regular Releases
- Release frequently with small changes
- Use semantic versioning appropriately
- Keep changelog up to date

### 3. Test Before Release
- Always run tests before version bump
- Verify build output
- Check changelog accuracy

### 4. Tag Management
- Create tags for each release
- Use semantic versioning for tag names
- Push tags to remote repository

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

