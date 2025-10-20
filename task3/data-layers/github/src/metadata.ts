/**
 * GitHub Issue Metadata Serialization/Deserialization
 *
 * Format: YAML frontmatter + Markdown content
 *
 * ---
 * key: value
 * nested:
 *   key: value
 * ---
 *
 * # Markdown content here
 */

import YAML from 'yaml';

const FRONTMATTER_DELIMITER = '---';

/**
 * Serialize metadata and content to GitHub Issue body format
 */
export function serializeIssueBody(
  metadata: Record<string, any>,
  content: string
): string {
  const yamlContent = YAML.stringify(metadata);

  return `${FRONTMATTER_DELIMITER}\n${yamlContent}${FRONTMATTER_DELIMITER}\n\n${content}`;
}

/**
 * Deserialize GitHub Issue body to metadata and content
 */
export function deserializeIssueBody(body: string): {
  metadata: Record<string, any>;
  content: string;
} {
  // Check if body starts with frontmatter delimiter
  if (!body.trim().startsWith(FRONTMATTER_DELIMITER)) {
    // No frontmatter, return empty metadata
    return {
      metadata: {},
      content: body
    };
  }

  // Find the second delimiter
  const firstDelimiterEnd = body.indexOf('\n', FRONTMATTER_DELIMITER.length);
  const secondDelimiterStart = body.indexOf(
    FRONTMATTER_DELIMITER,
    firstDelimiterEnd + 1
  );

  if (secondDelimiterStart === -1) {
    // Malformed frontmatter, treat entire body as content
    return {
      metadata: {},
      content: body
    };
  }

  // Extract YAML content
  const yamlContent = body.substring(
    firstDelimiterEnd + 1,
    secondDelimiterStart
  );

  // Extract markdown content (skip the second delimiter and any following newlines)
  const secondDelimiterEnd = body.indexOf('\n', secondDelimiterStart + FRONTMATTER_DELIMITER.length);
  const content = body.substring(secondDelimiterEnd + 1).trim();

  // Parse YAML
  let metadata: Record<string, any> = {};
  try {
    metadata = YAML.parse(yamlContent) || {};
  } catch (error) {
    console.error('Failed to parse YAML frontmatter:', error);
    // Return empty metadata on parse error
    metadata = {};
  }

  return {
    metadata,
    content
  };
}

/**
 * Merge partial metadata with existing metadata
 */
export function mergeMetadata(
  existing: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(updates)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof merged[key] === 'object' &&
      merged[key] !== null &&
      !Array.isArray(merged[key])
    ) {
      // Deep merge for nested objects
      merged[key] = mergeMetadata(merged[key], value);
    } else {
      // Direct assignment for primitives, arrays, and null
      merged[key] = value;
    }
  }

  return merged;
}
