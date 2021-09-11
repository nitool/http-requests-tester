class Globals {
    constructor() {
        this.storage = {}
    }

    set(name, value) {
        this.storage[name] = value
    }

    get(name) {
        return this.storage[name]
    }

    isEmpty() {
        return Object.keys(this.storage).length === 0
    }

    clear(name) {
        delete this.storage[name]
    }

    clearAll() {
        this.storage = {}
    }
}

class Client {
    constructor() {
        this.global = new Globals()
        this.currentTest = null
        this.output = []
    }

    test(name, callback) {
        this.currentTest = name
        callback()
        this.currentTest = null
    }

    assert(check, errorMessage) {
        if (this.currentTest === null) {
            throw new Error('All assertions should be wrapped by test.')
        }

        this.output.push({
            assertion: {
                name: this.currentTest,
                valid: check,
                message: check ? null : errorMessage
            }
        })
    }

    log(text) {
        this.output.push({
            log: {
                message: text
            }
        })
    }
}

class ResponseHeaders {
    constructor(headers) {
        this.headers = {}
        for (let name in headers) {
            name = name.toLowerCase()
            if (!headers.hasOwnProperty(name)) {
                continue
            }

            if (!this.headers.hasOwnProperty(name)) {
                this.headers[name] = []
            }

            if (Array.isArray(headers[name])) {
                this.headers[name].concat(headers[name])
            } else {
                this.headers[name].push(headers[name])
            }
        }
    }

    valueOf(headerName) {
        const values = this.valuesOf(headerName)
        if (values.length > 0) {
            return values[0]
        }

        return null
    }

    valuesOf(headerName) {
        headerName = headerName.toLowerCase()
        if (this.headers.hasOwnProperty(headerName)) {
            return this.headers[headerName]
        }

        return []
    }
}

module.exports = {Client, ResponseHeaders}

