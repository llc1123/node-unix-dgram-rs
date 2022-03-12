use napi_derive::napi;
// use std::path::Path;
// use tokio::net::UnixDatagram;

#[cfg(all(
    any(windows, unix),
    target_arch = "x86_64",
    not(target_env = "musl"),
    not(debug_assertions)
))]
#[global_allocator]
static ALLOC: mimalloc::MiMalloc = mimalloc::MiMalloc;

// #[napi]
// pub fn bind<P: AsRef<Path>>(path: P) -> napi::Result<UnixDatagram> {
//     UnixDatagram::bind(path)
// }

// #[napi]
// pub fn unbound() -> napi::Result<UnixDatagram> {
//     UnixDatagram::unbound()
// }

#[napi]
pub fn bind() -> napi::Result<()> {
    Ok(())
}

#[napi]
pub fn unbound() -> napi::Result<()> {
    Ok(())
}
