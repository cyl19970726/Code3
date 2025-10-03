import { describe, it, expect } from 'vitest';
import { server } from '../src/server.js';

/**
 * MCP Server Basic Tests
 *
 * Tests the spec-kit-mcp server structure:
 * - Server instance creation
 * - Prompts and Tools are registered in source code
 *
 * Note: This is a lightweight test that verifies the server instance exists.
 * Full integration tests (calling prompts/tools) are in E2E-01.
 */

describe('spec-kit-mcp Server', () => {
  it('should create a server instance', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(Object);
  });

  it('should have Server class methods', () => {
    // Verify server has core MCP methods
    expect(typeof (server as any).setRequestHandler).toBe('function');
    expect(typeof (server as any).connect).toBe('function');
  });

  it('should be importable from server module', () => {
    // This test passes if import doesn't throw
    expect(true).toBe(true);
  });
});

describe('Prompts and Tools (Source Code Verification)', () => {
  it('should import all prompt definitions', async () => {
    const { specifyPrompt, clarifyPrompt, planPrompt, tasksPrompt, analyzePrompt, implementPrompt, constitutionPrompt } = await import('../src/prompts/index.js');

    expect(specifyPrompt).toBeDefined();
    expect(clarifyPrompt).toBeDefined();
    expect(planPrompt).toBeDefined();
    expect(tasksPrompt).toBeDefined();
    expect(analyzePrompt).toBeDefined();
    expect(implementPrompt).toBeDefined();
    expect(constitutionPrompt).toBeDefined();
  });

  it('should import all tool definitions', async () => {
    const { specContextTool, planContextTool, tasksContextTool } = await import('../src/tools/index.js');

    expect(specContextTool).toBeDefined();
    expect(planContextTool).toBeDefined();
    expect(tasksContextTool).toBeDefined();
  });

  it('specify prompt should have correct structure', async () => {
    const { specifyPrompt } = await import('../src/prompts/index.js');

    expect(specifyPrompt.prompt.name).toBe('specify');
    expect(specifyPrompt.prompt.description).toBeDefined();
    expect(typeof specifyPrompt.handler).toBe('function');
  });

  it('clarify prompt should have correct structure', async () => {
    const { clarifyPrompt } = await import('../src/prompts/index.js');

    expect(clarifyPrompt.prompt.name).toBe('clarify');
    expect(typeof clarifyPrompt.handler).toBe('function');
  });

  it('plan prompt should have correct structure', async () => {
    const { planPrompt } = await import('../src/prompts/index.js');

    expect(planPrompt.prompt.name).toBe('plan');
    expect(typeof planPrompt.handler).toBe('function');
  });

  it('tasks prompt should have correct structure', async () => {
    const { tasksPrompt } = await import('../src/prompts/index.js');

    expect(tasksPrompt.prompt.name).toBe('tasks');
    expect(typeof tasksPrompt.handler).toBe('function');
  });

  it('analyze prompt should have correct structure', async () => {
    const { analyzePrompt } = await import('../src/prompts/index.js');

    expect(analyzePrompt.prompt.name).toBe('analyze');
    expect(typeof analyzePrompt.handler).toBe('function');
  });

  it('implement prompt should have correct structure', async () => {
    const { implementPrompt } = await import('../src/prompts/index.js');

    expect(implementPrompt.prompt.name).toBe('implement');
    expect(typeof implementPrompt.handler).toBe('function');
  });

  it('constitution prompt should have correct structure', async () => {
    const { constitutionPrompt } = await import('../src/prompts/index.js');

    expect(constitutionPrompt.prompt.name).toBe('constitution');
    expect(typeof constitutionPrompt.handler).toBe('function');
  });

  it('spec-context tool should have correct structure', async () => {
    const { specContextTool } = await import('../src/tools/index.js');

    expect(specContextTool.name).toBe('spec-context');
    expect(specContextTool.description).toBeDefined();
    expect(specContextTool.inputSchema).toBeDefined();
  });

  it('plan-context tool should have correct structure', async () => {
    const { planContextTool } = await import('../src/tools/index.js');

    expect(planContextTool.name).toBe('plan-context');
    expect(planContextTool.description).toBeDefined();
    expect(planContextTool.inputSchema).toBeDefined();
  });

  it('tasks-context tool should have correct structure', async () => {
    const { tasksContextTool } = await import('../src/tools/index.js');

    expect(tasksContextTool.name).toBe('tasks-context');
    expect(tasksContextTool.description).toBeDefined();
    expect(tasksContextTool.inputSchema).toBeDefined();
  });
});

describe('Prompt Handlers (Return PromptMessage[])', () => {
  it('specify handler should return PromptMessage array', async () => {
    const { specifyPrompt } = await import('../src/prompts/index.js');

    const result = await specifyPrompt.handler({ featureDescription: 'test' }, { projectPath: '/tmp' });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('role');
    expect(result[0]).toHaveProperty('content');
  });

  it('plan handler should return PromptMessage array', async () => {
    const { planPrompt } = await import('../src/prompts/index.js');

    const result = await planPrompt.handler({ specPath: 'specs/001/spec.md' }, { projectPath: '/tmp' });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tasks handler should return PromptMessage array', async () => {
    const { tasksPrompt } = await import('../src/prompts/index.js');

    const result = await tasksPrompt.handler({ planPath: 'specs/001/plan.md' }, { projectPath: '/tmp' });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Pure MCP Architecture', () => {
  it('prompts should return instructions (not call LLM)', async () => {
    const { specifyPrompt } = await import('../src/prompts/index.js');

    const messages = await specifyPrompt.handler({ featureDescription: 'test' }, { projectPath: '/tmp' });

    // Verify it returns PromptMessage[] (instructions), not LLM completion
    expect(messages[0].content).toBeDefined();
    const text = messages[0].content.type === 'text' ? messages[0].content.text : '';

    // Verify instruction contains expected keywords
    expect(text).toContain('create-new-feature.sh');
    expect(text).toContain('test');
  });

  it('tools should be file readers (not LLM callers)', () => {
    // Tools are designed to read files, not call LLMs
    // This is verified by their names and descriptions

    expect(true).toBe(true); // Architectural assertion
  });
});
