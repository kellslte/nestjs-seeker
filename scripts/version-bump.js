#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Version bumping script that analyzes git changes and determines appropriate version bump
 * Uses conventional commits to determine if changes are patch, minor, or major
 */

class VersionBumper {
    constructor() {
        this.packageJsonPath = path.join(process.cwd(), 'package.json');
        this.changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    }

    /**
     * Get the current version from package.json
     */
    getCurrentVersion() {
        const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
        return packageJson.version;
    }

    /**
     * Get git commit messages since the last tag
     */
    getCommitsSinceLastTag() {
        try {
            const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
            const commits = execSync(`git log ${lastTag}..HEAD --oneline --format="%s"`, { encoding: 'utf8' });
            return commits.split('\n').filter(Boolean);
        } catch (error) {
            // If no tags exist, get all commits
            try {
                const commits = execSync('git log --oneline --format="%s"', { encoding: 'utf8' });
                return commits.split('\n').filter(Boolean);
            } catch (err) {
                console.warn('Warning: Could not get git commits, defaulting to patch version');
                return [];
            }
        }
    }

    /**
     * Get git diff since last commit
     */
    getChangesSinceLastCommit() {
        try {
            const diff = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
            return diff.split('\n').filter(Boolean);
        } catch (error) {
            // If no previous commit, get all tracked files
            try {
                const diff = execSync('git ls-files', { encoding: 'utf8' });
                return diff.split('\n').filter(Boolean);
            } catch (err) {
                console.warn('Warning: Could not get git diff, defaulting to patch version');
                return [];
            }
        }
    }

    /**
     * Analyze commit messages to determine version bump type
     */
    analyzeCommits(commits) {
        let hasBreaking = false;
        let hasFeature = false;
        let hasFix = false;

        const conventionalPatterns = {
            breaking: /^(?:feat|fix|perf|refactor|style|test|chore|docs|ci|build|revert)(?:\(.+\))?!: .+/,
            feature: /^(?:feat)(?:\(.+\))?: .+/,
            fix: /^(?:fix|perf)(?:\(.+\))?: .+/,
            conventional: /^(?:feat|fix|perf|refactor|style|test|chore|docs|ci|build|revert)(?:\(.+\))?: .+/
        };

        for (const commit of commits) {
            if (conventionalPatterns.breaking.test(commit)) {
                hasBreaking = true;
            } else if (conventionalPatterns.feature.test(commit)) {
                hasFeature = true;
            } else if (conventionalPatterns.fix.test(commit)) {
                hasFix = true;
            }
        }

        if (hasBreaking) {
            return 'major';
        } else if (hasFeature) {
            return 'minor';
        } else if (hasFix) {
            return 'patch';
        }

        return 'patch'; // Default to patch
    }

    /**
     * Analyze file changes to determine version bump type
     */
    analyzeFileChanges(files) {
        let hasBreaking = false;
        let hasFeature = false;
        let hasFix = false;

        for (const file of files) {
            // Breaking changes
            if (file.includes('BREAKING_CHANGES') ||
                file.includes('migration') ||
                file.includes('upgrade')) {
                hasBreaking = true;
            }

            // Features
            if (file.includes('src/') && !file.includes('test/') &&
                (file.includes('new') || file.includes('add') || file.includes('feature'))) {
                hasFeature = true;
            }

            // Fixes
            if (file.includes('fix') || file.includes('bug') || file.includes('patch')) {
                hasFix = true;
            }
        }

        if (hasBreaking) {
            return 'major';
        } else if (hasFeature) {
            return 'minor';
        } else if (hasFix) {
            return 'patch';
        }

        return 'patch'; // Default to patch
    }

