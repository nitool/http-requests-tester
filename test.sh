#!/bin/bash

node web-test --selected-client test --client-file rest-client.env.json ./tests/test_case_with_variables.http
node web-test ./tests/test_case_with_variables.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_flow.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_without_headers.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_with_external_script.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_with_dynamic.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_with_body_from_file.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_with_form_data.http --selected-client test --client-file rest-client.env.json
node web-test ./tests/test_case_heavy.http --selected-client test --client-file rest-client.env.json

