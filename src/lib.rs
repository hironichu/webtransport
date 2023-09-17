use connection::Conn;
use once_cell::sync::Lazy;
use tokio::runtime::Runtime;

///------------------------------------
static mut SEND_FN: Option<extern "C" fn(u32, *mut u8, u32)> = None;
static mut SERVER_CONN_FN: Option<extern "C" fn(*mut Conn)> = None;
static mut CLIENT_CONN_FN: Option<extern "C" fn(*mut Conn)> = None;
static mut RUNTIME: Lazy<Runtime> = Lazy::new(|| Runtime::new().unwrap());
///------------------------------------
mod certificate;
pub mod client;
mod connection;
mod executor;
pub mod server;
mod shared;
