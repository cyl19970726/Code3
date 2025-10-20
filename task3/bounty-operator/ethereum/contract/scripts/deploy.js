const { ethers, run } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Deploying BountyManager to Ethereum...');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // 部署合约
  const BountyManager = await ethers.getContractFactory('BountyManager');
  console.log('Deploying BountyManager...');

  const bountyManager = await BountyManager.deploy();
  await bountyManager.waitForDeployment();

  const address = await bountyManager.getAddress();
  console.log('✅ BountyManager deployed to:', address);

  // 保存合约地址到配置文件
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === 'unknown' ? 'localhost' : network.name;

  const deploymentInfo = {
    network: networkName,
    chainId: Number(network.chainId),
    contractAddress: address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('📄 Deployment info saved to:', deploymentFile);

  // 验证合约（如果在主网或测试网）
  if (networkName !== 'hardhat' && networkName !== 'localhost') {
    console.log('\n⏳ Waiting for block confirmations...');
    const deployTx = bountyManager.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(6);
    }

    console.log('🔍 Verifying contract on Etherscan...');
    try {
      await run('verify:verify', {
        address: address,
        constructorArguments: []
      });
      console.log('✅ Contract verified successfully');
    } catch (error) {
      if (error.message.includes('Already Verified')) {
        console.log('ℹ️  Contract already verified');
      } else {
        console.error('❌ Verification failed:', error.message);
      }
    }
  }

  console.log('\n🎉 Deployment complete!');
  console.log('Contract address:', address);
  console.log('Network:', networkName);
  console.log('Deployer:', deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
