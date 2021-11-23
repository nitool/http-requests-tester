const { format } = require('util')
const fs = require('fs')
const path = require('path')
const os = require('os')
const dotsMaxColumns = Math.floor(process.stdout.columns * 0.4)

class OutputManager {
    constructor() {
        this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-tester'))
        this.errorFile = 'output_logs'
        this.dotsColumn = 0
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

    async saveFailedAssertionsToFile(input) {
        let name = input.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', input.test.method, input.test.uri)
        }

        fs.appendFileSync(
            path.join(this.tmpDir, this.errorFile),
            `${name} - ${input.output.test.name}\n`
        )

        for (const element of input.output.test.assertions) {
            if (element.assertion.valid) {
                continue
            }

            fs.appendFileSync(
                path.join(this.tmpDir, this.errorFile),
                element.assertion.message + '\n'
            )
        }

        fs.appendFileSync(path.join(this.tmpDir, this.errorFile), '\n')
    }

    async saveErrorToFile(input) {
        let name = input.test.name
        if (typeof name === 'undefined') {
            name = format('%s %s', input.test.method, input.test.uri)
        }

        fs.appendFileSync(
            path.join(this.tmpDir, this.errorFile),
            `${name} - ${input.output.test.name}\n`
        )

        fs.appendFileSync(
            path.join(this.tmpDir, this.errorFile),
            input.output.test.error.message + '\n'
        )

        fs.appendFileSync(path.join(this.tmpDir, this.errorFile), '\n')
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
        try {
            fs.accessSync(path.join(this.tmpDir, this.errorFile), fs.constants.R_OK)
            process.stdout.write(fs.readFileSync(path.join(this.tmpDir, this.errorFile), {
                encoding: 'utf-8'
            }))

            fs.unlinkSync(path.join(this.tmpDir, this.errorFile))
        } catch (error) {}

        fs.rmSync(this.tmpDir, {
            recursive: true,
            force: true
        })

        this.dotsColumn = 0
    }
}

module.exports = { OutputManager }
