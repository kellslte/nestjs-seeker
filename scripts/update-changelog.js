#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script to update the changelog with recent changes
 * This can be run independently or as part of the version bump process
 */

class ChangelogUpdater {
    constructor() {
        this.changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    }

    /**
     * Get commits since last tag
     */
    getCommitsSinceLastTag() {
        try {
            const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
            const commits = execSync(`git log ${lastTag}..HEAD --oneline --format="%s"`, { encoding: 'utf8' });
            return commits.split('\n').filter(Boolean);
        } catch (error) {
            // If no tags exist, get recent commits
            try {
                const commits = execSync('git log -10 --oneline --format="%s"', { encoding: 'utf8' });
                return commits.split('\n').filter(Boolean);
            } catch (err) {
                console.warn('Warning: Could not get git commits');
                return [];
            }
        }
    }

    /**
     * Categorize commits by type
     */
    categorizeCommits(commits) {
        const categories = {
            'Breaking Changes': [],
            'Features': [],
            'Bug Fixes': [],
            'Documentation': [],
            'Tests': [],
            'Chores': [],
            'Performance': [],
            'Refactor': []
        };

        for (const commit of commits) {
            if (commit.includes('!:')) {
                categories['Breaking Changes'].push(commit.replace(/^.*?: /, ''));
            } else if (commit.startsWith('feat:')) {
                categories['Features'].push(commit.replace(/^feat: /, ''));
            } else if (commit.startsWith('fix:')) {
                categories['Bug Fixes'].push(commit.replace(/^fix: /, ''));
            } else if (commit.startsWith('perf:')) {
                categories['Performance'].push(commit.replace(/^perf: /, ''));
            } else if (commit.startsWith('refactor:')) {
                categories['Refactor'].push(commit.replace(/^refactor: /, ''));
            } else if (commit.startsWith('docs:')) {
                categories['Documentation'].push(commit.replace(/^docs: /, ''));
            } else if (commit.startsWith('test:')) {
                categories['Tests'].push(commit.replace(/^test: /, ''));
            } else if (commit.startsWith('chore:') || commit.startsWith('ci:') || commit.startsWith('build:')) {
                categories['Chores'].push(commit.replace(/^(chore|ci|build): /, ''));
            }
        }

        return categories;
    }

    /**
     * Update the changelog file
     */
    updateChangelog() {
        try {
            console.log('📝 Updating changelog...');

            // Read current changelog
            let changelog = fs.readFileSync(this.changelogPath, 'utf8');

            // Get commits since last tag
            const commits = this.getCommitsSinceLastTag();

            if (commits.length === 0) {
                console.log('No new commits found since last tag');
                return;
            }

            // Get current version from package.json
            const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
            const currentVersion = packageJson.version;

            // Get current date
            const today = new Date().toISOString().split('T')[0];

            // Categorize commits
            const categories = this.categorizeCommits(commits);

            // Create new changelog entry
            let newEntry = `\n## [${currentVersion}] - ${today}\n\n`;

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
            console.log('✅ Changelog updated successfully');

        } catch (error) {
            console.error('❌ Error updating changelog:', error.message);
            process.exit(1);
        }
    }
}

// Run the changelog updater if this script is executed directly
if (require.main === module) {
    const updater = new ChangelogUpdater();
    updater.updateChangelog();
}

module.exports = ChangelogUpdater;

