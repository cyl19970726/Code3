/**
 * Task3Operator: Abstract class for bounty flow orchestration
 *
 * Implements 5 core flows:
 * 1. publishFlow - Idempotency check + upload task + create bounty
 * 2. acceptFlow - State validation + download task + accept bounty
 * 3. submitFlow - State validation + upload submission + update on-chain
 * 4. confirmFlow - Verify submission + confirm bounty + enter cooling period
 * 5. claimFlow - Cooling period validation + claim payout
 *
 * Design:
 * - Abstract class (not interface) - implements common logic for all workflows
 * - Workflow/data-layer agnostic - only business logic
 * - Dependency injection: dataOperator and bountyOperator passed as parameters
 */

import crypto from 'crypto';
import { BountyStatus } from '@code3-team/bounty-operator';
import type {
  PublishFlowParams,
  PublishFlowResult,
  AcceptFlowParams,
  AcceptFlowResult,
  SubmitFlowParams,
  SubmitFlowResult,
  ConfirmFlowParams,
  ConfirmFlowResult,
  ClaimFlowParams,
  ClaimFlowResult
} from '../types.js';

export abstract class Task3Operator {
  /**
   * Helper: Convert taskId to GitHub Issue URL
   * @param taskId - Format: "owner/repo#123"
   * @returns GitHub Issue URL: "https://github.com/owner/repo/issues/123"
   */
  private taskIdToUrl(taskId: string): string {
    // taskId format: "owner/repo#123"
    const match = taskId.match(/^(.+?)#(\d+)$/);
    if (!match) {
      throw new Error(`Invalid taskId format: ${taskId}`);
    }
    const [, repoPath, issueNumber] = match;
    return `https://github.com/${repoPath}/issues/${issueNumber}`;
  }

  /**
   * publishFlow: Publish a bounty with idempotency check
   *
   * Flow:
   * 1. Calculate task_hash (SHA256 of taskData)
   * 2. Check if bounty already exists (idempotency)
   * 3. Upload task data to data layer
   * 4. Create on-chain bounty
   * 5. Update task metadata (write back bounty_id)
   *
   * @param params - Flow parameters
   * @returns taskUrl, bountyId, txHash, isNew
   */
  async publishFlow(params: PublishFlowParams): Promise<PublishFlowResult> {
    const { dataOperator, bountyOperator, taskData, metadata, amount, asset } = params;

    // 1. Calculate task_hash (idempotency check)
    const taskHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(taskData))
      .digest('hex');

    // 2. Check if bounty already exists (idempotency)
    const existingBounty = await bountyOperator.getBountyByTaskHash({ taskHash });
    if (existingBounty.found && existingBounty.bountyId) {
      // Bounty already exists, get full details to retrieve taskId
      const bounty = await bountyOperator.getBounty({ bountyId: existingBounty.bountyId });

      // Convert taskId to taskUrl
      const taskUrl = this.taskIdToUrl(bounty.taskId);

      return {
        taskUrl,
        bountyId: existingBounty.bountyId,
        txHash: null, // No new transaction
        isNew: false
      };
    }

    // 3. Upload task data to data layer
    const enrichedMetadata = {
      ...metadata,
      taskHash
    } as any;

    const uploadResult = await dataOperator.uploadTaskData({
      taskData,
      metadata: enrichedMetadata
    });

    // 4. Create on-chain bounty
    const bountyResult = await bountyOperator.createBounty({
      taskId: uploadResult.taskId,
      taskUrl: uploadResult.taskUrl,
      taskHash,
      amount,
      asset
    });

    // 5. Update task metadata (write back bounty_id)
    await dataOperator.updateTaskMetadata({
      taskUrl: uploadResult.taskUrl,
      metadata: {
        chain: {
          ...enrichedMetadata.chain,
          bountyId: bountyResult.bountyId
        }
      }
    });

    return {
      taskUrl: uploadResult.taskUrl,
      bountyId: bountyResult.bountyId,
      txHash: bountyResult.txHash,
      isNew: true
    };
  }

  /**
   * acceptFlow: Accept a bounty
   *
   * Flow:
   * 1. Get task metadata
   * 2. Validate bounty status (must be Open)
   * 3. Download task data to local
   * 4. Accept bounty on-chain
   *
   * @param params - Flow parameters
   * @returns taskData, localPath, bountyId, txHash
   */
  async acceptFlow(params: AcceptFlowParams): Promise<AcceptFlowResult> {
    const { dataOperator, bountyOperator, taskUrl } = params;

    // 1. Get task metadata
    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    // 2. Validate bounty status (must be Open)
    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Open) {
      throw new Error(
        `Bounty status validation failed: expected Open, got ${bounty.status}`
      );
    }

