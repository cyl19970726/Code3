const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('BountyManager', function () {
  let bountyManager;
  let requester, worker, other;

  beforeEach(async function () {
    // Get test accounts
    [requester, worker, other] = await ethers.getSigners();

    // Deploy contract
    const BountyManagerFactory = await ethers.getContractFactory('BountyManager');
    bountyManager = await BountyManagerFactory.deploy();
    await bountyManager.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should deploy successfully', async function () {
      const address = await bountyManager.getAddress();
      expect(address).to.be.properAddress;
    });

    it('should set the correct cooling period', async function () {
      const coolingPeriod = await bountyManager.COOLING_PERIOD();
      expect(coolingPeriod).to.equal(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('createBounty (ETH)', function () {
    it('should create a bounty with ETH', async function () {
      const taskId = 'test-task-001';
      const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
      const amount = ethers.parseEther('1.0');

      const tx = await bountyManager.connect(requester).createBounty(taskId, taskHash, {
        value: amount
      });

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Verify bounty data
      const bounty = await bountyManager.getBounty(1);
      expect(bounty.taskId).to.equal(taskId);
      expect(bounty.taskHash).to.equal(taskHash);
      expect(bounty.requester).to.equal(requester.address);
      expect(bounty.amount).to.equal(amount);
      expect(bounty.asset).to.equal(ethers.ZeroAddress);
      expect(bounty.status).to.equal(0); // Open
    });

    it('should fail if amount is zero', async function () {
      const taskId = 'test-task-002';
      const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

      await expect(
        bountyManager.connect(requester).createBounty(taskId, taskHash, { value: 0 })
      ).to.be.revertedWith('Amount must be greater than 0');
    });

    it('should prevent duplicate bounty for same taskHash', async function () {
      const taskId = 'test-task-003';
      const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
      const amount = ethers.parseEther('1.0');

      // First creation
      await bountyManager.connect(requester).createBounty(taskId, taskHash, { value: amount });

      // Second creation (should fail)
      await expect(
        bountyManager.connect(requester).createBounty(taskId, taskHash, { value: amount })
      ).to.be.revertedWith('Bounty already exists for this task');
    });
  });

  describe('acceptBounty', function () {
    let bountyId;

    beforeEach(async function () {
      const taskId = 'test-task-accept';
      const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
      const amount = ethers.parseEther('1.0');

      await bountyManager.connect(requester).createBounty(taskId, taskHash, { value: amount });
      bountyId = 1;
    });

    it('should accept a bounty', async function () {
      await bountyManager.connect(requester).acceptBounty(bountyId, worker.address);

      const bounty = await bountyManager.getBounty(bountyId);
      expect(bounty.worker).to.equal(worker.address);
      expect(bounty.status).to.equal(1); // Accepted
      expect(bounty.acceptedAt).to.be.greaterThan(0);
    });

    it('should only allow requester to accept', async function () {
      await expect(
        bountyManager.connect(other).acceptBounty(bountyId, worker.address)
      ).to.be.revertedWith('Only requester can accept');
    });

    it('should only accept Open bounties', async function () {
      // Accept once
      await bountyManager.connect(requester).acceptBounty(bountyId, worker.address);

      // Try to accept again (should fail)
      await expect(
        bountyManager.connect(requester).acceptBounty(bountyId, worker.address)
      ).to.be.revertedWith('Bounty not open');
    });
  });

  describe('Query functions', function () {
    beforeEach(async function () {
      // Create multiple bounties
      for (let i = 0; i < 3; i++) {
        const taskId = `test-task-${i}`;
        const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
        const amount = ethers.parseEther('1.0');
        await bountyManager.connect(requester).createBounty(taskId, taskHash, { value: amount });
      }
    });

    it('should query bounty by taskHash', async function () {
      const taskId = 'test-task-0';
      const taskHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

      const [exists, bountyId] = await bountyManager.getBountyByTaskHash(taskHash);
      expect(exists).to.be.true;
      expect(bountyId).to.equal(1);
    });

    it('should query bounties by requester', async function () {
      const bounties = await bountyManager.getBountiesByRequester(requester.address);
      expect(bounties.length).to.equal(3);
      expect(bounties[0]).to.equal(1);
      expect(bounties[1]).to.equal(2);
      expect(bounties[2]).to.equal(3);
    });
  });
});
