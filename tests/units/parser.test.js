const { Parser } = require('../../src/parser')
const pipeline = new class {
    constructor() {
        this.tests = []
    }

    push(test) {
        this.tests.push(test)
    }

    clear() {
        this.tests = []
    }
}

beforeEach(() => {
    pipeline.clear()
})

test('two test cases without body and headers', () => {
    const parser = new Parser(pipeline)
    const lines = `# Test
GET http://httpbin.org/status/200

### 

GET http://httpbin.org/status/400
    `.split('\n')

    lines.forEach(line => {
        parser.processLine(line)
    })

    parser.onClose()
    expect(pipeline.tests).toHaveLength(2)
    expect(pipeline.tests[0].uri).toBe('http://httpbin.org/status/200')
    expect(pipeline.tests[1].uri).toBe('http://httpbin.org/status/400')
    expect(pipeline.tests[0].method).toBe('GET')
    expect(pipeline.tests[1].method).toBe('GET')
})

test('single test case with single header, json body and one test', () => {
    const parser = new Parser(pipeline)
    const lines = `### Example test
POST http://httpbin.org/status/200
Content-Type: application/json

{
    "exampleField": 10
}

> {%
    client.assert(response.body.exampleField === 10, 'exampleField')
%}
`.split('\n')

    lines.forEach(line => {
        parser.processLine(line)
    })

    parser.onClose()
    expect(pipeline.tests).toHaveLength(1)
    const testCase = pipeline.tests[0]
    expect(testCase.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(testCase.body)).toHaveProperty('exampleField')
    expect(JSON.parse(testCase.body).exampleField).toBe(10)
    expect(testCase.tests).toContain("client.assert(response.body.exampleField === 10, 'exampleField')")
})

// todo: write more test cases

