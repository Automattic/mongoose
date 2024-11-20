#! /usr/bin/env bash

# This is a thin wrapper around drivers-tools run orchestration meant to print each of the configuration settings we make use of
# Additionally it ensures the downloaded binaries are in the PATH for the script to find (namely, the legacy shell for server set up)

export MONGODB_VERSION=${VERSION}
echo  "MONGODB_VERSION=${VERSION}"

export TOPOLOGY=${TOPOLOGY}
echo  "TOPOLOGY=${TOPOLOGY}"

export AUTH=${AUTH}
echo  "AUTH=${AUTH}"

export SSL=${SSL}
echo  "SSL=${SSL}"

export ORCHESTRATION_FILE=${ORCHESTRATION_FILE}
echo  "ORCHESTRATION_FILE=${ORCHESTRATION_FILE}"

export REQUIRE_API_VERSION=${REQUIRE_API_VERSION}
echo  "REQUIRE_API_VERSION=${REQUIRE_API_VERSION}"

export LOAD_BALANCER=${LOAD_BALANCER}
echo  "LOAD_BALANCER=${LOAD_BALANCER}"

export COMPRESSOR=${COMPRESSOR}
echo  "COMPRESSOR=${COMPRESSOR}"

export PATH="$MONGODB_BINARIES:$PATH"
echo  "MONGODB_BINARIES=${MONGODB_BINARIES}"

export SKIP_LEGACY_SHELL="true"
echo  "SKIP_LEGACY_SHELL=${SKIP_LEGACY_SHELL}"

bash "${DRIVERS_TOOLS}/.evergreen/run-orchestration.sh"