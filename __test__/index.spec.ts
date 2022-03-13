const describeOnlyIf = (condition: boolean) =>
  condition ? describe.only : describe.skip

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw an error', async () => {
    expect.assertions(1)
    await expect(import('..')).rejects.toThrow()
  })
})

describe('supported platforms', () => {
  expect.assertions(1)
  test('should not throw an error', async () => {
    await expect(import('..')).resolves.toBeTruthy()
  })
})
