/**
 * GitHub Data Layer Client
 *
 * Provides methods for creating/getting/updating GitHub Issues and PRs
 * with code3/v2 metadata support (YAML frontmatter).
 */

import { Octokit } from '@octokit/rest';
import {
  serializeIssueBody,
  deserializeIssueBody,
  mergeMetadata
} from './metadata.js';
import type {
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

export class GitHubDataLayer {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token
    });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * Create a new GitHub Issue with metadata
   */
  async createIssue(params: CreateIssueParams): Promise<CreateIssueResult> {
    const response = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: params.title,
      body: params.body,
      labels: params.labels
    });

    return {
      issueUrl: response.data.html_url,
      issueNumber: response.data.number,
      issueId: `${this.owner}/${this.repo}#${response.data.number}`
    };
  }

  /**
   * Get a GitHub Issue and parse metadata
   */
  async getIssue(params: GetIssueParams): Promise<GetIssueResult> {
    const issueNumber = this.extractIssueNumber(params.issueUrl);

    const response = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber
    });

    const { metadata, content } = deserializeIssueBody(response.data.body || '');

    return {
      title: response.data.title,
      body: response.data.body || '',
      content,
      metadata,
      issueNumber: response.data.number,
      state: response.data.state as 'open' | 'closed',
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };
  }

  /**
   * Update a GitHub Issue (supports partial metadata update)
   */
  async updateIssue(params: UpdateIssueParams): Promise<UpdateIssueResult> {
    const issueNumber = this.extractIssueNumber(params.issueUrl);

    // Get current issue data
    const current = await this.getIssue({ issueUrl: params.issueUrl });

    // Merge metadata if provided
    let newMetadata = current.metadata;
    if (params.metadata) {
      newMetadata = mergeMetadata(current.metadata, params.metadata);
    }

    // Use new content or keep existing
    const newContent = params.content !== undefined ? params.content : current.content;

    // Serialize new body
    const newBody = serializeIssueBody(newMetadata, newContent);

    // Update issue
    await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      title: params.title, // undefined will not update
      body: newBody
    });

    return {
      success: true,
      issueUrl: params.issueUrl
    };
  }

  /**
   * Create a new GitHub Pull Request
   */
  async createPR(params: CreatePRParams): Promise<CreatePRResult> {
    const response = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
      draft: params.draft
    });

    return {
      prUrl: response.data.html_url,
      prNumber: response.data.number,
      prId: `${this.owner}/${this.repo}#${response.data.number}`
    };
  }

  /**
   * Extract issue number from GitHub URL
   * Supports formats:
   * - https://github.com/owner/repo/issues/123
   * - owner/repo#123
   */
  private extractIssueNumber(urlOrId: string): number {
    // Try URL format first
    const urlMatch = urlOrId.match(/\/issues\/(\d+)/);
    if (urlMatch) {
      return parseInt(urlMatch[1], 10);
    }

    // Try "owner/repo#123" format
    const idMatch = urlOrId.match(/#(\d+)$/);
    if (idMatch) {
      return parseInt(idMatch[1], 10);
    }

    throw new Error(`Invalid GitHub Issue URL or ID: ${urlOrId}`);
  }
}
