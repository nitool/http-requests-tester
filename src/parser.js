const fs = require('fs')
const path = require('path')

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
    isTestsSectionFile: line => /^> ([0-9A-Za-z\/_.\-]*)$/.test(line.trim()),
    isTestCaseNameLine: line => /^([/]{2}|[#]{1,3})(\s+)?\w/.test(line),
    isNoLogLine: line => /^([/]{2}|[#]{1,3})(\s+)?(@no-log)/.test(line),
    isNoRedirectLine: line => /^([/]{2}|[#]{1,3})(\s+)?(@no-redirect)/.test(line),
    isTestCaseTargetLine: line => /^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH)\s+/.test(line),
    isTestsSectionContent: (line, parser) => {
        return !/^> \{%$/.test(line.trim())
                && !/^%\}$/.test(line.trim())
            && line.trim().length > 0 
            && parser.section === 'tests'
    },
    isBodySectionFile: line => /^< ([0-9A-Za-z\/_.\-]*)$/.test(line.trim()),
}

class Parser {
    constructor(pipeline) {
        this.pipeline = pipeline
        this.currentTestCase = {}
        this.section = 'url'
        this.subjectFilePath = ''
    }

    setSubject(subjectFilePath) {
        this.subjectFilePath = subjectFilePath
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
            this.currentTestCase.noRedirect = this.currentTestCase.noRedirect ?? false
            this.currentTestCase.noLog = this.currentTestCase.noLog ?? false
            const test = Object.assign({}, this.currentTestCase)
            this.pipeline.push(test, this.subjectFilePath)
            this.currentTestCase = {}
            this.section = 'url'
        }

        if (sectionsQueries.isTestCaseNameLine(line)) {
            this.currentTestCase.name = line.replace(/^([/]{2}|[#]{1,3})(\s+)?/, '').trim()
            return
        }

        if (sectionsQueries.isNoRedirectLine(line)) {
            this.currentTestCase.noRedirect = true
            return
        }

        if (sectionsQueries.isNoLogLine(line)) {
            this.currentTestCase.noLog = true
            return
        }

        if (sectionsQueries.isTestsSectionStart(line)) {
            this.section = 'tests'
            return
        }

        if (sectionsQueries.isTestsSectionFile(line)) {
            const [testFilename] = line.match(/> ([0-9A-Za-z\/_.\-]*)$/).slice(1)
            this.section = 'tests'
            if (!this.currentTestCase.hasOwnProperty('tests')) {
                this.currentTestCase.tests = ''
            }

            let subjectPath = path.resolve(
                path.dirname(this.subjectFilePath),
                testFilename
            )

            this.currentTestCase.tests += fs.readFileSync(subjectPath, {
                encoding: 'utf-8'
            }) + '\n'

            return
        }

        if (sectionsQueries.isBodySectionFile(line)) {
            const [bodyFilename] = line.match(/< ([0-9A-Za-z\/_.\-]*)$/).slice(1)
            this.section = 'body'
            if (!this.currentTestCase.hasOwnProperty('body')) {
                this.currentTestCase.body = []
            }

            let subjectPath = path.resolve(
                path.dirname(this.subjectFilePath),
                bodyFilename
            )

            if (['.txt', '.xml', '.json'].indexOf(path.extname(subjectPath)) > -1) {
                this.currentTestCase.body.push(fs.readFileSync(subjectPath, {
                    encoding: 'utf-8'
                }))
            } else {
                this.currentTestCase.body.push(Buffer.concat([
                    fs.readFileSync(subjectPath),
                    Buffer.from('\n', 'utf-8')
                ]))
            }

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
                this.currentTestCase.body = []
            }

            this.currentTestCase.body.push(line.trim() + '\n')
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
            this.currentTestCase.noRedirect = this.currentTestCase.noRedirect ?? false
            this.currentTestCase.noLog = this.currentTestCase.noLog ?? false
            this.pipeline.push(this.currentTestCase, this.subjectFilePath)
        }

        this.currentTestCase = {}
    }
}

module.exports = {
    Parser
}
