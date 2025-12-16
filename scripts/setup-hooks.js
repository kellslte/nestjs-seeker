#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Setup git hooks for conventional commits
 */

const hooksDir = path.join(process.cwd(), '.git', 'hooks');
const commitMsgHook = path.join(hooksDir, 'commit-msg');
const commitMsgScript = path.join(process.cwd(), 'scripts', 'commit-msg-hook.js');

try {
    // Create hooks directory if it doesn't exist
    if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Create commit-msg hook
    const hookContent = `#!/bin/sh
node "${commitMsgScript}" "$1"
`;

    fs.writeFileSync(commitMsgHook, hookContent);
    
    // Make hook executable
    try {
        execSync(`chmod +x "${commitMsgHook}"`, { stdio: 'ignore' });
    } catch (error) {
        // On Windows, chmod might not work, but that's okay
    }

    // Make commit-msg-hook.js executable
    try {
        execSync(`chmod +x "${commitMsgScript}"`, { stdio: 'ignore' });
    } catch (error) {
        // On Windows, chmod might not work, but that's okay
    }

    console.log('✅ Git hooks installed successfully');
} catch (error) {
    console.warn('⚠️  Could not install git hooks:', error.message);
    console.warn('You can manually install hooks by running:');
    console.warn(`  cp scripts/commit-msg-hook.js .git/hooks/commit-msg`);
    console.warn(`  chmod +x .git/hooks/commit-msg`);
}

