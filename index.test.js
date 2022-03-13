const describeOnlyIf = condition =>
  condition ? describe.only : describe.skip

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw an error', async () => {
    expect(require('.')).toThrow()
  })
})

describe('supported platforms', () => {
  test('should not throw an error', () => {
    expect(require('.')).toBeTruthy()
  })
})
