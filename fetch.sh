#!/bin/bash

cd code
node src_fetcher.js # creates contracts_ast and contracts_src
node bytecode_fetcher.js # creates contracts_bytecode
node transaction_fetcher.js # creates contracts_txs