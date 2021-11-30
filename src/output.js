const { format } = require('util')
const fs = require('fs')
const path = require('path')
const os = require('os')
const dotsMaxColumns = Math.floor(process.stdout.columns * 0.4)

class Logs {
    constructor(output) {
        this.output = output
        this.errorFile = 'output_logs'
    }

    async saveLogToFile(input) {
        let name = input.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', input.test.method, input.test.uri)
        }

        fs.appendFileSync(
            path.join(this.output.tmpDir, this.errorFile),
            `${input.output.log.message}\n\n`
        )
    }

    async saveFailedAssertionsToFile(input) {
        let name = input.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', input.test.method, input.test.uri)
        }

        fs.appendFileSync(
            path.join(this.output.tmpDir, this.errorFile),
            `${name} - ${input.output.test.name}\n`
        )

        for (const element of input.output.test.assertions) {
            if (element.assertion.valid) {
                continue
            }

            fs.appendFileSync(
                path.join(this.output.tmpDir, this.errorFile),
                element.assertion.message + '\n'
            )
        }

        fs.appendFileSync(path.join(this.output.tmpDir, this.errorFile), '\n')
    }

    async saveErrorToFile(input) {
        let name = input.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', input.test.method, input.test.uri)
        }

        fs.appendFileSync(
            path.join(this.output.tmpDir, this.errorFile),
            `${name} - ${input.output.test.name}\n`
        )

        fs.appendFileSync(
            path.join(this.output.tmpDir, this.errorFile),
            input.output.test.error.message + '\n'
        )

        fs.appendFileSync(path.join(this.output.tmpDir, this.errorFile), '\n')
    }

    purge() {
        try {
            fs.accessSync(path.join(this.output.tmpDir, this.errorFile), fs.constants.R_OK)
            process.stdout.write(fs.readFileSync(path.join(this.output.tmpDir, this.errorFile), {
                encoding: 'utf-8'
            }))

            fs.unlinkSync(path.join(this.output.tmpDir, this.errorFile))
        } catch (error) {}

        fs.rmSync(this.output.tmpDir, {
            recursive: true,
            force: true
        })

        this.output.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-tester'))
    }
}

class Current {
    constructor(output) {
        this.output = output
        this.dotsColumn = 0
    }

    print(element) {
        process.stdout.write(element)
        this.dotsColumn++
        if (this.dotsColumn === dotsMaxColumns) {
            this.dotsColumn = 0
            process.stdout.write('\n')
        }
    }

    printDot() {
        this.print('.')
    }

    printError() {
        this.print('E')
    }

    printFailed() {
        this.print('F')
    }

    purge() {
        this.dotsColumn = 0
    }
}

class Summary {
    constructor(output) {
        this.output = output
        this.summaries = {}
    }

    pushSummary(file, assertionsCount, failedTestsCount, errorsCount) {
        this.summaries[file] = {
            assertionsCount: assertionsCount,
            failedTestsCount: failedTestsCount,
            errorsCount: errorsCount
        }
    }

    outputSummaryForFile(file) {
        if (!this.summaries.hasOwnProperty(file)) {
            throw new Error(`Missing summary for ${file}`)
        }

        const summary = this.summaries[file]
        process.stdout.write(`Assertions: ${summary.assertionsCount}`)

        if (summary.failedTestsCount > 0) {
            process.stdout.write(` | Failed tests: ${summary.failedTestsCount}`)
        } 

        if (summary.errorsCount > 0) {
            process.stdout.write(` | Errors: ${summary.errorsCount}\n`)
        } else {
            process.stdout.write('\n')
        }
    }

    outputAllSummaries() {
        process.stdout.write('Summary:\n')
        const columnWidth = Object.keys(this.summaries).map(name => name.length).sort().reverse().splice(0, 1)
        for (let file of Object.keys(this.summaries)) {
            process.stdout.write(`${file.padEnd(columnWidth, ' ')}\t`)
            this.outputSummaryForFile(file)
        }
    }
}

class Output {
    constructor() {
        this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-tester'))
        this.current = new Current(this)
        this.summary = new Summary(this)
        this.logs = new Logs(this)
    }

    purge() {
        this.current.purge()
        this.logs.purge()
    }
}

module.exports = { Output }
