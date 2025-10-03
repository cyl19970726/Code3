import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { handleInit } from '../src/tools/init.js';

/**
 * Integration Tests for spec-kit-mcp
 *
 * Tests the complete workflow:
 * 1. init Tool creates .specify/ structure
 * 2. Scripts are executable and work correctly
 * 3. All parameter combinations work
 */

const testDir = join(process.cwd(), 'test-workspace');
const specifyDir = join(testDir, '.specify');

describe('Integration Tests', () => {
  beforeAll(() => {
    // Clean up test directory if exists
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test workspace
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('init Tool', () => {
    it('should create complete .specify/ directory structure', async () => {
      const result = await handleInit({ targetDir: testDir });

      expect(result.success).toBe(true);
      expect(result.created.length).toBeGreaterThan(0);

      // Verify directory structure
      expect(existsSync(join(specifyDir, 'scripts'))).toBe(true);
      expect(existsSync(join(specifyDir, 'templates'))).toBe(true);
      expect(existsSync(join(specifyDir, 'memory'))).toBe(true);
    });

    it('should copy all required scripts', async () => {
      expect(existsSync(join(specifyDir, 'scripts', 'bash', 'create-new-feature.sh'))).toBe(true);
      expect(existsSync(join(specifyDir, 'scripts', 'bash', 'setup-plan.sh'))).toBe(true);
      expect(existsSync(join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh'))).toBe(true);
      expect(existsSync(join(specifyDir, 'scripts', 'bash', 'common.sh'))).toBe(true);
    });

    it('should copy all required templates', async () => {
      expect(existsSync(join(specifyDir, 'templates', 'spec-template.md'))).toBe(true);
      expect(existsSync(join(specifyDir, 'templates', 'plan-template.md'))).toBe(true);
      expect(existsSync(join(specifyDir, 'templates', 'tasks-template.md'))).toBe(true);
    });

    it('should create constitution.md', async () => {
      expect(existsSync(join(specifyDir, 'memory', 'constitution.md'))).toBe(true);
    });

    it('should make scripts executable', async () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');

      // On Unix systems, check if file is executable
      if (process.platform !== 'win32') {
        const stats = require('fs').statSync(scriptPath);
        const isExecutable = !!(stats.mode & 0o100);
        expect(isExecutable).toBe(true);
      }
    });

    it('should not overwrite without force flag', async () => {
      const result = await handleInit({ targetDir: testDir, force: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should overwrite with force flag', async () => {
      const result = await handleInit({ targetDir: testDir, force: true });

      expect(result.success).toBe(true);
    });
  });

  describe('check-prerequisites.sh script', () => {
    beforeAll(() => {
      // Initialize git repo in test workspace
      try {
        execSync('git init', { cwd: testDir, stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'ignore' });
        execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' });

        // Create specs directory structure
        const specsDir = join(testDir, 'specs', '001-test-feature');
        mkdirSync(specsDir, { recursive: true });
        writeFileSync(join(specsDir, 'spec.md'), '# Test Spec');
        writeFileSync(join(specsDir, 'plan.md'), '# Test Plan');

        // Make initial commit (required for git to have HEAD)
        execSync('git add .', { cwd: testDir, stdio: 'ignore' });
        execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'ignore' });

        // Create and checkout feature branch
        execSync('git checkout -b 001-test-feature', { cwd: testDir, stdio: 'ignore' });
      } catch (error) {
        console.error('Git setup failed:', error);
        throw error;
      }
    });

    it('should show help message', () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');
      const output = execSync(`bash "${scriptPath}" --help`, { encoding: 'utf-8' });

      expect(output).toContain('Usage:');
      expect(output).toContain('--json');
      expect(output).toContain('--paths-only');
      expect(output).toContain('--require-tasks');
      expect(output).toContain('--include-tasks');
    });

    it('should output JSON with --json flag', () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');
      const output = execSync(`bash "${scriptPath}" --json`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      const json = JSON.parse(output.trim());
      expect(json).toHaveProperty('FEATURE_DIR');
      expect(json).toHaveProperty('AVAILABLE_DOCS');
      expect(json.AVAILABLE_DOCS).toBeInstanceOf(Array);
    });

    it('should output paths only with --json --paths-only', () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');
      const output = execSync(`bash "${scriptPath}" --json --paths-only`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      const json = JSON.parse(output.trim());
      expect(json).toHaveProperty('FEATURE_DIR');
      expect(json).toHaveProperty('FEATURE_SPEC');
      expect(json).toHaveProperty('IMPL_PLAN');
      expect(json).toHaveProperty('TASKS');
      expect(json).not.toHaveProperty('AVAILABLE_DOCS');
    });

    it('should require tasks.md with --require-tasks', () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');

      try {
        execSync(`bash "${scriptPath}" --json --require-tasks`, {
          cwd: testDir,
          encoding: 'utf-8'
        });
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('tasks.md not found');
      }
    });

    it('should include TASKS with --include-tasks', () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');

      // Create tasks.md
      const specsDir = join(testDir, 'specs', '001-test-feature');
      writeFileSync(join(specsDir, 'tasks.md'), '# Test Tasks');

      const output = execSync(`bash "${scriptPath}" --json --include-tasks`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      const json = JSON.parse(output.trim());
      expect(json).toHaveProperty('TASKS');
      expect(json.TASKS).toContain('tasks.md');
    });

    it('should work with combined flags --json --require-tasks --include-tasks', () => {
      const scriptPath = join(specifyDir, 'scripts', 'bash', 'check-prerequisites.sh');

      const output = execSync(`bash "${scriptPath}" --json --require-tasks --include-tasks`, {
        cwd: testDir,
        encoding: 'utf-8'
      });

      const json = JSON.parse(output.trim());
      expect(json).toHaveProperty('FEATURE_DIR');
      expect(json).toHaveProperty('AVAILABLE_DOCS');
      expect(json).toHaveProperty('TASKS');
    });
  });

  describe('Script Path Finding', () => {
    it('should find spec-kit-mcp installation from dist/', async () => {
      // This test verifies Strategy 1: relative path from dist/
      const result = await handleInit({ targetDir: join(testDir, 'test2') });
      expect(result.success).toBe(true);
    });
  });
});
