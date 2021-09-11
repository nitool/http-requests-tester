# HTTP requests tester
It's a CLI HTTP tester based on HTTP client and HTTP tests implemented in PHPStorm.

Github repo: https://github.com/nitool/http-requests-tester

NPM package: https://www.npmjs.com/package/http-requests-tester 

## Installation and usage
Install:
```bash
npm install -g http-requests-tester
```

Usage:
```bash
npx http-requests-tester --selected-client clientName --client-file rest-client.env.json test_file.http 
```

Test file example:
```http
# Example test
GET http://httpbin.org/status/200
Accept: text/plain

> {%
    client.test('example test set', function () {
        client.log('example log')
        client.assert(response.status === 200, 'it does not work')
    })
%}
```

## Status:
It works but work is still in progress. Package needs refactor and unit tests.

## Resources: 
- https://www.jetbrains.com/help/phpstorm/exploring-http-syntax.html
- https://www.jetbrains.com/help/phpstorm/http-client-reference.html

## Options:
```
--client-file=path_to_file.json - config file with possible clients
--selected-client='name' - each client file can contain multiple clients, this options is required and selects config to use while making request
--help|-h - shows help message
```

