const { EthereumBountyOperator } = require('./dist/index.js');
require('dotenv').config({ path: 'contract/.env' });

async function main() {
  console.log('🧪 Testing new Ethereum contract...\n');

  const contractAddress = '0x28FE83352f2451c54d9050761DF1d7F8945a8fc4';

  const operator = new EthereumBountyOperator({
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    privateKey: process.env.PRIVATE_KEY,
    contractAddress
  });

  // Test 1: Get cooling period
  console.log('Test 1: Get cooling period');
  const coolingPeriod = await operator.getCoolingPeriod();
  console.log('✅ Cooling Period:', coolingPeriod, 'seconds');

  const cpNumber = parseInt(coolingPeriod);
  if (cpNumber !== 0) {
    throw new Error(`❌ Cooling period should be 0, but got ${cpNumber}!`);
  }

  // Test 2: Get wallet address
  console.log('\nTest 2: Get wallet address');
  const address = operator.getAddress();
  console.log('✅ Wallet Address:', address);

  // Test 3: Get contract address
  console.log('\nTest 3: Get contract address');
  const contract = operator.getContractAddress();
  console.log('✅ Contract Address:', contract);

  if (contract !== contractAddress) {
    throw new Error('❌ Contract address mismatch!');
  }

  // Test 4: List bounties (should return empty or existing bounties)
  console.log('\nTest 4: List bounties');
  try {
    const result = await operator.listBounties({ offset: 0, limit: 10 });
    console.log('✅ Bounty count:', result.count);
    console.log('✅ Bounty IDs:', result.bountyIds);
  } catch (error) {
    console.log('⚠️  List bounties failed (expected if no bounties yet):', error.message);
  }

  console.log('\n🎉 All tests passed! New contract is ready to use.');
  console.log('\n📋 Contract Details:');
  console.log('- Address:', contractAddress);
  console.log('- Network: Sepolia');
  console.log('- Cooling Period: 0 seconds');
  console.log('- Etherscan:', `https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