    /**
     * Check if there are any breaking changes in the code
     */
    checkForBreakingChanges() {
        try {
            // Check for breaking changes in source files
            const sourceFiles = execSync('find src -name "*.ts" -type f', { encoding: 'utf8' }).split('\n').filter(Boolean);

            for (const file of sourceFiles) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    if (content.includes('BREAKING CHANGE') ||
                        content.includes('@deprecated') ||
                        content.includes('TODO: Remove in next major')) {
                        return true;
                    }
                } catch (err) {
                    // Skip files that can't be read
                }
            }
        } catch (error) {
            // If find command fails, try alternative approach
            try {
                const srcDir = path.join(process.cwd(), 'src');
                if (fs.existsSync(srcDir)) {
                    const files = fs.readdirSync(srcDir, { recursive: true });
                    for (const file of files) {
                        if (file.endsWith('.ts')) {
                            try {
                                const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
                                if (content.includes('BREAKING CHANGE') ||
                                    content.includes('@deprecated') ||
                                    content.includes('TODO: Remove in next major')) {
                                    return true;
                                }
                            } catch (err) {
                                // Skip files that can't be read
                            }
                        }
                    }
                }
            } catch (err) {
                // If all else fails, assume no breaking changes
            }
        }

        return false;
    }

    /**
     * Determine the appropriate version bump type
     */
    determineBumpType() {
        const commits = this.getCommitsSinceLastTag();
        const files = this.getChangesSinceLastCommit();
        const hasBreakingChanges = this.checkForBreakingChanges();

        if (hasBreakingChanges) {
            return 'major';
        }

        const commitBump = this.analyzeCommits(commits);
        const fileBump = this.analyzeFileChanges(files);

        // Take the higher bump type
        const bumpTypes = ['patch', 'minor', 'major'];
        const commitIndex = bumpTypes.indexOf(commitBump);
        const fileIndex = bumpTypes.indexOf(fileBump);

        return bumpTypes[Math.max(commitIndex, fileIndex)];
    }

    /**
     * Bump the version
     */
    bumpVersion(bumpType) {
        try {
            console.log(`Bumping version (${bumpType})...`);

            // Use npm version to bump the version
            const result = execSync(`npm version ${bumpType} --no-git-tag-version`, { encoding: 'utf8' });
            const newVersion = result.trim().replace('v', '');

            console.log(`Version bumped to ${newVersion}`);
            return newVersion;
        } catch (error) {
            console.error('Error bumping version:', error.message);
            process.exit(1);
        }
    }

    /**
     * Update the changelog
     */
    updateChangelog(newVersion) {
        try {
            console.log('Updating changelog...');

            // Read current changelog
            let changelog = fs.readFileSync(this.changelogPath, 'utf8');

            // Get current date
            const today = new Date().toISOString().split('T')[0];

            // Get commits since last tag for changelog
            let commits = [];
            try {
                const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
                commits = execSync(`git log ${lastTag}..HEAD --oneline --format="%s"`, { encoding: 'utf8' })
                    .split('\n')
                    .filter(Boolean);
            } catch (error) {
                // If no tags, get recent commits
                commits = execSync('git log -10 --oneline --format="%s"', { encoding: 'utf8' })
                    .split('\n')
                    .filter(Boolean);
            }

            // Categorize commits
            const categories = {
                'Breaking Changes': [],
                'Features': [],
                'Bug Fixes': [],
                'Documentation': [],
                'Tests': [],
                'Chores': []
            };

            for (const commit of commits) {
                if (commit.includes('!:')) {
                    categories['Breaking Changes'].push(commit.replace(/^.*?: /, ''));
                } else if (commit.startsWith('feat:')) {
                    categories['Features'].push(commit.replace(/^feat: /, ''));
                } else if (commit.startsWith('fix:')) {
                    categories['Bug Fixes'].push(commit.replace(/^fix: /, ''));
                } else if (commit.startsWith('docs:')) {
                    categories['Documentation'].push(commit.replace(/^docs: /, ''));
                } else if (commit.startsWith('test:')) {
                    categories['Tests'].push(commit.replace(/^test: /, ''));
                } else if (commit.startsWith('chore:') || commit.startsWith('ci:') || commit.startsWith('build:')) {
                    categories['Chores'].push(commit.replace(/^(chore|ci|build): /, ''));
                }
            }

            // Create new changelog entry
            let newEntry = `\n## [${newVersion}] - ${today}\n\n`;

            for (const [category, items] of Object.entries(categories)) {
                if (items.length > 0) {
                    newEntry += `### ${category}\n`;
                    for (const item of items) {
                        newEntry += `- ${item}\n`;
                    }
                    newEntry += '\n';
                }
            }

            // Insert new entry after the header
            const headerEnd = changelog.indexOf('\n## ');
            if (headerEnd !== -1) {
                changelog = changelog.slice(0, headerEnd) + newEntry + changelog.slice(headerEnd);
            } else {
                // If no existing entries, add after the header
                const headerEnd = changelog.indexOf('\n\n');
                changelog = changelog.slice(0, headerEnd + 2) + newEntry + changelog.slice(headerEnd + 2);
            }

            // Write updated changelog
            fs.writeFileSync(this.changelogPath, changelog);
            console.log('Changelog updated successfully');

        } catch (error) {
            console.error('Error updating changelog:', error.message);
            // Don't exit, changelog update is not critical
        }
    }

    /**
     * Main method to run the version bump
     */
    run() {
        try {
            console.log('🔍 Analyzing changes to determine version bump...');

            const bumpType = this.determineBumpType();
            console.log(`📊 Determined bump type: ${bumpType}`);

            const newVersion = this.bumpVersion(bumpType);
            this.updateChangelog(newVersion);

            console.log(`✅ Version bumped successfully to ${newVersion}`);
            console.log(`📝 Changelog updated`);
            console.log(`\nNext steps:`);
            console.log(`1. Review the changes: git diff`);
            console.log(`2. Commit the version bump: git add . && git commit -m "chore: bump version to ${newVersion}"`);
            console.log(`3. Create a tag: git tag "v${newVersion}"`);
            console.log(`4. Push changes: git push && git push --tags`);

        } catch (error) {
            console.error('❌ Error during version bump:', error.message);
            process.exit(1);
        }
    }
}

// Run the version bumper if this script is executed directly
if (require.main === module) {
    const bumper = new VersionBumper();
    bumper.run();
}

module.exports = VersionBumper;

