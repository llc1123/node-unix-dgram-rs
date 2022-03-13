const describeOnlyIf = (condition) =>
  condition ? describe.only : describe.skip

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw an error', async () => {
    expect.assertions(1)
    await expect(require('.')).rejects.toThrow(
      `Unsupported OS: ${process.platform}-${process.arch}`,
    )
  })
})

describe('supported platforms', () => {
  test('should not throw an error', () => {
    expect.assertions(1)
    expect(require('.')).toBeTruthy()
  })
})
