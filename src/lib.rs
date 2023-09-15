use client::ClientConn;
// use flume::Receiver;
// use flume::Sender;
use once_cell::sync::Lazy;
use std::path::Path;
use std::time::Duration;
use tokio::runtime::Runtime;
use wtransport::endpoint;
use wtransport::tls::Certificate;
// use wtransport::Connection;
use wtransport::Endpoint;
use wtransport::ServerConfig;

mod client;
mod executor;
mod certificate;

pub struct WebTransport {
    pub server: Option<Endpoint<endpoint::Server>>,

    // conn_ch_sender: Option<Sender<Connection>>,
    // conn_ch_receiver: Option<Receiver<Connection>>,

	pub conn_cb: Option<extern "C" fn(*mut ClientConn)>,
    pub state: Option<bool>,
}
///------------------------------------ code  msg buf  len
static mut SEND_FN: Option<extern "C" fn(u32, *mut u8, u32)> = None;
static mut CONN_FN: Option<extern "C" fn(*mut ClientConn)> = None;
static mut RUNTIME: Lazy<Runtime> = Lazy::new(|| Runtime::new().unwrap());

impl WebTransport {

    pub(crate) unsafe fn new(
        sender_fn: Option<extern "C" fn(u32, *mut u8, u32)>,
        config: ServerConfig
    ) -> Result<Self, u32> {
        SEND_FN = sender_fn;
        let _guard = RUNTIME.enter();
        // let (conn_sender, conn_reciever) = flume::unbounded();
        //get the ref of config
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
            // conn_ch_sender: Some(conn_sender),
            // conn_ch_receiver: Some(conn_reciever),
        })
    }

    pub(crate) unsafe fn handle_sess_in(&'static mut self) {

		// let handle = RUNTIME.handle();
		
        executor::spawn(async move {
			// println!("Started thread");
			loop {
				let incoming_session = self.server.as_mut().unwrap().accept().await;

				RUNTIME.spawn(async move {
					let _buffer = vec![0; 65536].into_boxed_slice();
					// println!("DBG: Waiting for session request...");
					let session_request = incoming_session.await;
					let accepted_session = match session_request {
						Ok(session_request) => session_request,
						Err(e) => {
							//TODO(hironichu): Handle error with callback SENDER_FN
							println!("Error accepting session: {:?}", e);
							return ;
						}
					};
					// println!(
					// 	"DBG: New session: Authority: '{}', Path: '{}'",
					// 	accepted_session.authority(),
					// 	accepted_session.path()
					// );
					match accepted_session.accept().await {
						Ok(conn) => {
							// println!("DBG: Sending connection to channel.");
							let client = ClientConn::new(conn);
							let client_ptr = Box::into_raw(Box::new(client));
							assert!(!CONN_FN.is_none()); //TODO(hironichu): Handle this better.
							CONN_FN.unwrap()(client_ptr);
						},
						_ => {
							println!("Error accepting connection");
						}
					}

				});
			}
        }).detach();
    }
}


