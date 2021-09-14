client.test('test skryptu z pliku, być 200', function () {
    client.assert(response.status === 200, 'kod nie jest 200')
})

