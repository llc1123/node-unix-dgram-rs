import crypto from 'crypto'
import os from 'os'
import path from 'path'

const describeOnlyIf = (condition: boolean) =>
  condition ? describe.only : describe.skip

const tmpPath = (): string =>
  path.join(os.tmpdir(), crypto.randomBytes(20).toString('hex'))

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw', async () => {
    expect.assertions(1)
    await expect(import('../napi')).rejects.toThrow()
  })
})

describe('supported platforms', () => {
  test('should resolve', async () => {
    expect.assertions(1)
    await expect(import('../napi')).resolves.toBeTruthy()
  })
})

describe('UnixDatagram', () => {
  test('unnamed socket', async () => {
    const { UnixDatagram } = await import('../napi')
    const socket = await UnixDatagram.unbound()
    expect(socket.localAddr).toBeNull()
  })

  test('named socket', async () => {
    const { UnixDatagram } = await import('../napi')

    const dir = tmpPath()
    const socket = await UnixDatagram.bind(dir)
    expect(socket.localAddr).toBe(dir)
  })

  test('closed socket', async () => {
    const { UnixDatagram } = await import('../napi')
    const socket = await UnixDatagram.unbound()

    expect(socket.localAddr).toBeNull()
  })

  test('send recv', async () => {
    const { UnixDatagram } = await import('../napi')

    const dir = tmpPath()
    const socket = await UnixDatagram.bind(dir)
    const data = crypto.randomBytes(20)

    await socket.sendTo(data, dir)
    const received = await socket.recvFrom()

    expect(received.buffer).toEqual(data)
    expect(received.address).toEqual(dir)
  })
})
