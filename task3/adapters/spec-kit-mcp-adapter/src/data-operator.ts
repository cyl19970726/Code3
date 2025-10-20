/**
 * SpecKitDataOperator: DataOperator implementation for spec-kit workflow
 *
 * Data format conventions:
 * - taskData: specs/00x/spec.md file content (Markdown format)
 * - taskUrl: GitHub Issue URL
 * - submissionUrl: GitHub PR URL
 * - metadata: Stored in Issue body as YAML frontmatter
 *
 * Responsibilities:
 * - Implements DataOperator interface (5 methods)
 * - Uses GitHubDataLayer for all GitHub API operations
 */

import { GitHubDataLayer, serializeIssueBody } from '@code3-team/data-layers-github';
import {
  DataOperator,
  UploadTaskDataParams,
  UploadTaskDataResult,
  DownloadTaskDataParams,
  DownloadTaskDataResult,
  UploadSubmissionParams,
  UploadSubmissionResult,
  GetTaskMetadataParams,
  TaskMetadata,
  UpdateTaskMetadataParams,
  UpdateTaskMetadataResult
} from '@code3-team/data-operator';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class SpecKitDataOperator implements DataOperator {
  private githubLayer: GitHubDataLayer;
  private localSpecsDir: string;

  constructor(config: {
    githubToken: string;
    repo: string; // format: "owner/repo"
    localSpecsDir: string; // default: "specs/"
  }) {
    const [owner, repo] = config.repo.split('/');
    this.githubLayer = new GitHubDataLayer({
      token: config.githubToken,
      owner,
      repo
    });
    this.localSpecsDir = config.localSpecsDir;
  }

  /**
   * uploadTaskData: Upload spec.md to GitHub Issue
   *
   * Flow:
   * 1. Read local specs/00x/spec.md file
   * 2. Generate Issue title (extract from spec.md first line)
   * 3. Generate Issue body (spec.md content + metadata frontmatter)
   * 4. Create GitHub Issue via GitHubDataLayer
   * 5. Return taskUrl (Issue URL)
   */
  async uploadTaskData(params: UploadTaskDataParams): Promise<UploadTaskDataResult> {
    const { taskData, metadata } = params;

    // 1. Parse spec.md content
    const specContent = taskData.content; // Markdown string
    const specLines = specContent.split('\n');
    const title = specLines[0].replace(/^#\s*/, '').trim(); // Extract first line as title

    // 2. Generate taskHash
    const taskHash = crypto.createHash('sha256').update(specContent).digest('hex');

    // 3. Prepare full metadata
    const fullMetadata = {
      ...metadata,
      taskHash,
      workflow: metadata.workflow || { name: 'spec-kit', version: '1.0.0', adapter: 'spec-kit-mcp-adapter' }
    };

    // 4. Serialize metadata + content to Issue body (YAML frontmatter + Markdown)
    const issueBody = serializeIssueBody(fullMetadata, specContent);

    // 5. Create GitHub Issue via GitHubDataLayer
    const result = await this.githubLayer.createIssue({
      title: `[spec-kit] ${title}`,
      body: issueBody,
      labels: ['bounty', 'spec-kit', metadata.chain?.name || 'aptos']
    });

    return {
      taskUrl: result.issueUrl,
      taskId: result.issueId
    };
  }

  /**
   * downloadTaskData: Download from GitHub Issue to local specs/00x/spec.md
   *
   * Flow:
   * 1. Get Issue content via GitHubDataLayer
   * 2. Parse Issue body (extract spec.md content and metadata)
   * 3. Generate local spec ID (from Issue number)
   * 4. Write local specs/00x/spec.md file
   * 5. Return local path and taskData
   */
  async downloadTaskData(params: DownloadTaskDataParams): Promise<DownloadTaskDataResult> {
    const { taskUrl } = params;

    // 1. Get Issue content via GitHubDataLayer
    const issue = await this.githubLayer.getIssue({ issueUrl: taskUrl });

    // 2. Extract spec.md content (metadata is in issue.metadata)
    const { content, metadata } = issue;

    // 3. Generate local spec ID (format: 001, 002, ...)
    const specId = String(issue.issueNumber).padStart(3, '0');
    const localPath = path.join(this.localSpecsDir, specId, 'spec.md');

    // 4. Write local file
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, content, 'utf-8');

    console.log(`[SpecKitDataOperator] Downloaded spec.md to ${localPath}`);

    return {
      taskData: { content },
      localPath,
      metadata: metadata as TaskMetadata
    };
  }

  /**
   * uploadSubmission: Submit code + documentation via PR
   *
   * Flow:
   * 1. Validate local submission directory (specs/00x/submission/)
   * 2. Push to remote branch (if needed)
   * 3. Create GitHub Pull Request via GitHubDataLayer
   * 4. PR body includes:
   *    - Link to original Issue
   *    - Submission content overview
   *    - Closes #<issue_number> (auto-link)
   * 5. Return submissionUrl (PR URL)
   */
  async uploadSubmission(params: UploadSubmissionParams): Promise<UploadSubmissionResult> {
    const { taskUrl, submissionData } = params;

    // 1. Parse taskUrl to get Issue number and metadata
    const issue = await this.githubLayer.getIssue({ issueUrl: taskUrl });
    const issueNumber = issue.issueNumber;
    const metadata = issue.metadata as any;

    // 2. Read sourceBranch from metadata (fallback to 'main' for backward compatibility)
    const sourceBranch = metadata.repository?.sourceBranch || 'main';
    console.log(`[SpecKitDataOperator] Using sourceBranch: ${sourceBranch} (from metadata: ${!!metadata.repository?.sourceBranch})`);

    // 3. Generate PR title and body
    const prTitle = `[spec-kit] Submission for #${issueNumber}`;
    const prBody = `## Submission for Issue #${issueNumber}

### Summary
${submissionData.summary || 'Implementation completed as specified.'}

### Files Changed
${submissionData.filesChanged?.join('\n') || 'See commit history.'}

### Testing
${submissionData.testing || 'All tests passed.'}

---
Closes #${issueNumber}
`;

    // 4. Create Pull Request via GitHubDataLayer
    const result = await this.githubLayer.createPR({
      title: prTitle,
      body: prBody,
      head: submissionData.branchName, // Submission branch (worker-bounty-{bountyId})
      base: sourceBranch // Target branch (Requester's sourceBranch)
    });

    console.log(`[SpecKitDataOperator] Created PR: ${result.prUrl} (base: ${sourceBranch})`);

    return {
      submissionUrl: result.prUrl
    };
  }

  /**
   * getTaskMetadata: Get task metadata
   *
   * Flow:
   * 1. Get Issue via GitHubDataLayer
   * 2. Parse Issue body to extract metadata
   * 3. Return metadata
   */
  async getTaskMetadata(params: GetTaskMetadataParams): Promise<TaskMetadata> {
    const { taskUrl } = params;

    // 1. Get Issue via GitHubDataLayer
    const issue = await this.githubLayer.getIssue({ issueUrl: taskUrl });

    // 2. Parse Issue body to extract metadata
    return issue.metadata as TaskMetadata;
  }

  /**
   * updateTaskMetadata: Update task metadata
   *
   * Flow:
   * 1. Get current metadata
   * 2. Merge new metadata
   * 3. Update Issue via GitHubDataLayer
   * 4. Return success status
   */
  async updateTaskMetadata(params: UpdateTaskMetadataParams): Promise<UpdateTaskMetadataResult> {
    const { taskUrl, metadata: newMetadata } = params;

    // 1. Update Issue metadata via GitHubDataLayer
    await this.githubLayer.updateIssue({
      issueUrl: taskUrl,
      metadata: newMetadata
    });

    console.log(`[SpecKitDataOperator] Updated task metadata for ${taskUrl}`);

    return { success: true };
  }
}
