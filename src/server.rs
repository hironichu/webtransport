use std::{path::Path, slice::from_raw_parts_mut, time::Duration};
use tokio::runtime::Runtime;
use wtransport::{endpoint, tls::Certificate, Endpoint, ServerConfig};

use crate::{connection::Conn, executor, RUNTIME, SEND_FN, SERVER_CONN_FN};

pub struct WebTransportServer {
    pub server: Option<Endpoint<endpoint::Server>>,
    pub conn_cb: Option<extern "C" fn(*mut Conn)>,
    pub state: Option<bool>,
}

impl WebTransportServer {
    pub(crate) unsafe fn new(
        sender_fn: Option<extern "C" fn(u32, *mut u8, u32)>,
        config: ServerConfig,
    ) -> Result<Self, u32> {
        SEND_FN = sender_fn;
        let _guard = RUNTIME.enter();

        let server = match Endpoint::server(config) {
            Ok(server) => server,
            Err(e) => {
                println!("Error creating server: {:?}", e);
                return Err(1);
            }
        };
        Ok(Self {
            conn_cb: None,
            server: Some(server),
            state: Some(true),
        })
    }

    pub(crate) unsafe fn handle_sess_in(&'static mut self) {
        RUNTIME.spawn(async move {
            loop {
                let incoming_session = self.server.as_mut().unwrap().accept().await;

                let session_request = incoming_session.await;

                let accepted_session = match session_request {
                    Ok(session_request) => session_request,
                    Err(e) => {
                        //TODO(hironichu): Handle error with callback SENDER_FN
                        println!("Error accepting session: {:?}", e);
                        return;
                    }
                };
                // accepted_session.
                //TODO(hironichu): We should handle every step of the handshake with callbacks.

                // println!(
                // 	"DBG: New session: Authority: '{}', Path: '{}'",
                // 	accepted_session.authority(),
                // 	accepted_session.path()
                // );
                match accepted_session.accept().await {
                    Ok(conn) => {
                        // println!("DBG: Sending connection to channel.");
                        let client = Conn::new(conn);
                        let client_ptr = Box::into_raw(Box::new(client));
                        assert!(!SERVER_CONN_FN.is_none()); //TODO(hironichu): Handle this better.
                        SERVER_CONN_FN.unwrap()(client_ptr);
                    }
                    _ => {
                        println!("Error accepting connection");
                    }
                }
            }
        });
    }
}

#[no_mangle]
pub unsafe extern "C" fn proc_server_init(
    send_func: Option<extern "C" fn(u32, *mut u8, u32)>,
    port: u16,
    migration: bool,
    keepalive: u64,
    timeout: u64,
    cert_path: *const u8,
    cert_path_len: usize,
    key_path: *const u8,
    key_path_len: usize,
) -> *mut WebTransportServer {
    assert!(!send_func.is_none());
    assert!(port > 0);

    let cert_path = ::std::slice::from_raw_parts(cert_path, cert_path_len);
    let key_path = ::std::slice::from_raw_parts(key_path, key_path_len);
    let cert_path = Path::new(std::str::from_utf8(cert_path).unwrap());
    let key_path = Path::new(std::str::from_utf8(key_path).unwrap());

    let certificates = Certificate::load(cert_path, key_path).unwrap();

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
    let config = ServerConfig::builder()
        .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual, port)
        .with_certificate(certificates)
        .keep_alive_interval(keepalive)
        .max_idle_timeout(timeout)
        .unwrap()
        .allow_migration(migration)
        .build();
    let server = WebTransportServer::new(send_func, config);
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
pub unsafe extern "C" fn proc_server_listen(
    server_ptr: *mut WebTransportServer,
    cb: Option<extern "C" fn(*mut Conn)>,
) {
    assert!(!server_ptr.is_null());
    let server = &mut *server_ptr;
    server.conn_cb = cb;
    SERVER_CONN_FN = cb;
    server.handle_sess_in();
}

#[no_mangle]
pub unsafe extern "C" fn proc_server_init_streams(
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
pub unsafe extern "C" fn proc_server_close(server_ptr: *mut WebTransportServer) -> usize {
    assert!(!server_ptr.is_null());

    let server = &mut *server_ptr;
    server.state = Some(false);
    let endpoint = server.server.as_mut().unwrap();
    endpoint.close(20, b"closed");
    0
}

//free all above once
#[no_mangle]
pub unsafe extern "C" fn free_all_server(_a: *mut WebTransportServer, _c: *mut Runtime) {}

#[no_mangle]
pub unsafe extern "C" fn free_server(_: *mut WebTransportServer) {}
