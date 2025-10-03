/**
 * init Tool - Initialize .specify/ directory structure
 *
 * Creates the complete .specify/ directory structure with:
 * - Bash scripts (create-new-feature.sh, setup-plan.sh, check-prerequisites.sh)
 * - Templates (spec-template.md, plan-template.md, tasks-template.md)
 * - Memory (constitution.md)
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { mkdirSync, copyFileSync, chmodSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const initTool: Tool = {
  name: 'init',
  description: 'Initialize .specify/ directory structure with scripts, templates, and configuration for spec-kit workflow',
  inputSchema: {
    type: 'object',
    properties: {
      targetDir: {
        type: 'string',
        description: 'Target directory to initialize (defaults to current working directory)'
      },
      force: {
        type: 'boolean',
        description: 'Force overwrite if .specify/ already exists (default: false)'
      }
    }
  }
};

export interface InitResult {
  success: boolean;
  targetDir: string;
  created: string[];
  skipped?: string[];
  error?: string;
}

/**
 * Find spec-kit-mcp installation path
 * Tries multiple strategies:
 * 1. Relative to this file (../../)
 * 2. node_modules/@code3/spec-kit-mcp
 */
function findSpecKitMcpPath(): string {
  // Strategy 1: Relative to this file (when running from built package)
  // __dirname is dist/tools/, so ../../ is package root
  const relativePathFromDist = join(__dirname, '../..');

  if (existsSync(join(relativePathFromDist, 'scripts'))) {
    return relativePathFromDist;
  }

  // Strategy 2: node_modules (when installed as dependency)
  const nodeModulesPath = join(process.cwd(), 'node_modules/@code3/spec-kit-mcp');
  if (existsSync(join(nodeModulesPath, 'scripts'))) {
    return nodeModulesPath;
  }

  throw new Error(
    'Cannot find spec-kit-mcp installation. Please ensure @code3/spec-kit-mcp is installed.'
  );
}

export async function handleInit(args: Record<string, any>): Promise<InitResult> {
  const targetDir = args.targetDir || process.cwd();
  const force = args.force || false;

  const result: InitResult = {
    success: false,
    targetDir,
    created: [],
    skipped: []
  };

  try {
    // Check if .specify/ already exists
    const specifyDir = join(targetDir, '.specify');
    if (existsSync(specifyDir) && !force) {
      throw new Error(
        '.specify/ directory already exists. Use force=true to overwrite.'
      );
    }

    // Find spec-kit-mcp installation
    const specKitPath = findSpecKitMcpPath();

    // Create directory structure
    const dirsToCreate = [
      '.specify/scripts/bash',
      '.specify/templates',
      '.specify/memory'
    ];

    for (const dir of dirsToCreate) {
      const fullPath = join(targetDir, dir);
      mkdirSync(fullPath, { recursive: true });
      result.created.push(dir);
    }

    // Copy scripts
    const scriptsToCopy = [
      'create-new-feature.sh',
      'setup-plan.sh',
      'check-prerequisites.sh',
      'common.sh'
    ];

    for (const script of scriptsToCopy) {
      const sourcePath = join(specKitPath, 'scripts', script);
      const targetPath = join(targetDir, '.specify/scripts/bash', script);

      if (existsSync(sourcePath)) {
        copyFileSync(sourcePath, targetPath);
        // Make executable (chmod +x)
        chmodSync(targetPath, 0o755);
        result.created.push(`.specify/scripts/bash/${script}`);
      } else {
        result.skipped?.push(`.specify/scripts/bash/${script} (source not found)`);
      }
    }

    // Copy templates
    const templatesToCopy = [
      { source: 'spec.md', target: 'spec-template.md' },
      { source: 'plan.md', target: 'plan-template.md' },
      { source: 'tasks.md', target: 'tasks-template.md' }
    ];

    for (const template of templatesToCopy) {
      const sourcePath = join(specKitPath, 'templates', template.source);
      const targetPath = join(targetDir, '.specify/templates', template.target);

      if (existsSync(sourcePath)) {
        copyFileSync(sourcePath, targetPath);
        result.created.push(`.specify/templates/${template.target}`);
      } else {
        result.skipped?.push(`.specify/templates/${template.target} (source not found)`);
      }
    }

    // Copy memory/constitution.md
    const constitutionSource = join(specKitPath, 'memory/constitution.md');
    const constitutionTarget = join(targetDir, '.specify/memory/constitution.md');

    if (existsSync(constitutionSource)) {
      copyFileSync(constitutionSource, constitutionTarget);
      result.created.push('.specify/memory/constitution.md');
    } else {
      // Create default constitution if source not found
      const defaultConstitution = `# Development Constitution

## Testing Requirements
- Write tests before implementation (TDD)
- Minimum test coverage: 80%
- All tests must pass before committing

## Code Quality
- Use TypeScript strict mode
- Follow ESLint + Prettier rules
- No \`any\` types without justification

## Commit Standards
- Follow Conventional Commits
- Types: feat, fix, docs, test, refactor, chore
- Include issue references when applicable

## Documentation
- Update README for new features
- Document API changes
- Add inline comments for complex logic

## Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user inputs
`;
      writeFileSync(constitutionTarget, defaultConstitution);
      result.created.push('.specify/memory/constitution.md (default)');
    }

    result.success = true;
    return result;

  } catch (error: any) {
    result.success = false;
    result.error = error.message;
    return result;
  }
}
