const { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');

async function transfer() {
  // Parse sponsor private key from Base58
  const sponsorPrivateKey = '47LeEP7F5Ywg9uW2CRKraTh9ebXDeEWb9MA11prt3f3XnJ7NsMWztVvV2Heukp8cMp6Q2CkcSe1w2p7ok5zXNVRA';
  const secretKey = bs58.decode(sponsorPrivateKey);
  const sponsor = Keypair.fromSecretKey(secretKey);

  console.log('Sponsor public key:', sponsor.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check balance
  const balance = await connection.getBalance(sponsor.publicKey);
  console.log('Sponsor balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  // Transfer 0.1 SOL to deployer account
  const deployer = new PublicKey('6hKxahKJAtaDH72baWNsG9NUHgr2azYH2bfGkQXPr5A6');
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sponsor.publicKey,
      toPubkey: deployer,
      lamports: 0.1 * LAMPORTS_PER_SOL
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [sponsor]);
  console.log('Transfer successful! Signature:', signature);
}

transfer().catch(console.error);
