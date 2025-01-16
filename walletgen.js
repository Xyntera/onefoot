const fs = require('fs');
const { Wallet } = require('ethers');

// Initialize an array to hold the wallet data
let walletsData = [];

// Generate 500 wallets
for (let i = 0; i < 500; i++) {
  const wallet = Wallet.createRandom();
  const privateKey = wallet.privateKey;
  const address = wallet.address;

  // Push the wallet details to the array
  walletsData.push({ privateKey, address });
}

// Save the private keys to a file (one per line)
fs.writeFileSync(
  'privatekey.txt',
  walletsData.map((wallet) => wallet.privateKey).join('\n'),
  'utf8'
);

// Save the wallet addresses to a different file (one per line)
fs.writeFileSync(
  'wallet.txt',
  walletsData.map((wallet) => wallet.address).join('\n'),
  'utf8'
);

console.log('500 Private Keys and Wallet Addresses have been saved!');

// Now, convert the wallet data to a JSON format
const outputFile = 'wallet.json';

// Write the wallet data to a JSON file
fs.writeFileSync(outputFile, JSON.stringify(walletsData, null, 2), 'utf8');

console.log(`Data successfully converted to ${outputFile}`);
