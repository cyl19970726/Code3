const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  const contractAddress = '0x28FE83352f2451c54d9050761DF1d7F8945a8fc4';

  const BountyManager = await ethers.getContractFactory('BountyManager');
  const contract = BountyManager.attach(contractAddress);

  const coolingPeriod = await contract.COOLING_PERIOD();

  console.log('✅ Contract Address:', contractAddress);
  console.log('✅ Cooling Period:', coolingPeriod.toString(), 'seconds');

  if (coolingPeriod.toString() !== '0') {
    throw new Error('❌ Cooling period should be 0!');
  }

  console.log('✅ Verification successful! Cooling period is 0.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