    // 3. Download task data to local
    const downloadResult = await dataOperator.downloadTaskData({ taskUrl });

    // 4. Accept bounty on-chain
    const acceptResult = await bountyOperator.acceptBounty({ bountyId });

    return {
      taskData: downloadResult.taskData,
      localPath: downloadResult.localPath,
      bountyId,
      txHash: acceptResult.txHash
    };
  }

  /**
   * submitFlow: Submit work
   *
   * Flow:
   * 1. Get task metadata
   * 2. Validate bounty status (must be Accepted)
   * 3. Upload submission to data layer
   * 4. Submit bounty on-chain (update status to Submitted)
   *
   * @param params - Flow parameters
   * @returns submissionUrl, txHash
   */
  async submitFlow(params: SubmitFlowParams): Promise<SubmitFlowResult> {
    const { dataOperator, bountyOperator, taskUrl, submissionData } = params;

    // 1. Get task metadata
    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    // 2. Validate bounty status (must be Accepted)
    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Accepted) {
      throw new Error(
        `Bounty status validation failed: expected Accepted, got ${bounty.status}`
      );
    }

    // 3. Upload submission to data layer
    const uploadResult = await dataOperator.uploadSubmission({
      taskUrl,
      submissionData
    });

    // 4. Submit bounty on-chain
    const submissionHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(submissionData))
      .digest('hex');

    const submitResult = await bountyOperator.submitBounty({
      bountyId,
      submissionHash
    });

    // 5. Update metadata with submission URL
    await dataOperator.updateTaskMetadata({
      taskUrl,
      metadata: {
        dataLayer: {
          submissionUrl: uploadResult.submissionUrl
        }
      } as any
    });

    return {
      submissionUrl: uploadResult.submissionUrl,
      txHash: submitResult.txHash
    };
  }

  /**
   * confirmFlow: Confirm work submission (requester confirms)
   *
   * Flow:
   * 1. Get task metadata
   * 2. Validate bounty status (must be Submitted)
   * 3. Confirm bounty on-chain
   * 4. Update task metadata (write back confirmedAt)
   *
   * @param params - Flow parameters
   * @returns txHash, confirmedAt
   */
  async confirmFlow(params: ConfirmFlowParams): Promise<ConfirmFlowResult> {
    const { dataOperator, bountyOperator, taskUrl } = params;

    // 1. Get task metadata
    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    // 2. Validate bounty status (must be Submitted)
    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Submitted) {
      throw new Error(
        `Bounty status validation failed: expected Submitted, got ${bounty.status}`
      );
    }

    // 3. Confirm bounty on-chain
    const confirmedAt = Math.floor(Date.now() / 1000);
    const confirmResult = await bountyOperator.confirmBounty({
      bountyId,
      confirmedAt
    });

    // 4. Update task metadata (write back confirmedAt)
    await dataOperator.updateTaskMetadata({
      taskUrl,
      metadata: {
        bounty: {
          ...metadata.bounty,
          confirmedAt: confirmResult.confirmedAt
        }
      }
    });

    return {
      txHash: confirmResult.txHash,
      confirmedAt: confirmResult.confirmedAt
    };
  }

  /**
   * claimFlow: Claim payout (worker claims)
   *
   * Flow:
   * 1. Get task metadata
   * 2. Validate bounty status (must be Confirmed)
   * 3. Claim payout on-chain
   *
   * @param params - Flow parameters
   * @returns txHash, amount, asset
   */
  async claimFlow(params: ClaimFlowParams): Promise<ClaimFlowResult> {
    const { dataOperator, bountyOperator, taskUrl } = params;

    // 1. Get task metadata
    const metadata = await dataOperator.getTaskMetadata({ taskUrl });
    const { bountyId } = metadata.chain;

    // 2. Validate bounty status (must be Confirmed)
    const bounty = await bountyOperator.getBounty({ bountyId });
    if (bounty.status !== BountyStatus.Confirmed) {
      throw new Error(
        `Bounty status validation failed: expected Confirmed, got ${bounty.status}`
      );
    }

    // 3. Claim payout on-chain
    const claimResult = await bountyOperator.claimPayout({ bountyId });

    return {
      txHash: claimResult.txHash,
      amount: bounty.amount,
      asset: bounty.asset
    };
  }
}
