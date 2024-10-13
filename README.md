# Verified Solidity Contracts Fetcher + Loop analyzer

![Architecture overview](images/architecture.png)

Code to fetch contracts from Etherscan based on their address and count the loops, as well as nested loop levels, in the fetched contracts.

Currently addresses can only be read from the CSV file you can find [here](https://etherscan.io/exportData?type=open-source-contract-codes).

## Requirements

- NodeJS

## Setup

Run:

```sh
npm install
```

Download [the CSV](https://etherscan.io/exportData?type=open-source-contract-codes) and save it as `contracts.csv` in the root of directory.

Make sure you have a valid Etherscan API key and you save it to the `.env` file as `ETHERSCAN_API_KEY`.

## Usage

Automated:

```sh
chmod +x run.sh && ./run.sh
```

Or manually:

Fetch the contracts from the Etherscan a few times using:

```sh
node code/fetcher.js
```

Two directories should appear:

- contracts_ast
- contracts_src

You can use these to verify the loop count result. Especially the source code.

In order to count the loops run:

```sh
node index.js
```

This will read the contract ASTs from `contract-asts` and count the loops.

# More statistics are TBD.
