use std::{path::Path, time::Duration};
use wtransport::{endpoint, tls::Certificate, ClientConfig, Endpoint};

use crate::{connection::Conn, CLIENT_CONN_FN, RUNTIME, SEND_FN};

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
                println!("Error creating client: {:?}", e);
                return Err(2);
            }
        };
        Ok(Self {
            conn_cb: None,
            client: Some(client),
            state: Some(true),
        })
    }

    pub(crate) unsafe fn connect(&'static mut self, url: String) {
        RUNTIME.block_on(async move {
            match self.client.as_mut().unwrap().connect(url).await {
                Ok(conn) => {
                    let client = Conn::new(conn);
                    let client_ptr = Box::into_raw(Box::new(client));
                    assert!(!CLIENT_CONN_FN.is_none());
                    CLIENT_CONN_FN.unwrap()(client_ptr);
                }
                Err(err) => {
                    println!("DBG: Error connecting to server. Err: {}", err.to_string());
                }
            }
        });
    }
}

#[no_mangle]
pub unsafe extern "C" fn proc_client_init(
    send_func: Option<extern "C" fn(u32, *mut u8, u32)>,
    keepalive: u64,
    timeout: u64,
    certcheck: bool,
    cert_path: *const u8,
    cert_path_len: usize,
    key_path: *const u8,
    key_path_len: usize,
) -> *mut WebTransportClient {
    assert!(!send_func.is_none());

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
    let config = if certcheck {
        let cert_path = ::std::slice::from_raw_parts(cert_path, cert_path_len);
        let key_path = ::std::slice::from_raw_parts(key_path, key_path_len);
        let cert_path = Path::new(std::str::from_utf8(cert_path).unwrap());
        let key_path = Path::new(std::str::from_utf8(key_path).unwrap());

        let _certificates = Certificate::load(cert_path, key_path).unwrap();
        ClientConfig::builder()
            .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual)
            .with_native_certs()
            .keep_alive_interval(keepalive)
            .max_idle_timeout(timeout)
            .unwrap()
            .build()
    } else {
        ClientConfig::builder()
            .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual)
            .with_no_cert_validation()
            .keep_alive_interval(keepalive)
            .max_idle_timeout(timeout)
            .unwrap()
            .build()
    };
    let client = WebTransportClient::new(send_func, config);
    match client {
        Ok(client) => Box::into_raw(Box::new(client)),
        Err(_) => {
            panic!("Error creating client")
        }
    }
}
#[no_mangle]
pub unsafe extern "C" fn proc_client_connect(
    client: *mut WebTransportClient,
    cb: Option<extern "C" fn(*mut Conn)>,
    url: *const u8,
    url_len: usize,
) {
    let url = ::std::slice::from_raw_parts(url, url_len);
    let url = std::str::from_utf8(url).unwrap();
    let client = &mut *client;
    client.conn_cb = cb;
    CLIENT_CONN_FN = cb;
    client.connect(url.to_string());
}

#[no_mangle]
pub unsafe extern "C" fn proc_client_close(
    client_ptr: *mut WebTransportClient,
    conn: *mut Conn,
) -> usize {
    assert!(!client_ptr.is_null());
    assert!(!conn.is_null());
    let client = &mut *client_ptr;
    let conn = &mut *conn;
    client.state = Some(false);
    RUNTIME.block_on(async move {
        conn.closed().await;
    });
    0
}

#[no_mangle]
pub unsafe extern "C" fn free_all_client(_a: *mut WebTransportClient, _b: *mut Conn) {
    let _con = &mut *_b;
    drop(_con.datagram_ch_receiver.drain());
    drop(_con.datagram_ch_sender.downgrade());
}
