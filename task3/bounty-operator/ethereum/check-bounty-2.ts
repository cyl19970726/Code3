import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
const contractAddress = '0xc18C3F54778D2B1527c1081Ed15F030170C42B82';
const abi = [
  'function getBounty(uint256 bountyId) view returns (tuple(uint256 bountyId, string taskId, bytes32 taskHash, address requester, address worker, uint256 amount, address asset, uint8 status, uint256 createdAt, uint256 acceptedAt, uint256 submittedAt, string submissionUrl, uint256 confirmedAt, uint256 claimedAt))'
];

const contract = new ethers.Contract(contractAddress, abi, provider);

async function checkBounty() {
  try {
    const bounty = await contract.getBounty(2);
    console.log('\n=== Bounty #2 Data ===');
    console.log('taskId:', bounty.taskId);
    console.log('submissionUrl:', bounty.submissionUrl);
    console.log('status:', Number(bounty.status));
    console.log('\n=== Analysis ===');
    console.log('Is taskId a valid GitHub URL?', bounty.taskId.startsWith('https://github.com/'));
    console.log('taskId format:', bounty.taskId.includes('#') ? 'Short format (owner/repo#number)' : 'Unknown');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkBounty();
