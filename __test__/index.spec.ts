import os from 'os'
import path from 'path'

const describeOnlyIf = (condition: boolean) =>
  condition ? describe.only : describe.skip

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw an error', async () => {
    expect.assertions(1)
    await expect(import('..')).rejects.toThrow()
  })
})

describe('supported platforms', () => {
  test('should not throw an error', async () => {
    expect.assertions(1)
    await expect(import('..')).resolves.toBeTruthy()
  })
})

describe('create sockets', () => {
  test('create unbounded socket', async () => {
    const { UnixDatagram } = await import('..')

    const socket = UnixDatagram.unbound()
    expect(socket).toBeTruthy()
  })

  test('create bounded socket', async () => {
    const { UnixDatagram } = await import('..')

    const socket = UnixDatagram.bind(path.join(os.tmpdir(), 'tx'))
    expect(socket).toBeTruthy()
  })
})
