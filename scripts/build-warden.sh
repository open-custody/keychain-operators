#!/bin/sh
set -x

(cd ./external/wardenprotocol && make build-wardend)
(cd ./external/wardenprotocol/ts-client && npm install)
yarn workspace @warden/wardenprotocol-client build
