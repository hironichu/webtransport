use client::ClientConn;
use flume::Receiver;
use flume::Sender;
use futures_util::{pin_mut, select, FutureExt};
use std::time::Duration;
use tokio::runtime::Runtime;
use wtransport::datagram::Datagram;
use wtransport::endpoint;

use wtransport::endpoint::SessionRequest;
use wtransport::tls::Certificate;
use wtransport::Connection;
use wtransport::Endpoint;
use wtransport::ServerConfig;

mod client;
mod executor;

#[repr(C)]
pub struct ErrorMessage {
    pub code: i32,
    pub message: String,
}

pub struct WebTransport {
    /// The innter Server object
    pub server: Option<Endpoint<endpoint::Server>>,
    //
    conn_ch_sender: Option<Sender<Connection>>,
    conn_ch_receiver: Option<Receiver<Connection>>,
    pub state: Option<bool>,
}
static mut SEND_FN: Option<extern "C" fn(u32, *mut u8, u32)> = None;
enum Next {
    NewSessionRequest(Result<SessionRequest, wtransport::error::ConnectionError>),
}
impl WebTransport {
    pub(crate) fn new(
        port: u16,
        sender_fn: Option<extern "C" fn(u32, *mut u8, u32)>,
        _runtime: &mut Runtime,
    ) -> Result<Self, u32> {
        unsafe {
            SEND_FN = sender_fn;
        };
        let _guard = _runtime.enter();

        let config = ServerConfig::builder()
            .with_bind_default(port)
            .with_certificate(Certificate::load("cert.crt", "cert.key").unwrap())
            .keep_alive_interval(Some(Duration::from_secs(1)))
            .build();

        let (conn_sender, conn_reciever) = flume::unbounded();
        // let (datagram_sender, datagram_receiver) = flume::unbounded();

        let server = match Endpoint::server(config) {
            Ok(server) => server,
            Err(e) => {
                println!("Error creating server: {:?}", e);
                return Err(1);
            }
        };
        //
        // self.handle_sess_in(_runtime);
        //
        Ok(Self {
            server: Some(server),
            state: Some(true),
            conn_ch_sender: Some(conn_sender),
            conn_ch_receiver: Some(conn_reciever),
            // datagram_ch_sender: Some(datagram_sender),
            // datagram_ch_receiver: Some(datagram_receiver),
        })
    }

    pub(crate) unsafe fn handle_sess_in(&'static mut self, runtime: *mut Runtime) {
        println!("Waiting for session request...");
        let rt = runtime.as_mut().unwrap();
        rt.spawn(async move {
            loop {
                // let receiver = self.conn_ch_receiver.as_mut().unwrap();
                let sender = self.conn_ch_sender.as_ref().unwrap();
                let next = {
                    // let insess_receiver = receiver.recv_async().fuse();
                    let incoming_session = self.server.as_mut().unwrap().accept().fuse();

                    // pin_mut!(sender);
                    pin_mut!(incoming_session);
                    select! {
                        result = incoming_session => {
                            let sess_req = result.await;
                            Next::NewSessionRequest(sess_req)
                        }
                    }
                };
                match next {
                    Next::NewSessionRequest(sessreq) => {
                        match sessreq {
                            Ok(sessreq) => {
                                println!(
                                    "Received Session Request from client: {:?}",
                                    sessreq.authority()
                                );
                                // self.handle_session_impl(sessreq.accept().await);
                                let conn = sessreq.accept().await.unwrap();
                                println!(
                                    "Accepted session request from client: {:?}",
                                    conn.remote_address()
                                );

                                let _ = sender.send_async(conn).await;
                                // self.conn_ch_sender.as_mut().unwrap().send(conn).unwrap();
                            }
                            Err(e) => {
                                println!("Error accepting session request: {:?}", e);
                            }
                        }
                        // insess_sender.send_async(sessreq).await.unwrap();
                    }
                }
            }
        });
    }
}

#[no_mangle]
pub extern "C" fn init_runtime() -> *mut Runtime {
    Box::into_raw(Box::new(Runtime::new().unwrap()))
}

