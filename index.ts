import { EventEmitter } from 'stream'

import { UnixDatagram as UnixDatagramNative } from './napi'

type RemoteInfo = {
  address: string
  size: number
}

interface UnixDatagramEvents {
  close: () => void
  connect: () => void
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
    if (this._socket.peerAddr) {
      throw new Error('socket connected')
    } else {
      callback && this.on('connect', callback)
      this._socket.connect(target).then(() => {
        this.emit('connect')
      })
    }
  }

  public disconnect(): void {
    // TODO: implement disconnect
  }

  public getBufferSize(): number {
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.bufferSize
  }
  public setBufferSize(size: number): void {
    if (!this._socket) throw new Error('unbound socket')
    this._socket.bufferSize = size
  }

  public address(): string | null {
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.localAddr
  }

  public remoteAddress(): string {
    if (!this._socket) throw new Error('unbound socket')
    return this._socket.peerAddr
  }

  public send(
    msg: Buffer,
    target?: string,
    callback?: UnixDatagramEvents['error'],
  ): void {
    if (!this._socket) throw new Error('unbound socket')
    if (!this._socket.peerAddr) {
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

  // TODO: peerAddr maybe throw error on unbound socket? what about unnamed peer?

  // TODO: what is the localAddr if socket unbound?

  // TODO: global error handler
}

const createSocket = (callback?: UnixDatagramEvents['message']) => {
  const socket = new UnixDatagram()
  callback && socket.on('message', callback)
  return socket
}

export { createSocket, UnixDatagram }
