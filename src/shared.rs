use crate::{
    connection::{Conn, Server},
    RUNTIME,
};

use std::slice::from_raw_parts_mut;
use tokio::runtime::Runtime;
use wtransport::{
    error::{ConnectionError, SendDatagramError},
    RecvStream, SendStream,
};

//impl a way to identify ConnectionError with a number for JS
pub struct ConnectionErrorWrapper(pub ConnectionError);

// Implement the From trait for the new type
impl From<ConnectionErrorWrapper> for u32 {
    fn from(wrapper: ConnectionErrorWrapper) -> Self {
        match wrapper.0 {
            ConnectionError::TimedOut => 170,
            ConnectionError::ApplicationClosed(_) => 171,
            ConnectionError::ConnectionClosed(_) => 172,
            ConnectionError::LocalH3Error(_) => 173,
            ConnectionError::QuicProto => 174,
            ConnectionError::LocallyClosed => 175,
        }
    }
}

unsafe fn send_error(code: u32, message: String, sender_fn: extern "C" fn(u32, *mut u8, u32)) {
    let mut msg = message;
    sender_fn(code, msg.as_mut_ptr(), msg.len() as u32);
}

#[repr(C)]
pub struct BidiStreams {
    pub source: *mut Conn<Server>,
    pub send: Option<SendStream>,
    pub recv: Option<RecvStream>,
}

/// Send a datagram
/// Error Codes :
/// 161 : Connection closed
/// 162 : Too large
/// 163 : Not supported by peer
/// 164 : Other error
#[no_mangle]
pub unsafe extern "C" fn proc_send_datagram(
    connptr: *mut Conn<Server>,
    buf: *const u8,
    buflen: u32,
) {
    assert!(!connptr.is_null());

    let client = &mut *connptr;
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    let conn = client.conn.as_ref().unwrap();
    let sender_cb = client.cb;
    match conn.send_datagram(buf) {
        Ok(_) => {}
        Err(err) => {
            //TODO: Handle error better
            match err {
                SendDatagramError::NotConnected => {
                    println!("DBG: Rust Connection closed");
                    sender_cb(161, vec![0].as_mut_ptr(), 1);
                }
                SendDatagramError::TooLarge => {
                    println!("DBG: Rust Too large");
                    sender_cb(162, vec![0].as_mut_ptr(), 1);
                }
                SendDatagramError::UnsupportedByPeer => {
                    println!("DBG: Rust not supported by peer");
                    sender_cb(163, vec![0].as_mut_ptr(), 1);
                }
            };
        }
    }
}

/// Receive a datagram.
/// Error Codes :
/// 170 : Connection closed
/// 171 : ApplicationClosed
/// 172 : ConnectionClosed
/// 173 : LocalH3Error
/// 174 : QuicProto
/// 175 : LocallyClosed
#[no_mangle]
pub unsafe extern "C" fn proc_recv_datagram(conn_ptr: *mut Conn<Server>, buff: *mut u8) -> usize {
    assert!(!conn_ptr.is_null());

    let client = &mut *conn_ptr;
    let sender_cb = client.cb;
    match client.read_datagram() {
        Ok(dgram) => {
            from_raw_parts_mut(buff, dgram.len()).clone_from_slice(&dgram);
            dgram.len()
        }
        Err(error) => {
            let message = error.to_string();
            send_error(ConnectionErrorWrapper(error).into(), message, sender_cb);
            0
        }
    }
}

/// Open a bidirectional stream.
/// Error Codes :
/// 150 : Connection closed
#[no_mangle]
pub unsafe extern "C" fn proc_open_bi(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let sender_cb = _client.cb;
    let stream = _client.open_bi();
    match stream {
        Ok((send, recv)) => {
            let bidi = BidiStreams {
                source: connptr,
                send: Some(send),
                recv: Some(recv),
            };
            Box::into_raw(Box::new(bidi))
        }
        Err(error) => {
            let message = error.to_string();
            send_error(ConnectionErrorWrapper(error).into(), message, sender_cb);
            std::ptr::null_mut()
        }
    }
}

/// Open a unidirectional stream.
#[no_mangle]
pub unsafe extern "C" fn proc_open_uni(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let cb = _client.cb;
    let stream = _client.open_uni();
    match stream {
        Ok(stream) => Box::into_raw(Box::new(BidiStreams {
            source: connptr,
            send: Some(stream),
            recv: None,
        })),
        Err(error) => {
            let message = error.to_string();
            send_error(ConnectionErrorWrapper(error).into(), message, cb);
            std::ptr::null_mut()
        }
    }
}

/// Accept a unidirectional stream.
#[no_mangle]
pub unsafe extern "C" fn proc_accept_uni(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let cb = _client.cb;
    let stream = _client.accept_uni();
    match stream {
        Ok(stream) => Box::into_raw(Box::new(BidiStreams {
            source: connptr,
            send: None,
            recv: Some(stream),
        })),
        Err(err) => {
            let msg = err.to_string();
            send_error(160, msg, cb);
            std::ptr::null_mut()
        }
    }
}

