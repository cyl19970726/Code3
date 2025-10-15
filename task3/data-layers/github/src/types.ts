/**
 * GitHub Data Layer Type Definitions
 */

export interface GitHubConfig {
  token: string; // GitHub Personal Access Token
  owner: string; // Repository owner
  repo: string; // Repository name
}

export interface CreateIssueParams {
  title: string;
  body: string; // Markdown content with YAML frontmatter
  labels?: string[];
}

export interface CreateIssueResult {
  issueUrl: string; // GitHub Issue URL
  issueNumber: number;
  issueId: string; // Format: "owner/repo#123"
}

export interface GetIssueParams {
  issueUrl: string; // GitHub Issue URL
}

export interface GetIssueResult {
  title: string;
  body: string; // Raw body (with frontmatter)
  content: string; // Content without frontmatter
  metadata: Record<string, any>; // Parsed YAML frontmatter
  issueNumber: number;
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateIssueParams {
  issueUrl: string;
  metadata?: Record<string, any>; // Partial metadata update
  content?: string; // Update content (will preserve frontmatter)
  title?: string; // Update title
}

export interface UpdateIssueResult {
  success: boolean;
  issueUrl: string;
}

export interface CreatePRParams {
  title: string;
  body: string;
  head: string; // Source branch
  base: string; // Target branch (usually 'main')
  draft?: boolean;
}

export interface CreatePRResult {
  prUrl: string; // GitHub PR URL
  prNumber: number;
  prId: string; // Format: "owner/repo#123"
}
