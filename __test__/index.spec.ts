import crypto from 'crypto'
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

describe('local address', () => {
  test('unbound socket', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    expect(() => socket.address()).toThrow()
  })
  test('unnamed socket', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    await new Promise<void>((resolve) => {
      socket.on('listening', () => resolve())
      socket.bind()
    })
    expect(socket.address()).toBeNull()
  })
  test('named socket', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    const dir = path.join(os.tmpdir(), crypto.randomBytes(20).toString('hex'))
    await new Promise<void>((resolve) => {
      socket.on('listening', () => resolve())
      socket.bind(dir)
    })
    expect(socket.address()).toBe(dir)
  })
})
