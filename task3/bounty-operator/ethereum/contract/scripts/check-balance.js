const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();

  console.log('Network:', network.name, '(Chain ID:', Number(network.chainId) + ')');
  console.log('Address:', deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  // 估算部署 gas 费用
  const BountyManager = await ethers.getContractFactory('BountyManager');
  const deployTx = await BountyManager.getDeployTransaction();
  const estimatedGas = await ethers.provider.estimateGas(deployTx);
  const feeData = await ethers.provider.getFeeData();
  const estimatedCost = estimatedGas * (feeData.gasPrice || 0n);

  console.log('\nEstimated deployment cost:');
  console.log('Gas:', estimatedGas.toString());
  console.log('Gas price:', ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'), 'gwei');
  console.log('Total cost:', ethers.formatEther(estimatedCost), 'ETH');

  const hasEnough = balance >= estimatedCost;
  console.log('\nSufficient balance:', hasEnough ? '✅ Yes' : '❌ No');

  if (!hasEnough) {
    const needed = estimatedCost - balance;
    console.log('Need:', ethers.formatEther(needed), 'more ETH');
    console.log('\nGet Sepolia testnet ETH from:');
    console.log('- https://sepoliafaucet.com/ (Alchemy)');
    console.log('- https://www.infura.io/faucet/sepolia (Infura)');
    console.log('- https://faucet.quicknode.com/ethereum/sepolia (QuickNode)');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
