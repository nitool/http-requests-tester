const { Client } = require('./client')
const { Context } = require('./context')
const { OutputManager } = require('./outputManager')
const { TestCase } = require('./testCase')

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

module.exports = { TestPipeline }

