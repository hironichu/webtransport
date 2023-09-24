use crate::{
    connection::{Client, Conn},
    RUNTIME,
};
use std::{io::Error, time::Duration};
use wtransport::endpoint::endpoint_side::Client as endClient;
use wtransport::{ClientConfig, Endpoint};

pub struct WebTransportClient {
    pub client: Option<Endpoint<endClient>>,
    // pub conn_cb: Option<extern "C" fn(*mut Conn<connection::Client>)>,
    pub state: Option<bool>,
}

impl WebTransportClient {
    pub(crate) fn new(config: ClientConfig) -> Result<Self, Error> {
        let _guard = RUNTIME.enter();

        let client = match Endpoint::client(config) {
            Ok(server) => server,
            Err(e) => {
                return Err(e);
            }
        };
        Ok(Self {
            // conn_cb: None,
            client: Some(client),
            state: Some(true),
        })
    }

    pub(crate) fn connect(&'static mut self, url: String) -> *mut Conn<Client> {
        RUNTIME.block_on(async move {
            let client = self.client.as_mut().unwrap();

            match client.connect(url).await {
                Ok(conn) => {
                    let client = Conn::<Client>::new(conn);
                    return Box::into_raw(Box::new(client));
                }
                Err(_err) => {
                    //return null ptr
                    return std::ptr::null_mut();
                    // println!("DBG: Error connecting to server. Err: {}", err.to_string());
                    // let mut msg = err.to_string();
                    // errocb(141, msg.as_mut_ptr(), msg.len() as u32);
                    //sender_cb(141, msg.as_mut_ptr(), msg.len() as u32);
                }
            }
        })
    }
}

#[no_mangle]
pub extern "C" fn proc_client_init(
    // send_func: Option<extern "C" fn(u32, *mut u8, u32)>,
    keepalive: u64,
    timeout: u64,
) -> *mut WebTransportClient {
    // assert!(!send_func.is_none());

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

    let config = ClientConfig::builder()
        .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual)
        .with_no_cert_validation()
        .keep_alive_interval(keepalive)
        .max_idle_timeout(timeout)
        .unwrap()
        .build();
    let client = WebTransportClient::new(config);
    match client {
        Ok(client) => Box::into_raw(Box::new(client)),
        Err(_error) => std::ptr::null_mut(),
    }
}
#[no_mangle]
pub unsafe extern "C" fn proc_client_connect(
    client: *mut WebTransportClient,
    // cb: Option<extern "C" fn(*mut Conn<Client>)>,
    url: *const u8,
    url_len: usize,
) {
    let url = ::std::slice::from_raw_parts(url, url_len);
    let url = std::str::from_utf8(url).unwrap();
    let client = &mut *client;
    // client.conn_cb = cb;
    client.connect(url.to_string());
}

#[no_mangle]
pub unsafe extern "C" fn proc_client_close(
    client_ptr: *mut WebTransportClient,
    conn: *mut Conn<Client>,
) -> usize {
    assert!(!client_ptr.is_null());
    assert!(!conn.is_null());
    println!("CALLED");
    let client = &mut *client_ptr;
    let conn = &mut *conn;
    client.state = Some(false);
    // RUNTIME.block_on(async move { conn.close(32, Some(b"NO")) });
    conn.close(32, Some(b"NO"));
    0
}

#[no_mangle]
pub unsafe extern "C" fn free_all_client(_a: *mut WebTransportClient, _b: *mut Conn<Client>) {}

#[no_mangle]
pub unsafe extern "C" fn free_client(_a: *mut WebTransportClient) {}
