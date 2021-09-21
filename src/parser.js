const fs = require('fs')

const getNextSection = section => {
    const availableSections = [
        'url',
        'headers',
        'body',
    ]

    const currentSection = availableSections.indexOf(section)
    if (currentSection === -1 
        || currentSection + 1 === availableSections.length
    ) {
        return null
    }

    return availableSections[currentSection + 1]
}

const sectionsQueries = {
    isEmptyLine: (line, parser) => {
        return line.trim().length === 0 
            && parser.section !== 'tests'
            && parser.section !== 'body'
    },

    isTestCaseFinishingLine: line => /^###/.test(line.trim()),
    isTestsSectionStart: line => /^> \{%$/.test(line.trim()),
    isTestsSectionFile: line => /> ([0-9A-Za-z\/_.]*)$/.test(line.trim()),
    isTestCaseNameLine: line => /^([/]|[#]{1,3})(\s+)?\w/.test(line),
    isTestCaseTargetLine: line => /^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH)\s+/.test(line),
    isTestsSectionContent: (line, parser) => {
        return !/^> \{%$/.test(line.trim())
                && !/^%\}$/.test(line.trim())
            && line.trim().length > 0 
            && parser.section === 'tests'
    },
    isBodySectionFile: line => /< ([0-9A-Za-z\/_.]*)$/.test(line.trim()),
}

class Parser {
    constructor(pipeline) {
        this.pipeline = pipeline
        this.currentTestCase = {}
        this.section = 'url'
    }

    processLine(line) {
        if (sectionsQueries.isEmptyLine(line, this)) {
            this.section = getNextSection(this.section)
            return
        }

        if (this.section !== 'url' 
            && Object.keys(this.currentTestCase).length > 0
            && sectionsQueries.isTestCaseFinishingLine(line)
        ) {
            const test = Object.assign({}, this.currentTestCase)
            this.pipeline.push(test)
            this.currentTestCase = {}
            this.section = 'url'
        }

        if (sectionsQueries.isTestCaseNameLine(line)) {
            this.currentTestCase.name = line.replace(/^([/]|[#]{1,3})(\s+)?/, '').trim()
            return
        }

        if (sectionsQueries.isTestsSectionStart(line)) {
            this.section = 'tests'
            return
        }

        if (sectionsQueries.isTestsSectionFile(line)) {
            const [testFilename] = line.match(/> ([0-9A-Za-z\/_.]*)$/).slice(1)
            this.section = 'tests'
            if (!this.currentTestCase.hasOwnProperty('tests')) {
                this.currentTestCase.tests = ''
            }

            this.currentTestCase.tests += fs.readFileSync(testFilename, {
                encoding: 'utf-8'
            }) + '\n'

            return
        }

        if (sectionsQueries.isBodySectionFile(line)) {
            const [bodyFilename] = line.match(/< ([0-9A-Za-z\/_.]*)$/).slice(1)
            this.section = 'body'
            if (!this.currentTestCase.hasOwnProperty('body')) {
                this.currentTestCase.body = ''
            }

            this.currentTestCase.body += fs.readFileSync(bodyFilename, {
                encoding: 'utf-8'
            }) + '\n'

            return
        }

        if (this.section === null) {
            return
        }

        if (sectionsQueries.isTestCaseTargetLine(line)) {
            const [method, uri] = [
                line.substring(0, line.indexOf(' ')).trim(),
                line.substring(line.indexOf(' ') + 1).trim()
            ]

            this.currentTestCase.method = method
            this.currentTestCase.uri = uri
            this.section = 'headers' 
            return
        }

        if (this.section === 'headers') {
            const [name, value] = [
                line.substring(0, line.indexOf(':')).trim(),
                line.substring(line.indexOf(':') + 1).trim()
            ]

            if (!this.currentTestCase.hasOwnProperty('headers')) {
                this.currentTestCase.headers = {}
            }

            this.currentTestCase.headers[name] = value
            return
        }

        if (this.section === 'body') {
            if (!this.currentTestCase.hasOwnProperty('body')) {
                this.currentTestCase.body = ''
            }

            this.currentTestCase.body += line.trim() + '\n'
        }

        if (sectionsQueries.isTestsSectionContent(line, this)) {
            if (!this.currentTestCase.hasOwnProperty('tests')) {
                this.currentTestCase.tests = ''
            }

            this.currentTestCase.tests += line.trim() + "\n"
        }
    }

    onClose() {
        if (Object.keys(this.currentTestCase).length > 0) {
            this.pipeline.push(this.currentTestCase)
        }
    }
}

module.exports = {
    Parser
}
