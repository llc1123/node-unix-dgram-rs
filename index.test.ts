const describeOnlyIf = (condition: boolean) =>
  condition ? describe.only : describe.skip

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw an error', async () => {
    expect.assertions(1)
    await expect(import('.')).rejects.toThrow(
      `Unsupported OS: ${process.platform}-${process.arch}`,
    )
  })
})

describe('supported platforms', () => {
  test('should not throw an error', async () => {
    expect.assertions(1)
    await expect(import('.')).resolves.toBeTruthy()
  })
})
