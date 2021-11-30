const { Client } = require('./client')
const { Context } = require('./context')
const { Output } = require('./output')
const { TestCase } = require('./testCase')

class TestPipeline {
    constructor(config, options) {
        this.config = config
        this.options = options
        this.failedTestsCount = 0
        this.errorsCount = 0
        this.assertionsCount = 0
        this.initialPromise = new Promise(resolve => resolve())
        this.output = new Output()
        this.finishWithError = false
        this.context = new Context(new Client())
        this.context.setClientConfig(config)
    }

    push(test, subject) {
        const testCase = new TestCase(test, this)
        this.initialPromise = this.initialPromise
            .then(() => testCase.createRequestPromise(subject))
            .then(({ response, subject }) => {
                testCase.testResponse(response)

                return {
                    response: null,
                    subject: subject
                }
            })
    }

    cleanup(subject) {
        process.stdout.write('\n\n')
        this.output.summary.pushSummary(
            subject,
            this.assertionsCount,
            this.failedTestsCount,
            this.errorsCount
        )

        this.output.purge()
        this.output.summary.outputSummaryForFile(subject)

        process.stdout.write('\n')
        this.finishWithError = this.finishWithError 
            || this.failedTestsCount > 0 
            || this.errorsCount > 0

        this.failedTestsCount = 0
        this.errorsCount = 0
        this.assertionsCount = 0
    }

    startNewTest() {
        const that = this
        this.initialPromise.then(({ subject }) => {
            that.cleanup(subject)

            return {
                response: null,
                subject: subject
            }
        })
    }

    finish() {
        const that = this
        this.initialPromise.then(({ subject }) => {
            that.cleanup(subject)
            if (Object.keys(that.output.summary.summaries).length > 1) {
                that.output.summary.outputAllSummaries()
            }

            process.exit(that.finishWithError)
        })
    }
}

module.exports = { TestPipeline }

