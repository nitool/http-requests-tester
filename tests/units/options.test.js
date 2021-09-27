const { parseOptions } = require('../../src/options')

test('only test file selected', () => {
    const args = ['test_case.http']
    const options = parseOptions(args)
    expect(options['test-file']).toContain(args[0])
})

test('order ({options space separated} {test file})', () => {
    const args = [
        '--selected-client',
        'test',
        'test_case.http',
    ]

    const options = parseOptions(args)
    expect(options['test-file']).toContain('test_case.http')
    expect(options['selected-client']).toBe('test')
})

test('order ({options = seperated} {test file})', () => {
    const args = [
        '--selected-client=test',
        'test_case.http',
    ]

    const options = parseOptions(args)
    expect(options['test-file']).toContain('test_case.http')
    expect(options['selected-client']).toBe('test')
})

test('order ({test file} {options space separated})', () => {
    const args = [
        'test_case.http',
        '--selected-client',
        'test',
    ]

    const options = parseOptions(args)
    expect(options['test-file']).toContain('test_case.http')
    expect(options['selected-client']).toBe('test')
})

test('order ({options} {test file} {options})', () => {
    const args = [
        '--client-file=rest-client.env.private.json',
        'test_case.http',
        '--selected-client',
        'test',
    ]

    const options = parseOptions(args)
    expect(options['test-file']).toContain('test_case.http')
    expect(options['selected-client']).toBe('test')

})

