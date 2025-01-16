const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');

// Configuration
const config = {
  campaignId: '30ea55e5-cf99-4f21-a577-5c304b0c61e2',
  referralCode: 'GdRZnMyLGCrT', // your referral code
  privyAppId: 'clphlvsh3034xjw0fvs59mrdc'
};

// Read wallets from a file
function loadWalletsData() {
  const walletsData = fs.readFileSync('wallet.json', 'utf8');
  return JSON.parse(walletsData);
}

// Write wallets data to the file
function saveWalletsData(wallets) {
  fs.writeFileSync('walletsData.json', JSON.stringify(wallets, null, 2));
}

// Get the wallets data
let wallets = loadWalletsData();

const getBaseHeaders = (additionalHeaders = {}) => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'origin': 'https://ofc.onefootball.com',
  'referer': 'https://ofc.onefootball.com/',
  'privy-app-id': config.privyAppId,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ...additionalHeaders
});

async function authenticate(walletIndex) {
  const walletData = wallets[walletIndex];
  const { privateKey, address } = walletData;

  try {
    console.log(`Processing wallet ${walletIndex + 1}/${wallets.length}`);

    const { data: { nonce } } = await axios.post(
      'https://auth.privy.io/api/v1/siwe/init',
      { address: address },
      {
        headers: getBaseHeaders({
          'privy-ca-id': '14435a4b-d7fe-4f46-ac46-41d5e7f0d10b',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );
    
    console.log('Nonce received:', nonce);

    const wallet = new ethers.Wallet(privateKey);
    const message = `ofc.onefootball.com wants you to sign in with your Ethereum account:\n${address}\n\nBy signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.\n\nURI: https://ofc.onefootball.com\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}\nResources:\n- https://privy.io`;
    const signature = await wallet.signMessage(message);

    const { data: authData } = await axios.post(
      'https://auth.privy.io/api/v1/siwe/authenticate',
      {
        chainId: 'eip155:1',
        connectorType: 'injected',
        message,
        signature,
        walletClientType: 'metamask',
      },
      { 
        headers: getBaseHeaders({
          'privy-ca-id': '14435a4b-d7fe-4f46-ac46-41d5e7f0d10b',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );

    const { token: authToken, identity_token: privyIdToken } = authData;
    console.log('Auth tokens received');

    await axios.post(
      'https://auth.privy.io/api/v1/users/me/accept_terms',
      {},
      {
        headers: getBaseHeaders({
          'authorization': `Bearer ${authToken}`,
          'privy-ca-id': '5b4cd1f9-1285-4dda-9b01-d248d0bdec68',
          'privy-client': 'react-auth:1.80.0-beta-20240821191745'
        })
      }
    );

    const { data: { data: { userLogin: deToken } } } = await axios.post(
      'https://api.deform.cc/',
      {
        operationName: 'UserLogin',
        variables: { data: { externalAuthToken: authToken } },
        query: 'mutation UserLogin($data: UserLoginInput!) { userLogin(data: $data) }'
      },
      { 
        headers: getBaseHeaders({
          'x-apollo-operation-name': 'UserLogin'
        })
      }
    );

    console.log('Deform token received');

    const verifyActivityHeaders = getBaseHeaders({
      'authorization': `Bearer ${deToken}`,
      'privy-id-token': privyIdToken,
      'x-apollo-operation-name': 'VerifyActivity'
    });

    await Promise.all([
      axios.post('https://api.deform.cc/', {
        operationName: 'VerifyActivity',
        variables: {
          data: {
            activityId: '14f59386-4b62-4178-9cd0-cc3a8feb1773',
            metadata: { referralCode: config.referralCode }
          }
        },
        query: 'mutation VerifyActivity($data: VerifyActivityInput!) { verifyActivity(data: $data) { record { id status } } }'
      }, { headers: verifyActivityHeaders }),

      axios.post('https://api.deform.cc/', {
        operationName: 'VerifyActivity',
        variables: {
          data: { activityId: 'c326c0bb-0f42-4ab7-8c5e-4a648259b807' }
        },
        query: 'mutation VerifyActivity($data: VerifyActivityInput!) { verifyActivity(data: $data) { record { id status } } }'
      }, { headers: verifyActivityHeaders })
    ]);

    console.log(`Authentication and verification completed successfully for wallet ${walletIndex + 1}`);

    // Remove the processed wallet from the array and save the updated list
    wallets.splice(walletIndex, 1);
    saveWalletsData(wallets);

    console.log(`Wallet ${address} processed and removed from the list.`);
    console.log('Wallet list updated:', wallets);

  } catch (error) {
    if (error.response?.status === 429) {
      console.error(`Error for wallet ${walletIndex + 1}: Too Many Requests`);
      console.log('Waiting for 60 seconds before retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Retry the same wallet
      await authenticate(walletIndex);
    } else {
      console.error(`Error for wallet ${walletIndex + 1}:`, error.response?.data || error.message);
    }
  }
}

async function startProcess() {
  while (wallets.length > 0) {
    await authenticate(0); // Always process the first wallet in the list (the next one)
    console.log('Waiting for 60 seconds before next request...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.log('All wallets processed.');
}

startProcess();
