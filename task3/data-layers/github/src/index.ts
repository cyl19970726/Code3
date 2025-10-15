/**
 * GitHub Data Layer
 *
 * @module @code3-team/data-layers-github
 */

export { GitHubDataLayer } from './client.js';
export { serializeIssueBody, deserializeIssueBody, mergeMetadata } from './metadata.js';
export type {
  GitHubConfig,
  CreateIssueParams,
  CreateIssueResult,
  GetIssueParams,
  GetIssueResult,
  UpdateIssueParams,
  UpdateIssueResult,
  CreatePRParams,
  CreatePRResult
} from './types.js';
