const vm = require('vm')
const { uuidV4 } = require('./utils')
const { format } = require('util')

class Context {
    constructor(client) {
        this.client = client
        this.clientConfig = {}
        this.vmContext = vm.createContext({
            client: this.client,
            console: undefined,
            window: undefined
        })
    }

    applyClientVariable(text) {
        const matches = text.match(/({{(\s+)?[$0-9A-Za-z\-_]+(\s+)?}})/g)
        if (matches === null) {
            return text
        }

        this.client.global.set('$uuid', uuidV4())
        this.client.global.set('$timestamp', Math.floor(Date.now() / 1000))
        this.client.global.set('$randomInt', Math.floor(Math.random() * 1000))
        for (const variablePattern of matches) {
            const variable = variablePattern.replace(/[{}]/g, '').trim()
            let value;
            if (typeof this.client.global.get(variable) !== 'undefined') {
                value = this.client.global.get(variable)
            } else {
                value = this.clientConfig[variable]
            }

            if (typeof value === 'undefined') {
                throw new Error(format('missing variable %s', variable))
            }

            text = text.replace(variablePattern, value)
        }

        return text
    }

    setClientConfig(clientConfig) {
        this.clientConfig = clientConfig
    }

    getVmContext() {
        return this.vmContext
    }
}

module.exports = { Context }

