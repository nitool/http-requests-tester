const http = require('http')
const https = require('https')
const vm = require('vm')
const { Client, ResponseHeaders } = require('./client')
const { Context } = require('./context')
const { OutputManager } = require('./outputManager')
const dotsMaxColumns = Math.floor(process.stdout.columns * 0.4)
let dotsColumn = 0

const createContentTypeObject = contentType => {
    const mimeType = contentType.split(';')[0]
    const charsetMatches = contentType.match(/charset=(.*?)(\s|$)/)
    const charset = charsetMatches !== null && charsetMatches.hasOwnProperty(1) 
        ? charsetMatches[1] 
        : ''

    return {
        mimeType: mimeType,
        charset: charset.toUpperCase()
    }
}

class TestCase {
    constructor(config, pipeline) {
        this.config = config
        this.pipeline = pipeline
    }

    getParsedHeaders() {
        let parsedHeaders = {}
        for (const header in this.config.headers) {
            if (!this.config.headers.hasOwnProperty(header)) {
                continue
            }

            if (header.toLowerCase() === 'content-type' 
                && this.config.method === 'GET'
            ) {
                continue;
            }

            parsedHeaders[header] = this.pipeline.context.applyClientVariable(this.config.headers[header])
        }

        return parsedHeaders
    }

    makeRequest(resolve, reject, configOverride) {
        if (typeof configOverride === 'undefined') {
            configOverride = {}
        }

        const that = this
        let parsedHeaders = {}
        try {
            parsedHeaders = this.getParsedHeaders()
        } catch (error) {
            this.config.tests = undefined
            this.pipeline.context.getVmContext().client.output.push({
                test: {
                    name: 'undefined variable',
                    error: error,
                }
            })

            resolve({
                contentType: null,
                status: null,
                body: null,
                headers: new ResponseHeaders([])
            })

            return
        }

        let options = {
            method: this.config.method,
            headers: parsedHeaders,
        }

        let uri
        try {
            let uriString
            if (typeof configOverride.url !== 'undefined') {
                uriString = this.pipeline.context.applyClientVariable(configOverride.url)
            } else {
                uriString = this.pipeline.context.applyClientVariable(this.config.uri)
            }

            if (typeof this.config.body !== 'undefined'
                && this.config.method === 'GET'
            ) {
                let searchParams
                let body = this.pipeline.context.applyClientVariable(this.config.body.replace(/[\n]/g, ''))
                try {
                    searchParams = new URLSearchParams(JSON.parse(body))
                } catch (e) {
                    searchParams = new URLSearchParams(body)
                }

                const separator = uriString.indexOf('?') > -1 ? '&' : '?';
                uri = new URL(uriString + separator + searchParams.toString())
            } else {
                uri = new URL(uriString)
            }
        } catch (error) {
            this.config.tests = undefined
            this.pipeline.context.getVmContext().client.output.push({
                test: {
                    name: 'undefined variable',
                    error: error,
                }
            })

            resolve({
                contentType: null,
                status: null,
                body: null,
                headers: new ResponseHeaders([])
            })
            
            return
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
                if (!this.config.noRedirect 
                    && (res.statusCode === 301 || res.statusCode === 302)
                ) {
                    that.makeRequest(resolve, reject, {
                        url: res.headers.location
                    })

                    return
                }

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
                        headers: new ResponseHeaders(res.headers)
                    })
                })
            })

        req.on('error', reject)
        if (typeof this.config.body !== 'undefined'
            && this.config.method !== 'GET'
        ) {
            let parsedBody
            try {
                parsedBody = this.pipeline.context.applyClientVariable(this.config.body).split('\n')
            } catch (error) {
                this.config.tests = undefined
                this.pipeline.context.getVmContext().client.output.push({
                    test: {
                        name: 'undefined variable',
                        error: error,
                    }
                })

                resolve({
                    contentType: null,
                    status: null,
                    body: null,
                    headers: new ResponseHeaders([])
                })
                
                return
            }

            parsedBody.splice(-1)
            for (let i = parsedBody.length - 1; i >= 0; i--) {
                if (parsedBody[i] === '') {
                    parsedBody.splice(i, 1)
                    continue
                }

                break
            }

            req.write(parsedBody.join('\n'))
        }

        req.end()
    }

    createRequestPromise() {
        return new Promise(this.makeRequest.bind(this))
    }

    manageTestOutput(output) {
        this.pipeline.assertionsCount += output.test.assertions.length
        const testSucceded = output.test.assertions
            .map((element) => element.assertion.valid)
            .reduce((a, b) => {
                return a && b
            })

        if (testSucceded) {
            process.stdout.write('.')
        } else {
            process.stdout.write('F')
            this.pipeline.failedTestsCount++
            this.pipeline.outputManager.saveFailedAssertionsToFile({
                test: this.config,
                output: output
            })
        }
    }

    manageClientOutput(clientOutput) {
        for (const output of clientOutput) {
            if (typeof output.test === 'undefined'
                && this.pipeline.options.verbose
            ) {
                this.pipeline.outputManager.saveLogToFile({
                    test: this.config,
                    output: output
                })

                continue
            } else if (typeof output.test === 'undefined') {
                continue
            }

            if (typeof output.test.error !== 'undefined') {
                process.stdout.write('E')
                this.pipeline.errorsCount++
                this.pipeline.outputManager.saveErrorToFile({
                    test: this.config,
                    output: output
                })
            } else {
                this.manageTestOutput(output)
            }

            dotsColumn++
            if (dotsColumn === dotsMaxColumns) {
                dotsColumn = 0
                process.stdout.write('\n')
            }
        }
    }

    testResponse(response) {
        this.pipeline.context.getVmContext().response = response
        if (typeof this.config.tests !== 'undefined') {
            vm.runInContext(this.config.tests, this.pipeline.context.getVmContext())
        }

        this.manageClientOutput(this.pipeline.context.getVmContext().client.output)
        this.pipeline.context.getVmContext().client.output = []
    }

}

class TestPipeline {
    constructor(config, options) {
        this.config = config
        this.options = options
        this.failedTestsCount = 0
        this.errorsCount = 0
        this.assertionsCount = 0
        this.initialPromise = new Promise(resolve => resolve())
        this.outputManager = new OutputManager()
        this.finishWithError = false
        this.context = new Context(new Client())
        this.context.setClientConfig(config)
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

    cleanup() {
        process.stdout.write('\n\n')
        this.outputManager.purge()

        process.stdout.write(`Assertions: ${this.assertionsCount}`)

        if (this.failedTestsCount > 0) {
            process.stdout.write(` | Failed tests: ${this.failedTestsCount}`)
        } 

        if (this.errorsCount > 0) {
            process.stdout.write(` | Errors: ${this.errorsCount}\n`)
        } else {
            process.stdout.write('\n')
        }

        process.stdout.write('\n')
        this.finishWithError = this.finishWithError 
            || this.failedTestsCount > 0 
            || this.errorsCount > 0

        this.failedTestsCount = 0
        this.errorsCount = 0
        this.assertionsCount = 0
        this.outputManager = new OutputManager()
    }

    startNewTest() {
        const that = this
        this.initialPromise.then(() => that.cleanup())
    }

    finish() {
        const that = this
        this.initialPromise.finally(() => {
            that.cleanup()
            process.exit(that.finishWithError)
        })
    }
}

module.exports = {
    TestPipeline
}
