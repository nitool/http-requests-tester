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

const parser = new Parser(pipeline)

beforeEach(() => {
    pipeline.clear()
})

test('single test case without body and headers', () => {
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
})

