import { promises as fs } from 'fs';
import { join } from 'path';

export async function ensureDir(path: string) {
  await fs.mkdir(path, { recursive: true });
}

export async function pathExists(path: string) {
  try { await fs.stat(path); return true; } catch { return false; }
}

export function sanitizeSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(0, 3).join('-') || 'feature';
}

export async function computeNextFeatureId(specsDir: string, featureDescription: string) {
  const entries = await fs.readdir(specsDir, { withFileTypes: true }).catch(() => [] as any);
  let max = 0;
  for (const e of entries) {
    if (e.isDirectory()) {
      const m = /^([0-9]{3})-/.exec(e.name);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  }
  const next = (max + 1).toString().padStart(3, '0');
  const slug = sanitizeSlug(featureDescription);
  return `${next}-${slug}`;
}

export async function readTemplate(ctx: { env: NodeJS.ProcessEnv }, filename: string) {
  const override = ctx.env.SPEC_KIT_TEMPLATES_DIR; // optional
  const candidates: string[] = [];
  if (override) candidates.push(join(override, filename));
  // default to sibling spec-kit repo
  candidates.push(join(process.cwd(), 'templates', filename));
  candidates.push(join(process.cwd(), '..', 'spec-kit', 'templates', filename));
  candidates.push(join(process.cwd(), '..', '..', 'spec-kit', 'templates', filename));
  for (const p of candidates) {
    if (await pathExists(p)) {
      return fs.readFile(p, 'utf8');
    }
  }
  // fallback minimal content
  if (filename === 'spec-template.md') return `# Feature Specification: [FEATURE]\n\n## Execution Flow (main)\n\n- TODO\n`;
  if (filename === 'plan-template.md') return `# Implementation Plan: [FEATURE]\n\n## Execution Flow (/plan scope)\n- Phase 0 research → research.md\n- Phase 1 data-model/contracts/quickstart\n`;
  if (filename === 'tasks-template.md') return `# Tasks for [FEATURE]\n\n- [ ] TODO first task\n`;
  return '';
}