/// Accept a bidirectional stream.
#[no_mangle]
pub unsafe extern "C" fn proc_accept_bi(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let cb = _client.cb;
    let stream = _client.accept_bi();
    // let cb = _client.unwrap();
    match stream {
        Ok((send, recv)) => {
            let bidi = BidiStreams {
                source: connptr,
                send: Some(send),
                recv: Some(recv),
            };
            Box::into_raw(Box::new(bidi))
        }
        Err(err) => {
            let msg = err.to_string();
            send_error(160, msg, cb);
            std::ptr::null_mut()
        }
    }
}

///Write to a stream
#[no_mangle]
pub unsafe extern "C" fn proc_write(
    stream_ptr: *mut BidiStreams,
    buf: *const u8,
    buflen: u32,
) -> usize {
    assert!(!stream_ptr.is_null());
    assert!(buflen > 0);

    let bidi_streams = &mut *stream_ptr;
    let source = &mut *bidi_streams.source;
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    let writer = bidi_streams.send.as_mut().unwrap();
    let writenlen = RUNTIME.block_on(async move {
        match writer.write(buf).await {
            Ok(len) => len,
            Err(err) => {
                let msg = err.to_string();
                send_error(153, msg, source.cb);
                0
            }
        }
    });
    writenlen
}

#[no_mangle]
pub unsafe extern "C" fn proc_write_all(
    stream_ptr: *mut BidiStreams,
    buf: *const u8,
    buflen: u32,
) -> u32 {
    assert!(!stream_ptr.is_null());
    assert!(buflen > 0);
    let stream = &mut *stream_ptr;
    let source = &mut *stream.source;
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    let writer = stream.send.as_mut().unwrap();
    let writenlen = RUNTIME.block_on(async move {
        match writer.write_all(buf).await {
            Ok(_) => buflen,
            Err(err) => {
                let str = err.to_string();
                send_error(153, str, source.cb);
                0
            }
        }
    });
    writenlen
}

/// Read from a stream
///
/// Warning : We should always provide valid pointer from JS, if we dont we will crash for safety
/// Rust will automatically panic for any invalid pointer
#[no_mangle]
pub unsafe extern "C" fn proc_read(
    stream_ptr: *mut BidiStreams,
    buf: *mut u8,
    buflen: u32,
) -> usize {
    assert!(!stream_ptr.is_null());
    assert!(buflen > 0);

    let stream = &mut *stream_ptr;
    let source = &mut *stream.source;
    let buf = ::std::slice::from_raw_parts_mut(buf, buflen as usize);
    let readlen = RUNTIME.block_on(async move {
        match stream.recv.as_mut().unwrap().read(buf).await {
            Ok(len) => len,
            Err(err) => {
                let strs = err.to_string();
                send_error(154, strs, source.cb);
                None
            }
        }
    });
    match readlen {
        Some(len) => len,
        None => 0,
    }
}

/// Get a rescvstream id
#[no_mangle]
pub unsafe extern "C" fn proc_recvstream_id(stream_ptr: *mut BidiStreams) -> u64 {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    stream.recv.as_mut().unwrap().id().into_u64()
}

/// Get a sendstream id
#[no_mangle]
pub unsafe extern "C" fn proc_sendstream_id(stream_ptr: *mut BidiStreams) -> u64 {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    stream.send.as_mut().unwrap().id().into_u64()
}

/// Close a send stream.
#[no_mangle]
pub unsafe extern "C" fn proc_sendstream_finish(stream_ptr: *mut BidiStreams) {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    let source = &mut *stream.source;
    let sendstream = stream.send.as_mut().unwrap();
    RUNTIME.block_on(async move {
        match sendstream.finish().await {
            Ok(_) => drop(stream_ptr.as_ref()),
            Err(err) => {
                let msg = err.to_string();
                send_error(150, msg, source.cb);
            }
        }
    });
}

#[no_mangle]
pub unsafe extern "C" fn proc_recvtream_stop(stream_ptr: *mut BidiStreams) {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    let source = &mut *stream.source;
    RUNTIME.block_on(async move {
        match stream.recv.as_mut().unwrap().stop(0).await {
            Ok(_) => drop(stream_ptr.as_ref()),
            Err(err) => {
                let msg = format!("Error stopping recv stream : {:?}", err);
                send_error(158, msg, source.cb);
            }
        }
    });
}
#[no_mangle]
pub unsafe extern "C" fn proc_sendstream_priority(stream_ptr: *mut BidiStreams) -> i32 {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    stream.send.as_ref().unwrap().priority()
}

///
#[no_mangle]
pub unsafe extern "C" fn proc_sendstream_set_priority(
    stream_ptr: *mut BidiStreams,
    priority: i32,
) -> i32 {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    stream.send.as_ref().unwrap().set_priority(priority);
    priority
}

#[no_mangle]
pub unsafe extern "C" fn free_conn(_: *mut Conn<Server>) {}

#[no_mangle]
pub unsafe extern "C" fn free_runtime(_: *mut Runtime) {}
