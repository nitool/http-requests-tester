const showHelpMessage = exitCode => {
    if (typeof exitCode === 'undefined') {
        exitCode = 0
    }

    process.stdout.write('HTTP Request Tester\n\n')
    process.stdout.write('Based on HTTP client and HTTP tests implemented in PHPStorm.\n\n')
    process.stdout.write('Resources:\n')
    process.stdout.write('\t- https://www.jetbrains.com/help/phpstorm/exploring-http-syntax.html\n')
    process.stdout.write('\t- https://www.jetbrains.com/help/phpstorm/http-client-reference.html\n\n')
    process.stdout.write('Options:\n')
    process.stdout.write('\t--client-file path_to_file.json - config file with possible clients configs, default rest-client.env.json\n')
    process.stdout.write('\t--selected-client name - each client file can contain multiple clients/configs, this option is required and selects config to use while making request\n')
    process.stdout.write('\t--help|-h - shows this message\n')
    process.stdout.write('\t--verbose|-v - show logs, by default only errors are printed out\n')
    process.stdout.write('Scripts returns exit code 0 if all assertions succeeded and 1 if at least one assertion failed.\n')
    process.exit(exitCode)
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
        'test-file': [],
        'verbose': false
    }

    while (optionsIndex < args.length) {
        if (args[optionsIndex] === '--help' || args[optionsIndex] === '-h') {
            showHelpMessage()
        } if (args[optionsIndex] === '--verbose' 
            || args[optionsIndex] === '-v'
        ) {
            options['verbose'] = true
        } else if (args[optionsIndex].indexOf('--client-file') > -1) {
            options['client-file'] = extractValue(args, optionsIndex)
        } else if (args[optionsIndex].indexOf('--selected-client') > -1) {
            options['selected-client'] = extractValue(args, optionsIndex)
        } else if (args[optionsIndex].indexOf('.http') > -1) {
            options['test-file'].push(args[optionsIndex].trim())
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
