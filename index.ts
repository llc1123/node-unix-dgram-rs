import { EventEmitter } from 'stream'

import { UnixDatagram as UnixDatagramNative } from './napi'

interface UnixDatagramEvents {
  close: () => void
  connect: () => void
  error: (err: Error) => void
  listening: () => void
  message: (msg: Buffer, address: string | null) => void
}

declare interface UnixDatagram {
  on<U extends keyof UnixDatagramEvents>(
    event: U,
    listener: UnixDatagramEvents[U],
  ): this

  emit<U extends keyof UnixDatagramEvents>(
    event: U,
    ...args: Parameters<UnixDatagramEvents[U]>
  ): boolean
}

class UnixDatagram extends EventEmitter {
  private _socket: UnixDatagramNative | null = null
  private _closed = false

  private async _startListening() {
    if (this._socket) {
      while (this._socket) {
        try {
          const { buffer, address } = await this._socket.recvFrom()
          this.emit('message', buffer, address ?? null)
        } catch (err) {
          if (err instanceof Error) {
            this.emit('error', err)
          }
        }
      }
    } else {
      throw new Error('unbound socket')
    }
  }

  /**
   * Listen for datagram messages on a unix socket.
   * If path is not specified, it will bind to an unnamed socket.
   */
  public bind(path?: string): void
  public bind(callback?: UnixDatagramEvents['listening']): void
  public bind(path?: string, callback?: UnixDatagramEvents['listening']): void
  public bind(
    arg1?: string | UnixDatagramEvents['listening'],
    arg2?: UnixDatagramEvents['listening'],
  ): void {
    if (this._closed) throw new Error('socket closed')
    if (this._socket) throw new Error('cannot bind on a bound socket')

    let path: string | undefined,
      callback: UnixDatagramEvents['listening'] | undefined
    if (typeof arg1 === 'string' || arg1 === undefined) {
      path = arg1
      callback = arg2
    } else {
      path = undefined
      callback = arg1
    }

    callback && this.on('listening', callback)
    if (path) {
      UnixDatagramNative.bind(path).then((sk) => {
        this._socket = sk
        this.emit('listening')
        this._startListening()
      })
    } else {
      UnixDatagramNative.unbound().then((sk) => {
        this._socket = sk
        this.emit('listening')
        this._startListening()
      })
    }
  }

  /**
   * Close the underlying socket and stop listening for data on it.
   * If a callback is provided, it is added as a listener for the 'close' event.
   */
  public close(callback?: UnixDatagramEvents['close']): void {
    if (this._closed) throw new Error('socket closed')
    callback && this.on('close', callback)
    if (!this._socket) {
      this._closed = true
      this.emit('close')
    } else {
      this._socket
        .shutdown()
        .then(() => {
          this._closed = true
          this._socket = null
          this.emit('close')
        })
        .catch((err: Error) => {
          if (!this._connected) {
            this._closed = true
            this._socket = null
            this.emit('close')
          } else {
            throw err
          }
        })
    }
  }

  /**
   * Connects to a given target.
   * Throws error if socket closed or not listening.
   * Once the connection is complete, a 'connect' event is emitted and the optional callback function is called.
   * In case of failure, the callback is called or, failing this, an 'error' event is emitted.
   */
  public connect(target: string, callback?: (err?: Error) => void): void {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    if (this._connected) throw new Error('socket connected')
    this._socket
      .connect(target)
      .then(() => {
        callback && this.on('connect', callback)
        this.emit('connect')
      })
      .catch((err: Error) => {
        callback ? callback(err) : this.emit('error', err)
      })
  }

  public disconnect(): void {
    // TODO: implement disconnect
  }

  /**
   * Returns current buffer size of the socket.
   */
  public getBufferSize(): number {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.bufferSize
  }

  /**
   * Sets buffer size of the socket.
   */
  public setBufferSize(size: number): void {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    this._socket.bufferSize = size
  }

  /**
   * Returns the local address that this socket is bound to.
   * Returns null if socket is bound to an unnamed address.
   * Throws error if socket closed or not listening.
   */
  public address(): string | null {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.localAddr ?? null
  }

  /**
   * Returns the remote address that this socket is connected to.
   * Returns null if socket is connected to an unnamed address.
   * Throws error if socket not listening or not connected.
   */
  public remoteAddress(): string | null {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.peerAddr ?? null
  }

  /**
   * Returns the connection status of this socket.
   * Throws error if socket not listening.
   */
  private get _connected(): boolean {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    try {
      void this._socket.peerAddr
      return true
    } catch {
      // do nothing
    }
    return false
  }

  /**
   * Broadcasts a datagram on the socket.
   * For connectionless sockets, the destination target must be specified.
   * Connected sockets will use their associated remote endpoint, so the port and address arguments must not be set.
   * Throws error if socket closed or not listening.
   */
  public send(msg: Buffer, callback?: (err: Error | null) => void): void
  public send(
    msg: Buffer,
    target?: string,
    callback?: (err: Error | null) => void,
  ): void
  public send(
    msg: Buffer,
    arg1?: string | ((err: Error | null) => void),
    arg2?: (err: Error | null) => void,
  ): void {
    if (this._closed) throw new Error('socket closed')
    if (!this._socket) throw new Error('unbound socket')
    let target: string | undefined,
      callback: ((err: Error | null) => void) | undefined
    if (typeof arg1 === 'string' || arg1 === undefined) {
      target = arg1
      callback = arg2
    } else {
      target = undefined
      callback = arg1
    }
    if (this._connected) {
      if (target) throw new Error('socket connected')
      this._socket
        .send(msg)
        .then(() => {
          callback && callback(null)
        })
        .catch((err: Error) => {
          callback ? callback(err) : this.emit('error', err)
        })
    } else {
      if (!target) throw new Error('no target specified')
      this._socket
        .sendTo(msg, target)
        .then(() => {
          callback && callback(null)
        })
        .catch((err: Error) => {
          callback ? callback(err) : this.emit('error', err)
        })
    }
  }
  // TODO: receive message
}

const createSocket = (callback?: UnixDatagramEvents['message']) => {
  const socket = new UnixDatagram()
  callback && socket.on('message', callback)
  return socket
}

export { createSocket, UnixDatagram }
