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
    await new Promise<void>((resolve) => {
      socket.close(resolve)
    })
  })

  test('unnamed socket', async () => {
    const { createSocket } = await import('..')
    const socket = createSocket()
    await new Promise<void>((resolve) => {
      socket.bind(resolve)
    })
    expect(socket.address()).toBeNull()
    await new Promise<void>((resolve) => {
      socket.close(resolve)
    })
  })

  test('named socket', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    const dir = tmpPath()
    await new Promise<void>((resolve) => {
      socket.bind(dir, resolve)
    })
    expect(socket.address()).toBe(dir)
    await new Promise<void>((resolve) => {
      socket.close(resolve)
    })
  })

  test('closed socket', async () => {
    const { createSocket } = await import('..')
    const socket = createSocket()
    await new Promise<void>((resolve) => {
      socket.bind(resolve)
    })
    await new Promise<void>((resolve) => {
      socket.close(resolve)
    })
    expect(() => socket.address()).toThrow()
  })
})

describe('remote address', () => {
  test('remote address', async () => {
    const { createSocket } = await import('..')

    const tx = createSocket()
    const dir = tmpPath()
    await new Promise<void>((resolve) => {
      tx.bind(dir, resolve)
    })
    const rx = createSocket()
    // unbound socket
    expect(() => rx.remoteAddress()).toThrow()
    await new Promise<void>((resolve) => {
      rx.bind(resolve)
    })
    // not connected
    expect(() => rx.remoteAddress()).toThrow()
    await new Promise<Error | void>((resolve) => {
      rx.connect(dir, resolve)
    })
    // connected
    expect(rx.remoteAddress()).toBe(dir)
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
    // closed
    expect(() => rx.remoteAddress()).toThrow()
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
  })
})

describe('buffer size', () => {
  test('buffer size', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    expect(() => socket.getBufferSize()).toThrow()
    expect(() => socket.setBufferSize(2048)).toThrow()
    await new Promise<void>((resolve) => {
      socket.bind(resolve)
    })
    expect(socket.getBufferSize()).toBe(8192)
    expect(() => socket.setBufferSize(-1)).toThrow()
    expect(socket.getBufferSize()).toBe(8192)
    expect(socket.setBufferSize(2048)).toBeUndefined()
    expect(socket.getBufferSize()).toBe(2048)
    await new Promise<void>((resolve) => {
      socket.close(resolve)
    })
    expect(() => socket.getBufferSize()).toThrow()
    expect(() => socket.setBufferSize(1024)).toThrow()
  })
})

describe('connect', () => {
  test('unbound socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(target, resolve)
    })

    const rx = createSocket()
    await expect(
      new Promise<Error | void>((resolve) => {
        rx.connect(target, resolve)
      }),
    ).rejects.toThrow()
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
  })

  test('listening socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(target, resolve)
    })

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(resolve)
    })
    await expect(
      new Promise<Error | void>((resolve) => {
        rx.connect(target, resolve)
      }),
    ).resolves.toBeUndefined()

    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
  })

  test('connected socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(target, resolve)
    })

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(resolve)
    })
    await new Promise<Error | void>((resolve) => {
      rx.connect(target, resolve)
    })
    await expect(
      new Promise<Error | void>((resolve) => {
        rx.connect(target, resolve)
      }),
    ).rejects.toThrow()
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
  })

  test('closed socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(target, resolve)
    })

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(resolve)
    })
    await new Promise<Error | void>((resolve) => {
      rx.connect(target, resolve)
    })
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
    await expect(
      new Promise<Error | void>((resolve) => {
        rx.connect(target, resolve)
      }),
    ).rejects.toThrow()
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
  })
})

describe('send', () => {
  const data = Buffer.from('test string')

  test('unbound socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const socket = createSocket()
    expect(() => socket.send(data)).toThrow()
    expect(() => socket.send(data, target)).toThrow()

    await new Promise<void>((resolve) => {
      socket.close(resolve)
    })
  })

  test('unconnected socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(target, resolve)
    })
    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(resolve)
    })
    expect(() => tx.send(data)).toThrow()
    await expect(
      new Promise<Error | null>((resolve) => {
        tx.send(data, target, resolve)
      }),
    ).resolves.toBeNull()
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
  })

  test('connected socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(target, resolve)
    })

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(resolve)
    })
    await new Promise<Error | void>((resolve) => {
      tx.connect(target, resolve)
    })
    await expect(
      new Promise<Error | null>((resolve) => {
        tx.send(data, resolve)
      }),
    ).resolves.toBeNull()
    expect(() => tx.send(data, target)).toThrow()
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
  })

  test('closed socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(target, resolve)
    })

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(resolve)
    })
    await new Promise<Error | void>((resolve) => {
      tx.connect(target, resolve)
    })
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
    expect(() => tx.send(data)).toThrow()
    expect(() => tx.send(data, target)).toThrow()
    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
  })
})

describe('close', () => {
  test('unbound socket', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    await expect(
      new Promise<void>((resolve) => {
        socket.close(resolve)
      }),
    ).resolves.toBeUndefined()
  })

  test('unconnected socket', async () => {
    const { createSocket } = await import('..')

    const socket = createSocket()
    await new Promise<void>((resolve) => {
      socket.bind(resolve)
    })
    await expect(
      new Promise<void>((resolve) => {
        socket.close(resolve)
      }),
    ).resolves.toBeUndefined()
  })

  test('connected socket', async () => {
    const { createSocket } = await import('..')

    const target = tmpPath()

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(target, resolve)
    })

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(resolve)
    })
    await new Promise<Error | void>((resolve) => {
      tx.connect(target, resolve)
    })
    await expect(
      new Promise<void>((resolve) => {
        tx.close(resolve)
      }),
    ).resolves.toBeUndefined()

    await new Promise<void>((resolve) => {
      rx.close(resolve)
    })
  })

  test('closed socket', async () => {
    const { createSocket } = await import('..')

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.close(resolve)
    })
    await expect(
      new Promise<void>((resolve) => {
        tx.close(resolve)
      }),
    ).rejects.toThrow()
  })
})

describe('recv', () => {
  test('unconnected socket', async () => {
    const { createSocket } = await import('..')
    const target = tmpPath()

    const tx = createSocket()
    await new Promise<void>((resolve) => {
      tx.bind(resolve)
    })

    const rx = createSocket()
    await new Promise<void>((resolve) => {
      rx.bind(target, resolve)
    })
    const cb = jest.fn()
    rx.on('message', cb)
    const data = Buffer.from('test')
    await new Promise<void>((resolve, reject) =>
      tx.send(Buffer.from('test'), target, (err) => {
        err ? resolve() : reject(err)
      }),
    )
    expect(cb).toHaveBeenCalledWith(data, null)
  })
})
