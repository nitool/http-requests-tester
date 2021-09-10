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

class Client 
{
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

module.exports = {Client}

