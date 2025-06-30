#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto version bump script for KMDE
 * Supports: patch, minor, major
 * Usage: node scripts/version-bump.js [patch|minor|major]
 */

function readPackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(packageContent);
}

function writePackageJson(packageData) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
}

function parseVersion(version) {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10)
  };
}

function bumpVersion(currentVersion, type) {
  const version = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      version.major += 1;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor += 1;
      version.patch = 0;
      break;
    case 'patch':
    default:
      version.patch += 1;
      break;
  }
  
  return `${version.major}.${version.minor}.${version.patch}`;
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('❌ Invalid bump type. Use: patch, minor, or major');
    process.exit(1);
  }
  
  try {
    const packageData = readPackageJson();
    const currentVersion = packageData.version;
    const newVersion = bumpVersion(currentVersion, bumpType);
    
    packageData.version = newVersion;
    writePackageJson(packageData);
    
    console.log(`✅ Version bumped from ${currentVersion} to ${newVersion} (${bumpType})`);
    console.log(`📦 Package: ${packageData.name}`);
    
    // Update git tag if in git repository
    try {
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'pipe' });
      console.log(`🏷️  Git tag v${newVersion} created`);
    } catch (error) {
      console.log('ℹ️  Git tag creation skipped (not in git repository or git not available)');
    }
    
  } catch (error) {
    console.error('❌ Error bumping version:', error.message);
    process.exit(1);
  }
}

// Always run main function when script is executed
main();

export { bumpVersion, parseVersion };