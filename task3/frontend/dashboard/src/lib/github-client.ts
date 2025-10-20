import { Octokit } from '@octokit/rest';

export interface GitHubIssueData {
  title: string;
  description: string;
  labels: string[];
  url: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor() {
    // GitHub token is only available in server-side API routes (not NEXT_PUBLIC_)
    const token = process.env.GITHUB_TOKEN;

    this.octokit = new Octokit({
      auth: token,
    });
  }

  /**
   * Parse GitHub Issue URL to extract owner, repo, and issue number
   * Format: https://github.com/owner/repo/issues/123
   */
  parseIssueUrl(url: string): { owner: string; repo: string; issueNumber: number } | null {
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
      if (!match) {
        return null;
      }

      const [, owner, repo, issueNumber] = match;
      return {
        owner,
        repo,
        issueNumber: parseInt(issueNumber, 10),
      };
    } catch (error) {
      console.error('Error parsing GitHub Issue URL:', error);
      return null;
    }
  }

  /**
   * Fetch GitHub Issue details
   */
  async getIssue(url: string): Promise<GitHubIssueData | null> {
    try {
      const parsed = this.parseIssueUrl(url);
      if (!parsed) {
        console.error('Invalid GitHub Issue URL:', url);
        return null;
      }

      const { owner, repo, issueNumber } = parsed;

      const { data } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      return {
        title: data.title,
        description: data.body || '',
        labels: data.labels.map((label) =>
          typeof label === 'string' ? label : label.name || ''
        ),
        url: data.html_url,
      };
    } catch (error) {
      console.error('Error fetching GitHub Issue:', error);
      return null;
    }
  }
}
