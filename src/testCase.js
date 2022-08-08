const http = require('http')
const https = require('https')
const vm = require('vm')
const qs = require('qs')
const { ResponseHeaders } = require('./client')

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

    makeSearchParams(body) {
        let newBody
        try {
            newBody = JSON.parse(body)
        } catch (e) {
            newBody = encodeURIComponent(body)
        }

        if (typeof newBody !== 'object') {
            return newBody
        }

        return qs.stringify(newBody)
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
                let body = this.pipeline.context.applyClientVariable(this.config.body.join('').replace(/\s+/g, ''))
                let searchParams = this.makeSearchParams(body)
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
            let that = this
            try {
                parsedBody = this.config.body.map(data => {
                    if (typeof data === 'object') {
                        return data
                    }

                    return that.pipeline.context.applyClientVariable(data)
                })
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

            parsedBody = parsedBody.map(data => {
                if (typeof data === 'object') {
                    return data
                }
                
                return Buffer.from(data, 'utf-8')
            })

            req.write(Buffer.concat(parsedBody))
        }

        req.end()
    }

    createRequestPromise(subject) {
        const that = this
        return new Promise((resolve, reject) => {
            const resolveDecorator = data => {
                resolve({
                    response: data,
                    subject: subject
                })
            }

            that.makeRequest(resolveDecorator, reject)
        })
    }

    manageTestOutput(output) {
        this.pipeline.assertionsCount += output.test.assertions.length
        const testSucceded = output.test.assertions
            .map((element) => element.assertion.valid)
            .reduce((a, b) => {
                return a && b
            })

        if (testSucceded) {
            this.pipeline.output.current.printDot()
        } else {
            this.pipeline.output.current.printFailed()
            this.pipeline.failedTestsCount++
            this.pipeline.output.logs.saveFailedAssertionsToFile({
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
                this.pipeline.output.logs.saveLogToFile({
                    test: this.config,
                    output: output
                })

                continue
            } else if (typeof output.test === 'undefined') {
                continue
            }

            if (typeof output.test.error !== 'undefined') {
                this.pipeline.output.current.printError()
                this.pipeline.errorsCount++
                this.pipeline.output.logs.saveErrorToFile({
                    test: this.config,
                    output: output
                })
            } else {
                this.manageTestOutput(output)
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

module.exports = { TestCase }

