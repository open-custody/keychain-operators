# syntax=docker/dockerfile:1

FROM node:20-slim as blockchain-lib
WORKDIR /build
COPY . .
RUN rm -rf packages
COPY ./packages/blockchain-library packages/blockchain-library
COPY ./packages/wardenprotocol-client packages/wardenprotocol-client
COPY ./packages/utils-library packages/utils-library
RUN apt-get -y update && apt-get -y install git && apt-get clean
RUN git submodule init
RUN git submodule update
RUN yarn install --frozen-lockfile
RUN yarn build-warden
RUN yarn build:blockchain-lib
RUN rm -rf packages/*/src packages/*/node_modules packages/*/tsconfig*

FROM node:20-slim as base
WORKDIR /app
COPY ./yarn.lock yarn.lock
COPY ./package.json package.json
COPY ./tsconfig.json tsconfig.json

FROM base as libs
COPY ./packages/fordefi-library packages/fordefi-library
COPY ./packages/message-broker-library packages/message-broker-library
COPY ./packages/utils-library packages/utils-library
RUN yarn install --frozen-lockfile
RUN yarn build:libs
RUN rm -rf packages/*/src packages/*/node_modules packages/*/tsconfig*

FROM base AS blockchain-listener
COPY ./packages/blockchain-listener packages/blockchain-listener
COPY --from=blockchain-lib ["/build/packages", "./packages"]
COPY --from=libs ["/app/packages", "./packages"]
RUN yarn install --frozen-lockfile
RUN yarn build:blockchain-listener
RUN rm -rf packages/*/src packages/*/node_modules packages/*/tsconfig*
CMD ["yarn", "blockchain-listener"]

FROM base AS message-handler
COPY ./packages/message-handler packages/message-handler
COPY --from=blockchain-lib ["/build/packages", "./packages"]
COPY --from=libs ["/app/packages", "./packages"]
RUN yarn install --frozen-lockfile
RUN yarn build:message-handler
RUN rm -rf packages/*/src packages/*/node_modules packages/*/tsconfig*
CMD ["yarn", "message-handler"]

FROM base AS webhooks
COPY ./packages/webhooks packages/webhooks
COPY --from=libs ["/app/packages", "./packages"]
RUN yarn install --frozen-lockfile
RUN yarn build:webhooks
RUN rm -rf packages/*/src packages/*/node_modules packages/*/tsconfig*
CMD ["yarn", "webhooks"]
