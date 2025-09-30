import { Tool, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ensureDir, pathExists, readTemplate, computeNextFeatureId } from './utils.js';

export interface ToolContext {
  projectPath: string;
  env: NodeJS.ProcessEnv;
}

export function registerTools(): Tool[] {
  return [
    {
      name: 'spec_mcp.specify',
      description: 'Create specs/<NNN-slug>/spec.md from template',
      inputSchema: {
        type: 'object',
        properties: {
          feature_description: { type: 'string' },
          feature_id: { type: 'string', nullable: true },
          allow_overwrite: { type: 'boolean', nullable: true }
        },
        required: ['feature_description']
      }
    },
    {
      name: 'spec_mcp.plan',
      description: 'Generate plan.md, research.md, data-model.md, contracts/, quickstart.md',
      inputSchema: {
        type: 'object',
        properties: {
          feature_id: { type: 'string' },
          tech_constraints: { type: 'string', nullable: true },
          allow_overwrite: { type: 'boolean', nullable: true }
        },
        required: ['feature_id']
      }
    },
    {
      name: 'spec_mcp.tasks',
      description: 'Generate tasks.md after prerequisites ready',
      inputSchema: {
        type: 'object',
        properties: {
          feature_id: { type: 'string' },
          allow_overwrite: { type: 'boolean', nullable: true }
        },
        required: ['feature_id']
      }
    }
  ];
}

export async function handleToolCall(name: string, args: any, ctx: ToolContext) {
  switch (name) {
    case 'spec_mcp.specify':
      return ok(await tSpecify(args, ctx));
    case 'spec_mcp.plan':
      return ok(await tPlan(args, ctx));
    case 'spec_mcp.tasks':
      return ok(await tTasks(args, ctx));
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool ${name}`);
  }
}

function ok(data: any) { return { content: [{ type: 'json', json: data }] }; }

async function tSpecify(args: any, ctx: ToolContext) {
  const { feature_description, feature_id, allow_overwrite = false } = args as { feature_description: string; feature_id?: string; allow_overwrite?: boolean };
  if (!feature_description || typeof feature_description !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'feature_description required');
  }
  const specsDir = join(ctx.projectPath, 'specs');
  await ensureDir(specsDir);
  const id = feature_id && feature_id.trim() ? feature_id : await computeNextFeatureId(specsDir, feature_description);
  const featDir = join(specsDir, id);
  const specPath = join(featDir, 'spec.md');
  const exists = await pathExists(specPath);
  if (exists && !allow_overwrite) {
    throw new McpError(ErrorCode.InvalidRequest, 'E_EXISTS: spec already exists');
  }
  await ensureDir(featDir);
  const template = await readTemplate(ctx, 'spec-template.md');
  await fs.writeFile(specPath, template, 'utf8');
  return { success: true, feature_id: id, paths: { dir: `specs/${id}`, spec: `specs/${id}/spec.md` } };
}

async function tPlan(args: any, ctx: ToolContext) {
  const { feature_id, allow_overwrite = false } = args as { feature_id: string; allow_overwrite?: boolean };
  if (!feature_id) throw new McpError(ErrorCode.InvalidParams, 'feature_id required');
  const featDir = join(ctx.projectPath, 'specs', feature_id);
  if (!(await pathExists(featDir))) throw new McpError(ErrorCode.InvalidRequest, 'E_NOT_FOUND: feature dir not found');

  const planPath = join(featDir, 'plan.md');
  const researchPath = join(featDir, 'research.md');
  const dataModelPath = join(featDir, 'data-model.md');
  const quickstartPath = join(featDir, 'quickstart.md');
  const contractsDir = join(featDir, 'contracts');

  const existsAny = (await Promise.all([planPath, researchPath, dataModelPath, quickstartPath].map(pathExists))).some(Boolean);
  if (existsAny && !allow_overwrite) throw new McpError(ErrorCode.InvalidRequest, 'E_EXISTS: files already exist');

  const planT = await readTemplate(ctx, 'plan-template.md');
  await fs.writeFile(planPath, planT, 'utf8');
  await fs.writeFile(researchPath, '# research\n// TODO: fill by /plan Phase 0\n', 'utf8');
  await fs.writeFile(dataModelPath, '# data-model\n// TODO: define entities and relationships\n', 'utf8');
  await ensureDir(contractsDir);
  await fs.writeFile(quickstartPath, '# Quickstart\n// TODO: execution notes and setup\n', 'utf8');
  return { success: true, paths: { plan: rel(ctx, planPath), research: rel(ctx, researchPath), data_model: rel(ctx, dataModelPath), contracts: rel(ctx, contractsDir), quickstart: rel(ctx, quickstartPath) } };
}

async function tTasks(args: any, ctx: ToolContext) {
  const { feature_id, allow_overwrite = false } = args as { feature_id: string; allow_overwrite?: boolean };
  if (!feature_id) throw new McpError(ErrorCode.InvalidParams, 'feature_id required');
  const featDir = join(ctx.projectPath, 'specs', feature_id);
  const pre = [join(featDir, 'research.md'), join(featDir, 'data-model.md'), join(featDir, 'quickstart.md')];
  for (const p of pre) {
    if (!(await pathExists(p))) throw new McpError(ErrorCode.InvalidRequest, `E_PRECONDITION: missing ${rel(ctx, p)}`);
  }
  const tasksPath = join(featDir, 'tasks.md');
  if ((await pathExists(tasksPath)) && !allow_overwrite) throw new McpError(ErrorCode.InvalidRequest, 'E_EXISTS: tasks.md exists');
  const tasksT = await readTemplate(ctx, 'tasks-template.md');
  await fs.writeFile(tasksPath, tasksT, 'utf8');
  return { success: true, path: rel(ctx, tasksPath) };
}

function rel(ctx: ToolContext, abs: string) {
  const p = abs.replace(/\\/g, '/');
  const root = ctx.projectPath.replace(/\\/g, '/');
  return p.startsWith(root) ? p.slice(root.length + 1) : abs;
}

