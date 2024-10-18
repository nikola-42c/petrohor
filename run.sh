#!/bin/bash

node code/src_fetcher.js # creates contracts_ast and contracts_src
node code/bytecode_fetcher.js # since it's a different API call, creates contracts_bytecode
node index.js