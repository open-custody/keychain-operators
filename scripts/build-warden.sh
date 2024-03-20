#!/bin/sh
set -x

pwd

(cd ./external/wardenprotocol && make build-wardend)
(cd ./external/wardenprotocol/ts-client && yarn install)
yarn workspace @warden/wardenprotocol-client build
