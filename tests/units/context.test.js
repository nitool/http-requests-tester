const { Context } = require('../../src/context')
const { Client } = require('../../src/client')

test('empty context test', () => {
    const context = new Context(new Client())
    expect(context.applyClientVariable('{{$uuid}}')).toBeDefined()
    expect(context.applyClientVariable('{{$timestamp}}')).toBeDefined()
    expect(context.applyClientVariable('{{$randomInt}}')).toBeDefined()
    expect(() => {
        context.applyClientVariable('{{not_existing_variable}}')
    }).toThrow()
})

test('empty context test', () => {
    const context = new Context(new Client())
    context.setClientConfig({
        'example_variable': 123,
        'test2': 'test_variable',
        'xxx': 'aaa',
        'foo': 'baz',
        'abc': 555
    })

    expect(context.applyClientVariable('{{$uuid}}')).toBeDefined()
    expect(context.applyClientVariable('{{$timestamp}}')).toBeDefined()
    expect(context.applyClientVariable('{{$randomInt}}')).toBeDefined()
    expect(() => {
        context.applyClientVariable('{{not_existing_variable}}')
    }).toThrow()

    expect(context.applyClientVariable('{{example_variable}}'))
        .toBe(`${context.clientConfig['example_variable']}`)

    expect(context.applyClientVariable('{{test2}} {{ xxx}} {{foo }} {{ abc }}'))
        .toBe(`${context.clientConfig['test2']} ${context.clientConfig['xxx']} ${context.clientConfig['foo']} ${context.clientConfig['abc']}`)
})

