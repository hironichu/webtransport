use std::{path::Path, time::Duration};
use tokio::runtime::Runtime;
use wtransport::{ Endpoint, endpoint, ClientConfig, tls::Certificate};

use crate::{RUNTIME, SEND_FN, connection::Conn};

pub struct WebTransportClient {
    pub client: Option<Endpoint<endpoint::Client>>,
    pub conn_cb: Option<extern "C" fn(*mut Conn)>,
    pub state: Option<bool>,
}


impl WebTransportClient {
    pub(crate) unsafe fn new(
        sender_fn: Option<extern "C" fn(u32, *mut u8, u32)>,
        config: ClientConfig,
    ) -> Result<Self, u32> {
        SEND_FN = sender_fn;
        let _guard = RUNTIME.enter();

        let client = match Endpoint::client(config) {
            Ok(server) => server,
            Err(e) => {
                println!("Error creating server: {:?}", e);
                return Err(1);
            }
        };
        Ok(Self {
            conn_cb: None,
            client: Some(client),
            state: Some(true),
        })
    }

    // pub(crate) unsafe fn handle_sess_in(&'static mut self) {
    //     RUNTIME.spawn(async move {
    //         loop {
    //             let incoming_session = self.client.as_mut().unwrap().accept().await;

    //             let session_request = incoming_session.await;

    //             let accepted_session = match session_request {
    //                 Ok(session_request) => session_request,
    //                 Err(e) => {
    //                     //TODO(hironichu): Handle error with callback SENDER_FN
    //                     println!("Error accepting session: {:?}", e);
    //                     return;
    //                 }
    //             };
    //             // accepted_session.
    //             //TODO(hironichu): We should handle every step of the handshake with callbacks.

    //             // println!(
    //             // 	"DBG: New session: Authority: '{}', Path: '{}'",
    //             // 	accepted_session.authority(),
    //             // 	accepted_session.path()
    //             // );
    //             match accepted_session.accept().await {
    //                 Ok(conn) => {
    //                     // println!("DBG: Sending connection to channel.");
    //                     let client = ServerConn::new(conn);
    //                     let client_ptr = Box::into_raw(Box::new(client));
    //                     assert!(!CONN_FN.is_none()); //TODO(hironichu): Handle this better.
    //                     CONN_FN.unwrap()(client_ptr);
    //                 }
    //                 _ => {
    //                     println!("Error accepting connection");
    //                 }
    //             }
    //         }
    //     });
    // }
}


#[no_mangle]
pub unsafe extern "C" fn proc_client_init(
    send_func: Option<extern "C" fn(u32, *mut u8, u32)>,
    keepalive: u64,
    timeout: u64,
    cert_path: *const u8,
    cert_path_len: usize,
    key_path: *const u8,
    key_path_len: usize,
) -> *mut WebTransportClient {
    assert!(!send_func.is_none());

    let cert_path = ::std::slice::from_raw_parts(cert_path, cert_path_len);
    let key_path = ::std::slice::from_raw_parts(key_path, key_path_len);
    let cert_path = Path::new(std::str::from_utf8(cert_path).unwrap());
    let key_path = Path::new(std::str::from_utf8(key_path).unwrap());

    let _certificates = Certificate::load(cert_path, key_path).unwrap();

    let keepalive = if keepalive == 0 {
        None
    } else {
        Some(Duration::from_secs(keepalive))
    };
	let timeout = if timeout == 0 {
		None
	} else {
		Some(Duration::from_secs(timeout))
	};
    //print the paths for debug
    let config = ClientConfig::builder()
        .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual)
		.with_native_certs()
		.keep_alive_interval(keepalive)
		.max_idle_timeout(timeout).unwrap()
        .build();
    let server = WebTransportClient::new(send_func, config);
    match server {
        Ok(server) => {
            let server_ptr = Box::into_raw(Box::new(server));
            server_ptr
        }
        Err(_) => {
            panic!("Error creating server")
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn free_all_client(_a: *mut WebTransportClient, _b: *mut Conn, _c: *mut Runtime) {}