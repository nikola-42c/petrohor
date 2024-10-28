# Verified Solidity Contracts Fetcherer and Analyzer

Also fetches the contract source code, makes AST from the fetched source code, and fetches the bytecode.

All the fetched files are in the form of _contract name_\__contract address_.

Code to fetch contracts, their source code, bytecode and transactions, from Etherscan based on their address.

Can also perform some basic statistics on the fetched resources.

Currently addresses can only be read from the CSV file you can find [here](https://etherscan.io/exportData?type=open-source-contract-codes).

## Requirements

- node
- python3

## Setup

Run:

```sh
npm install
```

Download [the CSV](https://etherscan.io/exportData?type=open-source-contract-codes) and save it as `contracts.csv` in the root of directory.

Make sure you have a valid Etherscan API key and you save it to the `.env` file as `ETHERSCAN_API_KEY` as well as `ALCHEMY_API_KEY`.

## Usage

Fetching resources (requires `ALCHEMY_API_KEY` and `ETHERSCAN_API_KEY` ):

```sh
chmod +x fetch.sh && ./fetch.sh
```

There are three fetching scripts that make 4 API calls per second (the rate limit of Etherscan API free tier is up to 5).

After all the fetching is done, three directories should appear:

- contracts_ast
- contracts_src
- contracts_bytecode
- contracts_txs

You can use these to verify the results. Especially the source code.

After the contacts have been fetched you can run:

```sh
chmod +x collect_stats.sh && ./collect_stats.sh
```

This will:

1.  count the number of nested branch levels per contract (`if`, `else`, `require`, `assert`, `ternary`)
2.  count the number of nested loop levels per contract (`for`, `while`, `do-while`)
3.  count the combined nested levels of all of the above
4.  count the number of `SSTORE` opcodes per contract bytecode

**Limitations: cannot account for nested function calls which may have nested branches and loops.**

The output for each and every analyzed contracts will be stored in:

- branching_output.csv
- for_loop_output.csv
- loop_branch_output.csv
- sstore_output.csv

To visualize the `SSTORE` histogram run:

```sh
python3 plot_sstore_counts.py
```
