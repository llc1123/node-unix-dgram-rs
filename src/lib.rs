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

#[napi]
pub struct UnixDatagram {
    _buffer_size: i32,
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

    /// Sends data on the socket to the specified address.
    #[napi]
    pub async fn send_to(&self, data: Data) -> napi::Result<i64> {
        let Data { buffer, address } = data;
        let buf: Vec<u8> = buffer.into();
        Ok(self.datagram.send_to(&buf, address).await? as i64)
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
            .map(|p| p.to_str())
            .flatten()
            .unwrap_or("")
            .to_string();
        Ok(Data {
            buffer: buf,
            address: addr,
        })
    }

    #[napi(getter)]
    pub fn get_buffer_size(&self) -> napi::Result<i32> {
        Ok(self._buffer_size)
    }

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
}
