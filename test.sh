#!/bin/bash

npm run test
if [[ $? -gt 0 ]]; then
    exit 1
fi

node http-requests-tester --selected-client test --client-file rest-client.env.json ./tests/functional/test_case_with_variables.http
node http-requests-tester ./tests/functional/test_case_with_variables.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_flow.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_without_headers.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_with_external_script.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_with_dynamic.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_with_body_from_file.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_with_form_data.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_annotations.http --selected-client test --client-file rest-client.env.json
node http-requests-tester --selected-client test ./tests/functional/test_case_flow.http ./tests/functional/test_case_flow_2.http
node http-requests-tester --selected-client test ./tests/functional/test_case_with_errors.http