#[no_mangle]
pub unsafe extern "C" fn proc_init(
	send_func: Option<extern "C" fn(u32, *mut u8, u32)>,
    port: u16,
    migration: bool,
	keepalive: u64,
	timeout: u64,
	cert_path: *const u8,
	cert_path_len: usize,
	key_path: *const u8,
	key_path_len: usize,
) -> *mut WebTransport {
    assert!(!send_func.is_none());
    assert!(port > 0);

	let cert_path = ::std::slice::from_raw_parts(cert_path, cert_path_len);
	let key_path = ::std::slice::from_raw_parts(key_path, key_path_len);
	let cert_path = Path::new(std::str::from_utf8(cert_path).unwrap());
	let key_path = Path::new(std::str::from_utf8(key_path).unwrap());

	let certificates = Certificate::load(cert_path, key_path).unwrap();

	let keepalive = if keepalive == 0 { None } else { Some(Duration::from_secs(keepalive)) };
	//print the paths for debug
    let config = ServerConfig::builder()
        .with_bind_config(wtransport::config::IpBindConfig::InAddrAnyDual, port)
        .with_certificate(certificates)
        .keep_alive_interval(keepalive)
        .max_idle_timeout(Some(Duration::from_secs(timeout))).unwrap()
        .allow_migration(migration)
        .build();
    let server = WebTransport::new(send_func, config);
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
pub unsafe extern "C" fn proc_listen(server_ptr: *mut WebTransport, cb: Option<extern "C" fn(*mut ClientConn)>) {
    assert!(!server_ptr.is_null());
    let server = &mut *server_ptr;
	server.conn_cb = cb;
	CONN_FN = cb;
    server.handle_sess_in();
}

// #[no_mangle]
// pub unsafe extern "C" fn proc_newconn(srv: *mut WebTransport, cb: Option<extern "C" fn(*mut ClientConn)>) {
//     assert!(!srv.is_null());
// 	assert!(!cb.is_none());
//     let server = &mut *srv;
//     match server.conn_ch_receiver.as_ref().unwrap().recv() {
//         Ok(conn) => {
//             let client_conn = ClientConn::new(conn);
//             let client_ptr = Box::into_raw(Box::new(client_conn));
// 			cb.unwrap()(client_ptr);
//         }
//         _ => {
//             //panic!("Error receiving connection");
//         }
//     }
// }

#[no_mangle]
pub unsafe extern "C" fn proc_init_client_streams(srv: *mut WebTransport, clientptr: *mut ClientConn, _buffer : *mut u8) {
    assert!(!clientptr.is_null());
	assert!(!srv.is_null());

    let client = &mut *clientptr;
	let _server = &mut *srv;

    let sender = client.datagram_ch_sender.clone();

    // println!("DBG: CONN RECEIVER PROC SET & READY");
	// let rthandle = RUNTIME.handle();
    // let mut buffer =::std::slice::from_raw_parts_mut(buffer, 65536);

    executor::spawn(async move {
		let mut buffer = vec![0; 65536].into_boxed_slice();
        //use the buffer from the args and set it to a box slice
        let _ = RUNTIME.enter();
        loop {
            tokio::select! {
                stream = client.conn.accept_bi() => {
                    match stream {
                        Ok(mut stream) => {

                            println!("Accepted BI stream");
                            let bytes_read = stream.1.read(&mut buffer).await.unwrap().unwrap();
                            let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();

                            println!("Received (bi) '{str_data}' from client");

                            stream.0.write_all(b"ACK").await.unwrap();
                        },
                        _ => {}
                    };

                }
                stream = client.conn.accept_uni() => {
                    match stream {
                        Ok(mut stream) => {
                            println!("Accepted UNI stream");
                            let bytes_read = match stream.read(&mut buffer).await.unwrap() {
                                Some(bytes_read) => bytes_read,
                                None => continue,
                            };

                            let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();

                            println!("Received (uni) '{str_data}' from client");

                            let mut stream = client.conn.open_uni().await.unwrap().await.unwrap();
                            stream.write_all(b"ACK").await.unwrap();
                        },
                        _ => {}
                    }

                }
                stream = client.conn.receive_datagram() => {
                    match stream {
                        Ok(dgram) => {
                            let _ = sender.send(dgram);
                            // //TODO(hironichu): Remove this debug line 
                            // client.conn.send_datagram(b"ACK").unwrap();
                        },
                        _ => {}
                    }
                },

            }
        }
    }).detach();
}

#[no_mangle]
pub unsafe extern "C" fn proc_recv_datagram(srv: *mut WebTransport, client_ptr: *mut ClientConn, buff: *mut u8) -> usize {
    assert!(!client_ptr.is_null());
	assert!(!srv.is_null());
    
    let client = &mut *client_ptr;
	let _server = &mut *srv;

    match client.datagram_ch_receiver.recv() {
        Ok(dgram) => {
            ::std::slice::from_raw_parts_mut(buff, dgram.len()).copy_from_slice(&dgram);
            dgram.len()
        }
        Err(_) => 0,
    }
}

#[no_mangle]
pub unsafe extern "C" fn proc_send_datagram(srv: *mut WebTransport, clientptr: *mut ClientConn, buf: *const u8, buflen: u32) {
    assert!(!clientptr.is_null());
	assert!(!srv.is_null());

    let client = &mut *clientptr;
    let _server = &mut *srv;
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
	match client.conn.send_datagram(buf) {
		Ok(_) => {},
		Err(e) => {
			//TODO: Handle error better
			println!("Error sending datagram: {:?}", e);
		}
	}
}


#[no_mangle]
pub unsafe extern "C" fn test_proc(client: *mut ClientConn) {
    assert!(!client.is_null());
    let client = &mut *client;
    println!("TEST PROC {} ", client.conn.remote_address());
}


#[no_mangle]
pub extern "C" fn proc_gencert(buffpath: *mut u8) -> usize {
    //get the underlying buffer and use it to return the path to the cert
    let path = unsafe { std::ffi::CStr::from_ptr(buffpath as *const i8) };
    let path = path.to_str().unwrap();
    let cert = certificate::generate_certificate("localhost").unwrap();
    std::fs::write(format!("{}/cert.pem", path), cert.certificate).unwrap();
    std::fs::write(format!("{}/key.pem", path), cert.key).unwrap();
    path.len()
}

//create a free method that frees the memory of every pointer that was allocated
#[no_mangle]
pub unsafe extern "C" fn free_webtransport(_: *mut WebTransport) {}

#[no_mangle]
pub unsafe extern "C" fn free_clientconn(_: *mut ClientConn) {}

#[no_mangle]
pub unsafe extern "C" fn free_runtime(_: *mut Runtime) {}

//free all above once
#[no_mangle]
pub unsafe extern "C" fn free_all(
    _a: *mut WebTransport,
    _b: *mut ClientConn,
    _c: *mut Runtime,
) {}


