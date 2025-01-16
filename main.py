import json

# Input file names
wallet_file = 'wallet.txt'
privatekey_file = 'privatekey.txt'
output_file = 'wallet.json'

# Read wallet addresses
with open(wallet_file, 'r') as w_file:
    wallets = w_file.read().splitlines()

# Read private keys
with open(privatekey_file, 'r') as pk_file:
    private_keys = pk_file.read().splitlines()

# Check if both files have the same number of lines
if len(wallets) != len(private_keys):
    print("Error: The number of wallet addresses and private keys does not match.")
    exit()

# Combine into a list of dictionaries
wallet_data = [
    {"privateKey": pk, "address": wallet}
    for pk, wallet in zip(private_keys, wallets)
]

# Write to the output JSON file
with open(output_file, 'w') as out_file:
    json.dump(wallet_data, out_file, indent=2)

print(f"Data successfully converted to {output_file}")
