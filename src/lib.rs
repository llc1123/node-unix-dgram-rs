use napi::bindgen_prelude::*;
use napi_derive::napi;
use tokio::net;

const BUFFER_SIZE: i32 = 8192;

#[cfg(all(
    any(windows, unix),
    target_arch = "x86_64",
    not(target_env = "musl"),
    not(debug_assertions)
))]
#[global_allocator]
static ALLOC: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[napi(object)]
pub struct Data {
    pub buffer: Buffer,
    pub address: String,
}

// enum SocketStatus {
//     Created,
//     Listening,
//     Closed,
// }

#[napi]
pub struct UnixDatagram {
    _buffer_size: i32,
    // _status: SocketStatus,
    // _on_message: Vec<ThreadsafeFunction<OnMsgPayload, ErrorStrategy::CalleeHandled>>,
    // datagram: Option<net::UnixDatagram>,
    datagram: net::UnixDatagram,
}

#[napi]
impl UnixDatagram {
    /// Creates a new `UnixDatagram` bound to the specified path.
    #[napi(factory)]
    pub fn bind(path: String) -> napi::Result<UnixDatagram> {
        Ok(UnixDatagram {
            _buffer_size: BUFFER_SIZE,
            datagram: net::UnixDatagram::bind(path)?,
        })
    }

    /// Creates a new `UnixDatagram` which is not bound to any address.
    #[napi(factory)]
    pub fn unbound() -> napi::Result<UnixDatagram> {
        Ok(UnixDatagram {
            _buffer_size: BUFFER_SIZE,
            datagram: net::UnixDatagram::unbound()?,
        })
    }

    /// Connects the socket to the specified address.
    #[napi]
    pub fn connect(&self, path: String) -> napi::Result<()> {
        Ok(self.datagram.connect(path)?)
    }

    /// Sends data on the socket to the socket’s peer.
    #[napi]
    pub async fn send(&self, buffer: Buffer) -> napi::Result<i32> {
        let buf: Vec<u8> = buffer.into();
        Ok(self.datagram.send(&buf).await? as i32)
    }

    /// Sends data on the socket to the specified address.
    #[napi]
    pub async fn send_to(&self, buffer: Buffer, address: String) -> napi::Result<i32> {
        let buf: Vec<u8> = buffer.into();
        Ok(self.datagram.send_to(&buf, address).await? as i32)
    }

    /// Receives data from the socket.
    #[napi]
    pub async fn recv(&self) -> napi::Result<Buffer> {
        let mut buf = vec![0; self._buffer_size as usize];
        let len = self.datagram.recv(&mut buf).await?;
        buf.truncate(len);
        Ok(buf.into())
    }

    /// Receives data from the socket.
    #[napi]
    pub async fn recv_from(&self) -> napi::Result<Data> {
        let mut buf = vec![0; self._buffer_size as usize];
        let (len, addr) = self.datagram.recv_from(&mut buf).await?;
        buf.truncate(len);

        let buf: Buffer = buf.into();
        let addr = addr
            .as_pathname()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();
        Ok(Data {
            buffer: buf,
            address: addr,
        })
    }

    /// Returns the buffer size of this socket.
    #[napi(getter)]
    pub fn get_buffer_size(&self) -> napi::Result<i32> {
        Ok(self._buffer_size)
    }

    /// Sets the buffer size of this socket.
    #[napi(setter)]
    pub fn set_buffer_size(&mut self, size: i32) -> napi::Result<()> {
        if size < 0 {
            return Err(napi::Error::new(
                Status::InvalidArg,
                "Buffer size must be greater than 0".to_string(),
            ));
        }
        self._buffer_size = size;
        Ok(())
    }

    /// Returns the local address that this socket is bound to.
    #[napi(getter)]
    pub fn get_local_addr(&self) -> napi::Result<String> {
        let addr = self.datagram.local_addr()?;
        Ok(format!("{:?}", addr))
    }

    /// Returns the address of this socket’s peer.
    #[napi(getter)]
    pub fn get_peer_addr(&self) -> napi::Result<String> {
        let addr = self.datagram.peer_addr()?;
        Ok(format!("{:?}", addr))
    }
}

// #[napi(object)]
// pub struct RemoteInfo {
//     pub path: String,
//     pub size: i32,
// }

// #[napi(object)]
// pub struct OnMsgPayload {
//     pub msg: Buffer,
//     pub rinfo: RemoteInfo,
// }

// #[napi(ts_args_type = "callback?: (msg: Buffer, rinfo: RemoteInfo) => void")]
// pub fn create_socket(callback: Option<JsFunction>) -> napi::Result<UnixDatagram> {
//     match callback {
//         None => Ok(UnixDatagram {
//             _buffer_size: BUFFER_SIZE,
//             _status: SocketStatus::Created,
//             _on_message: vec![],
//             datagram: None,
//         }),
//         Some(cb) => {
//             let tsfn: ThreadsafeFunction<OnMsgPayload> = cb
//                 .create_threadsafe_function(0, |ctx| {
//                     ctx.env.create_uint32(ctx.value + 1).map(|v| vec![v])
//                 })?;
//             Ok(UnixDatagram {
//                 _buffer_size: BUFFER_SIZE,
//                 _status: SocketStatus::Created,
//                 _on_message: vec![tsfn],
//                 datagram: None,
//             })
//         }
//     }
// }
