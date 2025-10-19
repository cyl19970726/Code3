/**
 * MCP Prompt 类型定义
 */
import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext } from '../types.js';

export interface PromptDefinition {
  prompt: Prompt;
  handler: (args: Record<string, any>, context: ToolContext) => Promise<PromptMessage[]>;
}
