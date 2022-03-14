import crypto from 'crypto'
import os from 'os'
import path from 'path'

const describeOnlyIf = (condition: boolean) =>
  condition ? describe.only : describe.skip

describeOnlyIf(process.platform === 'win32')('unsupported platforms', () => {
  test('should throw', async () => {
    expect.assertions(1)
    await expect(import('..')).rejects.toThrow()
  })
})

describe('supported platforms', () => {
  test('should resolve', async () => {
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

describe('remote address', () => {
  test('remote address', async () => {
    const { createSocket } = await import('..')

    const tx = createSocket()
    const dir = path.join(os.tmpdir(), crypto.randomBytes(20).toString('hex'))
    await new Promise<void>((resolve) => {
      tx.on('listening', () => resolve())
      tx.bind(dir)
    })
    const rx = createSocket()
    // unbound socket
    expect(() => rx.remoteAddress()).toThrow()
    await new Promise<void>((resolve) => {
      rx.on('listening', () => resolve())
      rx.bind()
    })
    // not connected
    expect(() => rx.remoteAddress()).toThrow()
    await new Promise<void>((resolve) => {
      rx.on('connect', () => resolve())
      rx.connect(dir)
    })
    // connected
    expect(rx.remoteAddress()).toBe(dir)
  })
})

describe('buffer size', () => {
  test('buffer size', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    expect(() => socket.getBufferSize()).toThrow()
    expect(() => socket.setBufferSize(2048)).toThrow()
    await new Promise<void>((resolve) => {
      socket.on('listening', () => resolve())
      socket.bind()
    })
    expect(socket.getBufferSize()).toBe(8192)
    expect(() => socket.setBufferSize(-1)).toThrow()
    expect(socket.getBufferSize()).toBe(8192)
    expect(socket.setBufferSize(2048)).toBeUndefined()
    expect(socket.getBufferSize()).toBe(2048)
  })
})

describe('send', () => {
  const data = Buffer.from('test string')
  const connectTarget = path.join(
    os.tmpdir(),
    crypto.randomBytes(20).toString('hex'),
  )
  const sendTarget = path.join(
    os.tmpdir(),
    crypto.randomBytes(20).toString('hex'),
  )

  test('unbound socket', async () => {
    const { createSocket } = await import('..')
    const socket = createSocket()
    expect(() => socket.send(data)).toThrow()
    expect(() => socket.send(data, sendTarget)).toThrow()
  })

  test('unconnected socket', async () => {
    const { createSocket } = await import('..')
    const socket = createSocket()
    await new Promise<void>((resolve) => {
      socket.on('listening', () => resolve())
      socket.bind()
    })
    expect(() => socket.send(data)).toThrow()
    expect(socket.send(data, sendTarget)).toBeUndefined()
  })

  test('connected socket', async () => {
    const { createSocket } = await import('..')
    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.on('listening', () => resolve())
      rx.bind(connectTarget)
    })

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.on('listening', () => resolve())
      tx.bind()
    })
    await new Promise<void>((resolve) => {
      tx.on('connect', () => resolve())
      tx.connect(connectTarget)
    })
    expect(tx.send(data)).toBeUndefined()
    expect(() => tx.send(data, sendTarget)).toThrow()
  })
})
