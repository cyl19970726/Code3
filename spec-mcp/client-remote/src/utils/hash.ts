/**
 * Hash utilities for issue_hash calculation
 *
 * Based on Code3/docs/06-issue-metadata.md
 * Implements canonical JSON → SHA256 hashing
 */

import { createHash } from 'crypto';

/**
 * Convert object to canonical form (recursively sort keys)
 * Based on 14-data-model.md section 1.2
 */
export function canonical(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(canonical);
  }
  if (obj && typeof obj === 'object') {
    const sorted: any = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = canonical(obj[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Calculate SHA256 hash of canonical JSON
 * Returns hex string (lowercase)
 */
export function calculateIssueHash(metadata: any): string {
  const canonicalJson = JSON.stringify(canonical(metadata));
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

/**
 * Generate task_id from repo and issue_number
 * Format: {owner}/{repo}#{issue_number}
 */
export function generateTaskId(repo: string, issueNumber: number): string {
  return `${repo}#${issueNumber}`;
}