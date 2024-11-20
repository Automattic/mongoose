#!/bin/bash
set -o errexit  # Exit the script with error if any of the commands fail

cd ${DRIVERS_TOOLS}/.evergreen/csfle
. ./prepare-kmsvenv.sh

echo "$PYTHON_EXEC"

$PYTHON_EXEC -u kms_http_server.py --ca_file ../x509gen/ca.pem --cert_file ../x509gen/expired.pem --port 8000 &
$PYTHON_EXEC -u kms_http_server.py --ca_file ../x509gen/ca.pem --cert_file ../x509gen/wrong-host.pem --port 8001 &
$PYTHON_EXEC -u kms_http_server.py --ca_file ../x509gen/ca.pem --cert_file ../x509gen/server.pem --port 8002 --require_client_cert &