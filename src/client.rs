use crate::{
    connection::{self, Client, Conn},
    CLIENT_CONN_FN, RUNTIME, SEND_FN,
};
use std::time::Duration;
use wtransport::endpoint::endpoint_side::Client as endClient;
use wtransport::{ClientConfig, Endpoint};

pub struct WebTransportClient {
    pub client: Option<Endpoint<endClient>>,
    pub conn_cb: Option<extern "C" fn(*mut Conn<connection::Client>)>,
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
                    let client = Conn::<Client>::new(conn);
                    let client_ptr = Box::into_raw(Box::new(client));
                    assert!(!CLIENT_CONN_FN.is_none());
                    CLIENT_CONN_FN.unwrap()(client_ptr);
                }
                Err(err) => {
                    println!("DBG: Error connecting to server. Err: {}", err.to_string());
                    let mut msg = err.to_string();
                    SEND_FN.unwrap()(141, msg.as_mut_ptr(), msg.len() as u32);
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

    let config = ClientConfig::builder()
        .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual)
        .with_no_cert_validation()
        .keep_alive_interval(keepalive)
        .max_idle_timeout(timeout)
        .unwrap()
        .build();
    let client = WebTransportClient::new(send_func, config);
    match client {
        Ok(client) => Box::into_raw(Box::new(client)),
        Err(_) => {
            SEND_FN.unwrap()(140, std::ptr::null_mut(), 0);
            std::ptr::null_mut()
        }
    }
}
#[no_mangle]
pub unsafe extern "C" fn proc_client_connect(
    client: *mut WebTransportClient,
    cb: Option<extern "C" fn(*mut Conn<Client>)>,
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
    conn: *mut Conn<Client>,
) -> usize {
    assert!(!client_ptr.is_null());
    assert!(!conn.is_null());
    let client = &mut *client_ptr;
    let conn = &mut *conn;
    client.state = Some(false);
    RUNTIME.block_on(async move { conn.closed().await });
    0
}

#[no_mangle]
pub unsafe extern "C" fn free_all_client(_a: *mut WebTransportClient, _b: *mut Conn<Client>) {}
