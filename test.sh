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
node http-requests-tester ./tests/functional/test_case_with_dynamic.http --verbose --autolog-response --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_with_body_from_file.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_with_form_data.http --selected-client test --client-file rest-client.env.json
node http-requests-tester ./tests/functional/test_case_annotations.http --selected-client test --client-file rest-client.env.json
node http-requests-tester --selected-client test ./tests/functional/test_case_flow.http ./tests/functional/test_case_flow_2.http
node http-requests-tester --selected-client test ./tests/functional/test_case_with_errors.http
node http-requests-tester --selected-client test ./tests/functional/test_with_get_parameters.http
node http-requests-tester --selected-client test ./tests/functional/test_with_get_parameters.http -- <<-EOF
### Testowa nazwa drugiego requestu
GET http://{{host}}/anything/{anything}
Accept: application/json

{
    "filters": {
        "status": ["example1", "example2"],
        "cod": {
            "currency": "PLN",
            "amount": 100
        }
    },
    "type": ["test"]
}

> {%
    client.test('rzeczywisty test, ma zwracać 200', function () {
        let expectedBody = '{"filters[cod][amount]":"100","filters[cod][currency]":"PLN","filters[status][0]":"example1","filters[status][1]":"example2","type[0]":"test"}'
        client.assert(response.status === 200, 'kod nie jest 200')
        client.assert(response.contentType.mimeType === 'application/json', 'missing mime type')
        client.assert(JSON.stringify(response.body.args) === expectedBody, 'expects correct query string')
    })
%} 
EOF