#[no_mangle]
pub unsafe extern "C" fn start(
    send_func: Option<extern "C" fn(u32, *mut u8, u32)>,
    res: *mut u32,
    rt_ptr: *mut Runtime,
) -> *mut WebTransport {
    assert!(!rt_ptr.is_null());
    assert!(!res.is_null());
    let _runtime = &mut *rt_ptr;
    let server = WebTransport::new(4433, send_func, _runtime);
    match server {
        Ok(server) => {
            let server_ptr = Box::into_raw(Box::new(server));
            *res = 0;
            server_ptr
        }
        Err(_) => {
            *res = 2;
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn handle_session(server_ptr: *mut WebTransport, runtime: *mut Runtime) {
    assert!(!server_ptr.is_null());
    assert!(!runtime.is_null());
    let server = &mut *server_ptr;
    let _runtime = &mut *runtime;
    server.handle_sess_in(_runtime);
}

#[no_mangle]
pub unsafe extern "C" fn proc_rec(srv: *mut WebTransport) -> *mut ClientConn {
    assert!(!srv.is_null());

    let server = &mut *srv;
    println!("DBG: RECEIVER READY");

    match server.conn_ch_receiver.as_ref().unwrap().recv() {
        Ok(conn) => {
            println!("New client : {:?}", conn.remote_address());
            let connptr = Box::into_raw(Box::new(conn));
            let client_conn = ClientConn::new(connptr);
            let clientptr = Box::into_raw(Box::new(client_conn));
            clientptr
        }
        _ => {
            panic!("Error receiving connection");
        }
    }
}

//create a method that creates a unbound channel and returns a pointer to the sender/receiver pair to the FFI

#[no_mangle]
pub unsafe extern "C" fn proc_rec_streams(client: *mut ClientConn) {
    assert!(!client.is_null());
    let client = &mut *client;
    let connection = client.get_conn();
    let sender = client.datagram_ch_sender.as_ref().unwrap();

    println!("CONN RECEIVER PROC SET & READY");
    executor::spawn(async move {
		let mut buffer = vec![0; 65536].into_boxed_slice();

        loop {
            // let sender = sender;
            println!("Waiting for datagram from client");
            tokio::select! {
                stream = connection.accept_bi() => {
                    match stream {
                        Ok(mut stream) => {

                            println!("Accepted BI stream");
                            let bytes_read = stream.1.read(&mut buffer).await.unwrap().unwrap();
                            let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();

                            println!("Received (bi) '{str_data}' from client");

                            stream.0.write_all(b"ACK").await.unwrap();
                        },
                        Err(e) => {
                            break ;
                        }
                    };

                }
                stream = connection.accept_uni() => {
                    // let mut stream = stream;
                    match stream {
                        Ok(mut stream) => {
                            println!("Accepted UNI stream");
                            let bytes_read = match stream.read(&mut buffer).await.unwrap() {
                                Some(bytes_read) => bytes_read,
                                None => continue,
                            };

                            let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();

                            println!("Received (uni) '{str_data}' from client");

                            let mut stream = connection.open_uni().await.unwrap().await.unwrap();
                            stream.write_all(b"ACK").await.unwrap();
                        },
                        _ => {
                            // println!("Error accepting UNI stream: {:?}", e);
                            break ;
                        }
                    }

                }
                    dgram = connection.receive_datagram() => {
                        match dgram {
                            Ok(dgram) => {

                                println!("Received datagram from client");
                                sender.send(dgram).unwrap();
                                // let str_data = std::str::from_utf8(&dgram).unwrap();
                                // println!("Received (dgram) '{str_data}' from client");
                                connection.send_datagram(b"ACK").unwrap();
                            },
                            _ => {
                                // break;
                                println!("Error receiving datagram");

                            }
                        }
                    },

            }
        }
    })
    .detach();
}

#[no_mangle]
pub unsafe extern "C" fn proc_recv_ch_datagram(client: *mut ClientConn, buff: *mut u8) -> usize {
    assert!(!client.is_null());
    let client = &mut *client;

    match client.datagram_ch_receiver.as_ref().unwrap().recv() {
        Ok(dgram) => {
            ::std::slice::from_raw_parts_mut(buff, dgram.len()).copy_from_slice(&dgram);
            dgram.len()
        }
        Err(_) => 0,
    }
}

#[no_mangle]
pub unsafe extern "C" fn test_proc(client: *mut ClientConn) {
    assert!(!client.is_null());
    let client = &mut *client;
    println!("TEST PROC {} ", client.get_conn().remote_address());
}
