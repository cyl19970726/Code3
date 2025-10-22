/**
 * Initialize BountyManager on localhost
 */

import { SolanaBountyOperator } from '../src/solana-bounty-operator.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

async function initializeBountyManager() {
  const privateKey = process.env.SPONSOR_PRIVATE_KEY || '';

  if (!privateKey) {
    console.error('Error: SPONSOR_PRIVATE_KEY not found in .env.test');
    process.exit(1);
  }

  const operator = new SolanaBountyOperator({
    rpcUrl: 'http://localhost:8899',
    privateKey,
    programId: '5bjKDPsreaQrZ2dNoyDbHsUwqJukmDMi5qQheYHVFzD4'
  });

  try {
    console.log('Initializing BountyManager...');

    const result = await operator.initializeBountyManager();

    console.log('Success: BountyManager initialized!');
    console.log('Tx Hash:', result.txHash);
    console.log('BountyManager PDA:', result.bountyManagerAddress);
  } catch (error: any) {
    if (error.message && error.message.includes('already in use')) {
      console.log('Success: BountyManager already initialized');
    } else {
      console.error('Error: Failed to initialize BountyManager:', error.message);
      process.exit(1);
    }
  }
}

initializeBountyManager();
