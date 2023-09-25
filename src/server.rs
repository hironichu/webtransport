use crate::{
    connection::{self, Conn, Server},
    RUNTIME,
};
use std::{path::Path, time::Duration};
use tokio::runtime::Runtime;
use wtransport::endpoint::endpoint_side::Server as endServer;
use wtransport::{tls::Certificate, Endpoint, ServerConfig};

pub struct WebTransportServer {
    pub server: Option<Endpoint<endServer>>,
    pub state: Option<bool>,
}

impl WebTransportServer {
    pub(crate) unsafe fn new(config: ServerConfig) -> Result<Self, u32> {
        let _guard = RUNTIME.enter();

        let server = match Endpoint::server(config) {
            Ok(server) => server,
            Err(e) => {
                println!("Error creating server: {:?}", e);
                return Err(1);
            }
        };

        Ok(Self {
            server: Some(server),
            state: Some(true),
        })
    }

    pub(crate) async unsafe fn handle_sess_in(&mut self) -> Result<*mut Conn<Server>, u32> {
        let incoming_session = self.server.as_mut();
        match incoming_session {
            Some(incoming_session) => {
                let session_request = incoming_session.accept().await;

                let accepted_session = match session_request.await {
                    Ok(session_request) => {
                        let client = Conn::<Server>::new(session_request);
                        Ok(client)
                    }
                    Err(e) => Err(e),
                };
                match accepted_session {
                    Ok(mut sess) => match sess.accept().await {
                        Ok(conn) => {
                            sess.accepted(conn);
                            let client_ptr = Box::into_raw(Box::new(sess));
                            Ok(client_ptr)
                        }
                        Err(e) => {
                            println!("Error accepting connection : {}", e.to_string());

                            Err(0)
                        }
                    },
                    Err(error) => {
                        println!("Error accepting session : {}", error.to_string());
                        Err(0)
                    }
                }
            }
            None => {
                println!("Server endpoint is None (should be closed by now and not be called..");
                return Err(0);
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn proc_server_init(
    port: u16,
    migration: bool,
    keepalive: u64,
    timeout: u64,
    cert_path: *const u8,
    cert_path_len: usize,
    key_path: *const u8,
    key_path_len: usize,
) -> *mut WebTransportServer {
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
    let server = WebTransportServer::new(config);

    match server {
        Ok(server) => Box::into_raw(Box::new(server)),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn proc_server_listen(
    server_ptr: *mut WebTransportServer,
    cb: extern "C" fn(*mut Conn<connection::Server>),
) {
    assert!(!server_ptr.is_null());
    let server = &mut *server_ptr;

    RUNTIME.spawn(async move {
        loop {
            match server.state {
                Some(true) => {}
                Some(false) => {
                    println!("Server state is false, exiting");
                    return;
                }
                None => {
                    println!("Server state is None, exiting");
                    return;
                }
            }
            match server.handle_sess_in().await {
                Ok(conn) => {
                    cb(conn);
                }
                Err(e) => {
                    println!("Error accepting sess in : {}", e);
                }
            }
        }
    });
}
#[no_mangle]
pub extern "C" fn proc_server_client_authority(
    conn: *mut Conn<connection::Server>,
    buflen: *mut u32,
) -> *const u8 {
    assert!(!conn.is_null());
    let conn = unsafe { &mut *conn };
    let authority = conn.authority();
    unsafe {
        *buflen = authority.len() as u32;
    }
    authority.as_ptr()
}

#[no_mangle]
pub extern "C" fn proc_server_client_headers(
    conn: *mut Conn<connection::Server>,
    buflen: *mut u32,
) -> *const u8 {
    assert!(!conn.is_null());
    let conn = unsafe { &mut *conn };
    let mut json = serde_json::to_string(&conn.headers()).unwrap();
    unsafe {
        *buflen = json.len() as u32;
    }
    json.push('\0');
    json.as_ptr()
}

#[no_mangle]
pub extern "C" fn proc_server_client_path(
    conn: *mut Conn<connection::Server>,
    buflen: *mut u32,
) -> *const u8 {
    assert!(!conn.is_null());
    let conn = unsafe { &mut *conn };
    let path = conn.path();
    let mut path = path.to_string();
    unsafe {
        *buflen = path.len() as u32;
    }
    path.push('\0');
    path.as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn proc_server_close(server_ptr: *mut WebTransportServer) -> usize {
    assert!(!server_ptr.is_null());
    let server = &mut *server_ptr;
    let endpoint = server.server.as_mut();
    match endpoint {
        Some(endpoint) => {
            endpoint.close(30, b"Server closing");
        }
        None => println!("Error closing server"),
    }
    0
}
#[no_mangle]
pub unsafe extern "C" fn proc_server_close_clients(server_ptr: *mut WebTransportServer) -> usize {
    assert!(!server_ptr.is_null());

    let server = &mut *server_ptr;
    server.state = Some(false);
    let endpoint = server.server.as_mut();
    match endpoint {
        Some(endpoint) => {
            RUNTIME.block_on(async move {
                endpoint.wait_idle().await;
            });
        }
        None => println!("Error closing clients connections"),
    }
    0
}
//free all above once
#[no_mangle]
pub unsafe extern "C" fn free_all_server(_a: *mut WebTransportServer, _c: *mut Runtime) {}

#[no_mangle]
pub unsafe extern "C" fn free_server(_v: *mut WebTransportServer) {
    let _s = &mut *_v;
    drop(_s.server.take());
}
