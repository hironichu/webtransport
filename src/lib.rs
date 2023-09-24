use once_cell::sync::Lazy;
use tokio::runtime::Runtime;

///------------------------------------
// static mut SEND_FN: Option<extern "C" fn(u32, *mut u8, u32)> = None;

static RUNTIME: Lazy<Runtime> = Lazy::new(|| Runtime::new().unwrap());
///------------------------------------
mod certificate;
mod client;
mod connection;
mod server;
mod shared;
