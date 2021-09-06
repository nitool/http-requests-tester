const showHelpMessage = () => {
    console.log('help') 
    // todo: improve help message
    // powyciągać wszystkie używane kody błędów do stałych
    // opisać kody błędów do tej pory:
    // 0 - sukces
    // 1 - sukces programu, testy nie przeszły
    // XX - wymyśleć kod błędu dla złych paramsów, zwrócić błąd i wyświetlić help
    // wydzielić całe wyświetlanie helpa do zewnętrznej metody
    process.exit(0)
}

const extractValue = (args, optionsIndex) => {
    return args[optionsIndex].indexOf('=') > -1
        ? args[optionsIndex].split('=').slice(1).pop()
        : args[++optionsIndex]
}

const parseOptions = args => {
    let optionsIndex = 0
    let options = {
        'client-file': 'rest-client.env.json',
        'selected-client': '',
        'test-file': ''
    }

    while (optionsIndex < args.length) {
        if (args[optionsIndex] === '--help' 
            || args[optionsIndex] === '-h'
        ) {
            showHelpMessage()
        } else if (args[optionsIndex].indexOf('--client-file') > -1) {
            options['client-file'] = extractValue(args, optionsIndex)
        } else if (args[optionsIndex].indexOf('--selected-client') > -1) {
            options['selected-client'] = extractValue(args, optionsIndex)
        } else if (args[optionsIndex].indexOf('.http') > -1) {
            options['test-file'] = args[optionsIndex].trim()
        }

        optionsIndex++
    }

    // todo: validate options

    return options
}

module.exports = {
    showHelpMessage,
    parseOptions
}
