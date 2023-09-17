use std::{path::Path, slice::from_raw_parts_mut, time::Duration};
use tokio::runtime::Runtime;
use wtransport::{endpoint, tls::Certificate, ClientConfig, Endpoint};

use crate::{connection::Conn, executor, CLIENT_CONN_FN, RUNTIME, SEND_FN};

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
                _ => {
                    println!("DBG: Error connecting to server.");
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
pub unsafe extern "C" fn proc_client_init_streams(
    clientptr: *mut Conn,
    buffer: *mut u8,
    buflen: usize,
) {
    assert!(!clientptr.is_null());

    let client = &mut *clientptr;
    let sender = client.datagram_ch_sender.clone();

    client.buffer = Some(from_raw_parts_mut(buffer, buflen));

    executor::spawn(async move {
        loop {
            tokio::select! {
                _ = client.conn.accept_bi() => {
                //     match stream {
                //         Ok(mut stream) => {

                //             println!("Accepted BI stream");
                //             let bytes_read = stream.1.read(&mut buffer).await.unwrap().unwrap();
                //             let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();

                //             println!("Received (bi) '{str_data}' from client");

                //             stream.0.write_all(b"ACK").await.unwrap();
                //         },
                //         _ => {
                // 			client.conn.closed().await;
                // 		}
                //     };
                    return client.conn.closed().await;
                }
                _ = client.conn.accept_uni() => {
                    //close the connection until we implement the uni stream
                    return client.conn.closed().await;
                //     match stream {
                //         Ok(mut stream) => {
                //             println!("Accepted UNI stream");
                //             let bytes_read = match stream.read(&mut buffer).await.unwrap() {
                //                 Some(bytes_read) => bytes_read,
                //                 None => continue,
                //             };

                //             let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();

                //             println!("Received (uni) '{str_data}' from client");

                //             let mut stream = client.conn.open_uni().await.unwrap().await.unwrap();
                //             stream.write_all(b"ACK").await.unwrap();
                //         },
                //         _ => {
                // 			client.conn.closed().await;
                // 		}
                //     }

                }
                stream = client.conn.receive_datagram() => {
                    match stream {
                        Ok(dgram) => sender.send_async(dgram).await.unwrap(),
                        _ => {
                            client.conn.closed().await;
                            //TODO(hironichu): Send action to Deno to free the pointer and buffer
                            // SEND_FN.unwrap()(client, std::ptr::null_mut(), 0);
                            return ;
                        }
                    }
                },

            }
        }
    })
    .detach();
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
pub unsafe extern "C" fn free_all_client(
    _a: *mut WebTransportClient,
    _b: *mut Conn,
    _c: *mut Runtime,
) {
}
