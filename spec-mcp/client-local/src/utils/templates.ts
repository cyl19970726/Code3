/**
 * Template utilities for loading and processing templates
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the templates directory path
 */
export function getTemplatesDir(): string {
  // This module is at src/utils/templates.ts
  // Templates are at src/templates/
  const currentFile = fileURLToPath(import.meta.url);
  const srcDir = dirname(dirname(currentFile));
  return join(srcDir, 'templates');
}

/**
 * Load a template file
 */
export async function loadTemplate(templateName: string): Promise<string> {
  const templatesDir = getTemplatesDir();
  const templatePath = join(templatesDir, templateName);
  return await fs.readFile(templatePath, 'utf-8');
}

/**
 * Process template variables
 * Simple replacement for {{VARIABLE}} style placeholders
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}