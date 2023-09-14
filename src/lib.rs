use flume::Receiver;
// use flume::Sender;
// use futures_util::{pin_mut, select, FutureExt};
use std::time::Duration;
use tokio::runtime::Runtime;
// use wtransport::datagram::Datagram;
use wtransport::endpoint;
use wtransport::endpoint::IncomingSession;
use wtransport::endpoint::SessionRequest;
use wtransport::tls::Certificate;
use wtransport::Connection;
use wtransport::Endpoint;
use wtransport::ServerConfig;

// mod executor;
#[repr(C)]
pub struct ErrorMessage {
    pub code: i32,
    pub message: String,
}
pub struct WebTransport {
    /// The innter Server object
    pub server: Option<Endpoint<endpoint::Server>>,

    //
    // conn_ch_sender: Option<Sender<Connection>>,
    conn_ch_receiver: Option<Receiver<Connection>>,
    //
    // insess_ch_sender: Option<Sender<IncomingSession>>,
    // insess_ch_receiver: Option<Receiver<IncomingSession>>,
    //
    pub state: Option<bool>,
    
}
static mut SEND_FN: Option<extern "C" fn(u32, *mut u8, u32)> = None;
enum Next {
    NewSessionRequest(Result<SessionRequest, wtransport::error::ConnectionError>),
    // IncomingSession(IncomingSession),
    // NewConnection(Connection),
    // NewData(Datagram),
}
impl WebTransport {
    pub fn new(
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
            .with_certificate(Certificate::load("cert.pem", "key.pem").unwrap())
            .keep_alive_interval(Some(Duration::from_secs(10)))
            .build();

        let (conn_sender, conn_reciever) = flume::unbounded();
        // let (insess_sender, insess_receiver) = flume::unbounded();


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
            // conn_ch_sender: Some(conn_sender),
            conn_ch_receiver: Some(conn_reciever),
            // insess_ch_sender: Some(insess_sender),
            // insess_ch_receiver: Some(insess_receiver),
        })
    }

    pub unsafe fn handle_sess_in(&'static mut self, runtime: *mut Runtime) {
        println!("Waiting for session request...");
        let rt = runtime.as_mut().unwrap();
        let _ = rt.enter();
        // executor::spawn(async move {
        rt.spawn(async move{
            for id in 0.. {
                let incoming_session = self.server.as_mut().unwrap().accept().await;
                let mut buffer = vec![0; 65536].into_boxed_slice();
    
                println!("Waiting for session request...");
                let session_request = incoming_session.await.unwrap();
                println!("Session request received ID : {}", id);
                println!(
                    "New session: Authority: '{}', Path: '{}'",
                    session_request.authority(),
                    session_request.path()
                );
            
                let connection = session_request.accept().await.unwrap();
            
                println!("Waiting for data from client...");
            
                loop {
                    tokio::select! {
                        stream = connection.accept_bi() => {
                            match stream {
                                Ok(mut stream) => {

                                    println!("Accepted BI stream");
                                    let bytes_read = match stream.1.read(&mut buffer).await.unwrap() {
                                        Some(bytes_read) => bytes_read,
                                        None => continue,
                                    };
                                    let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();
                    
                                    println!("Received (bi) '{str_data}' from client");
                    
                                    stream.0.write_all(b"ACK").await.unwrap();
                                },
                                _ => {
                                    // println!("Error accepting BI stream: {:?}", e);
                                }
                            };

            

                        }
                        // stream = connection.accept_uni() => {
                        //     // let mut stream = stream;
                        //     println!("Accepted UNI stream");
            
                        //     // let bytes_read = match stream.read(&mut buffer).await.unwrap() {
                        //     //     Some(bytes_read) => bytes_read,
                        //     //     None => continue,
                        //     // };
            
                        //     // let str_data = std::str::from_utf8(&buffer[..bytes_read]).unwrap();
            
                        //     // println!("Received (uni) '{str_data}' from client");
            
                        //     // let mut stream = connection.open_uni().await.unwrap().await.unwrap();
                        //     // stream.write_all(b"ACK").await.unwrap();
                        //     continue;
                        // }
                        dgram = connection.receive_datagram() => {
                            match dgram {
                                Ok(dgram) => {
                                    println!("Received datagram from client");
                                    let str_data = std::str::from_utf8(&dgram).unwrap();
                                    println!("Received (dgram) '{str_data}' from client");
                                    connection.send_datagram(b"ACK").unwrap();
                                },
                                _ => {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        // let receiver = self.conn_ch_receiver.as_mut().unwrap();
        // let next = {
        //     // let insess_receiver = receiver.recv_async().fuse();
        //     let incoming_session = self.server.as_mut().unwrap().accept().fuse();

        //     // pin_mut!(insess_receiver);
        //     pin_mut!(incoming_session);
        //     select! {
        //         result = incoming_session => {
        //             let sess_req = result.await;
        //             Next::NewSessionRequest(sess_req)
        //         }
        //     }
        // };
        // match next {
        //     Next::NewSessionRequest(sessreq) => {
        //         match sessreq {
        //             Ok(sessreq) => {
        //                 println!("Received Session Request from client: {:?}", sessreq.authority());
        //                 // self.handle_session_impl(sessreq.accept().await); 
        //                 let conn = sessreq.accept().await.unwrap();
        //                 println!("Accepted session request from client: {:?}", conn.remote_address());
        //                 let sender = self.conn_ch_sender.as_ref().unwrap();
        //                 let _ = sender.send_async(conn);
        //                 // self.conn_ch_sender.as_mut().unwrap().send(conn).unwrap();
        //             }
        //             Err(e) => {
        //                 println!("Error accepting session request: {:?}", e);
        //             }
        //         }
        //         // insess_sender.send_async(sessreq).await.unwrap();
        //     }
        //     _ => {
        //         println!("Received other stuff from client");
        //     }
        // }
        });
    // }).detach();
    }

    pub fn handle_session_impl(&'static mut self, _incoming_session: IncomingSession) {
        // println!("Waiting for session request...");
        // executor::spawn(async move {
        //     let receiver = self.conn_ch_receiver.as_mut().unwrap();
        //     let next = {
        //         let to_client_receiver_next = receiver.recv_async().fuse();
        //         let session_request = incoming_session.fuse();

        //         pin_mut!(to_client_receiver_next);
        //         pin_mut!(session_request);
        //         select! {
        //             from_client_result = session_request => {
        //                 let sess_req = from_client_result.unwrap();
        //                 println!("Session request received {}", sess_req.authority());
        //                 Next::NewSessionRequest(sess_req)
        //             }
        //         }
        //     };
        //     match next {
        //         Next::NewSessionRequest(sessreq) => {
        //             println!("Received datagram from client: {:?}", sessreq.authority());
        //         }

        //     }
        // }).detach();
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
pub unsafe extern "C" fn handle_session(
    server_ptr: *mut WebTransport,
    runtime: *mut Runtime,
) {
    assert!(!server_ptr.is_null());
    assert!(!runtime.is_null());
    let server = &mut *server_ptr;
    let _runtime = &mut *runtime;
    server.handle_sess_in(_runtime);
    // _runtime.spawn(server.handle_sess_in());
}

//Handle the incoming session receiver
#[no_mangle]
pub unsafe extern "C" fn accept(server_ptr: *mut WebTransport) {
    assert!(!server_ptr.is_null());

}

#[no_mangle]
pub unsafe extern "C" fn recv_conn(
  srv: *mut WebTransport,
) -> *mut Connection {
    assert!(!srv.is_null());

    let server = &mut *srv;
    // let recv = server.conn_ch_receiver.as_ref();

    match server.conn_ch_receiver.as_ref().unwrap().recv() {
        Ok(conn) => {
            Box::into_raw(Box::new(conn))
        }
        Err(_) => std::ptr::null_mut(),
    }
}