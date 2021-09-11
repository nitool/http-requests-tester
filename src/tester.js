const { format } = require('util')
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')
const https = require('https')
const vm = require('vm')
const { Client } = require('./client')
const { uuidV4 } = require('./utils')
const context = vm.createContext({
    client: new Client(),
    console: undefined,
    window: undefined
})

const dotsMaxColumns = Math.floor(process.stdout.columns * 0.4)
let client = {}
let dotsColumn = 0

const applyClientVariable = text => {
    const matches = text.match(/({{(\s+)?[$0-9A-Za-z\-_]+(\s+)?}})/g)
    if (matches === null) {
        return text
    }

    context.client.global.set('$uuid', uuidV4())
    context.client.global.set('$timestamp', Math.floor(Date.now() / 1000))
    context.client.global.set('$randomInt', Math.floor(Math.random() * 1000))
    for (const variablePattern of matches) {
        const variable = variablePattern.replace(/[{}]/g, '').trim()
        let value;
        if (typeof context.client.global.get(variable) !== 'undefined') {
            value = context.client.global.get(variable)
        } else {
            value = client[variable]
        }

        if (typeof value === 'undefined') {
            throw new Error(format('missing variable %s', variable))
        }

        text = text.replace(variablePattern, value)
    }

    return text
}

class OutputManager {
    constructor() {
        this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-tester'))
        this.errorFile = 'output_logs'
    }

    async saveLogToFile(input) {
        let name = input.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', input.test.method, input.test.uri)
        }

        fs.appendFileSync(
            path.join(this.tmpDir, this.errorFile),
            `${input.output.log.message}\n\n`
        )
    }

    async saveErrorToFile(error) {
        let name = error.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', error.test.method, error.test.uri)
        }

        fs.appendFileSync(
            path.join(this.tmpDir, this.errorFile),
            `${error.output.assertion.name} assertion failed for test ${name}\n`
        )

        fs.appendFileSync(
            path.join(this.tmpDir, this.errorFile),
            error.output.assertion.message + '\n\n'
        )
    }

    purge() {
        try {
            fs.accessSync(path.join(this.tmpDir, this.errorFile), fs.constants.R_OK)
            process.stdout.write(fs.readFileSync(path.join(this.tmpDir, this.errorFile), {
                encoding: 'utf-8'
            }))

            fs.unlinkSync(path.join(this.tmpDir, this.errorFile))
        } catch (error) {}

        fs.rmdirSync(this.tmpDir, {
            recursive: true,
            force: true
        })
    }
}

const createContentTypeObject = contentType => {
    const mimeType = contentType.split(';')[0]
    const charsetMatches = contentType.match(/charset=(.*?)(\s|$)/)
    const charset = charsetMatches !== null && charsetMatches.hasOwnProperty(1) 
        ? charsetMatches[1] 
        : ''

    return {
        mimeType: mimeType,
        charset: charset
    }
}

class TestCase {
    constructor(config, pipeline) {
        this.config = config
        this.pipeline = pipeline
    }

    makeRequest(resolve, reject) {
        let parsedHeaders = {}
        for (const header in this.config.headers) {
            if (!this.config.headers.hasOwnProperty(header)) {
                continue
            }

            parsedHeaders[header] = applyClientVariable(this.config.headers[header])
        }

        let options = {
            method: this.config.method,
            headers: parsedHeaders,
        }

        let uri
        try {
            uri = new URL(applyClientVariable(this.config.uri))
        } catch (e) {
            console.log(this.config)
            throw e
        }

        let module
        if (uri.protocol === 'https:') {
            module = https
            options['agent'] = new https.Agent({
                rejectUnauthorized: false, // todo: dirty hack, fix
            })
        } else {
            module = http
        }

        const req = module.request(
            uri,
            options,
            (res) => {
                let body = ''
                res.on('data', chunk => body += chunk)
                res.on('end', () => {
                    let parsedBody = body
                    let contentType = null
                    if (res.headers.hasOwnProperty('content-type')) {
                        contentType = createContentTypeObject(res.headers['content-type'])
                    }

                    if (contentType !== null 
                        && contentType.mimeType === 'application/json'
                    ) {
                        parsedBody = JSON.parse(body)
                    }

                    if (parsedBody === false) {
                        parsedBody = body
                    }

                    resolve({
                        contentType: contentType,
                        status: res.statusCode,
                        body: parsedBody,
                        headers: res.headers
                    })
                })
            })

        req.on('error', reject)
        if (typeof this.config.body !== 'undefined') {
            let parsedBody = applyClientVariable(this.config.body).split('\n')
            parsedBody.splice(-1)
            for (let i = parsedBody.length - 1; i > 0; i--) {
                if (parsedBody[i] === '') {
                    parsedBody.splice(-1)
                }
            }

            req.write(parsedBody.join('\n'))
        }

        req.end()
    }

    createRequestPromise() {
        return new Promise(this.makeRequest.bind(this))
    }

    manageClientOutput(clientOutput) {
        for (const output of clientOutput) {
            if (typeof output.assertion === 'undefined') {
                this.pipeline.outputManager.saveLogToFile({
                    test: this.config,
                    output: output
                })

                continue
            }

            if (output.assertion.valid) {
                process.stdout.write('.')
            } else {
                process.stdout.write('F')
                this.pipeline.hasErrors = true
                this.pipeline.outputManager.saveErrorToFile({
                    test: this.config,
                    output: output
                })
            }

            dotsColumn++
            if (dotsColumn === dotsMaxColumns) {
                dotsColumn = 0
                process.stdout.write('\n')
            }
        }
    }

    testResponse(response) {
        context.response = response
        if (typeof this.config.tests !== 'undefined') {
            vm.runInContext(this.config.tests, context)
        }

        this.manageClientOutput(context.client.output)
        context.client.output = []
    }

}

class TestPipeline {
    constructor(config) {
        this.config = config
        this.hasErrors = false
        this.initialPromise = new Promise(resolve => resolve())
        this.outputManager = new OutputManager()
        client = config
    }

    push(test) {
        const testCase = new TestCase(test, this)
        this.initialPromise = this.initialPromise
            .then(() => testCase.createRequestPromise())
            .then(response => testCase.testResponse(response))
            .catch(error => {
                console.log(error)
            })
    }

    finish() {
        const that = this
        this.initialPromise.finally(() => {
            process.stdout.write('\n\n')
            that.outputManager.purge()
            process.exit(that.hasErrors)
        })
    }
}

module.exports = {
    TestPipeline
}
