import { EventEmitter } from 'stream'

import { UnixDatagram as UnixDatagramNative } from './napi'

type RemoteInfo = {
  address: string
  size: number
}

interface UnixDatagramEvents {
  close: () => void
  connect: (err?: Error) => void
  error: (err: Error) => void
  listening: () => void
  message: (msg: Buffer, rinfo: RemoteInfo) => void
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

  public bind(
    address?: string,
    callback?: UnixDatagramEvents['listening'],
  ): void {
    if (this._socket) throw new Error('cannot bind on a bound socket')

    callback && this.on('listening', callback)
    if (address) {
      UnixDatagramNative.bind(address).then((sk) => {
        this._socket = sk
        this.emit('listening')
      })
    } else {
      UnixDatagramNative.unbound().then((sk) => {
        this._socket = sk
        this.emit('listening')
      })
    }
  }

  public close(callback?: UnixDatagramEvents['close']): void {
    if (!this._socket) return

    callback && this.on('close', callback)
    this._socket.shutdown().then(() => {
      this.emit('close')
    })
  }

  public connect(
    target: string,
    callback?: UnixDatagramEvents['connect'],
  ): void {
    if (!this._socket) throw new Error('unbound socket')
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
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.bufferSize
  }

  /**
   * Sets buffer size of the socket.
   */
  public setBufferSize(size: number): void {
    if (!this._socket) throw new Error('unbound socket')
    this._socket.bufferSize = size
  }

  /**
   * Returns the local address that this socket is bound to.
   * Returns null if socket is bound to an unnamed address.
   * Throws error if socket not listening.
   */
  public address(): string | null {
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.localAddr
  }

  /**
   * Returns the remote address that this socket is connected to.
   * Throws error if socket not listening or not connected.
   */
  public remoteAddress(): string {
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.peerAddr
  }

  /**
   * Returns the connection status of this socket.
   * Throws error if socket not listening.
   */
  private get _connected(): boolean {
    if (!this._socket) throw new Error('unbound socket')
    let connected = false
    try {
      void this._socket.peerAddr
      connected = true
    } catch {
      // do nothing
    }
    return connected
  }

  public send(
    msg: Buffer,
    target?: string,
    callback?: UnixDatagramEvents['error'],
  ): void {
    if (!this._socket) throw new Error('unbound socket')
    if (this._connected) {
      if (target) throw new Error('socket connected')
      this._socket.send(msg).catch((err: Error) => {
        if (callback) {
          callback(err)
        } else {
          this.emit('error', err)
        }
      })
    } else {
      if (!target) throw new Error('no target specified')
      this._socket.sendTo(msg, target).catch((err: Error) => {
        if (callback) {
          callback(err)
        } else {
          this.emit('error', err)
        }
      })
    }
  }
  // TODO: receive message

  // TODO: global error handler
}

const createSocket = (callback?: UnixDatagramEvents['message']) => {
  const socket = new UnixDatagram()
  callback && socket.on('message', callback)
  return socket
}

export { createSocket, UnixDatagram }
