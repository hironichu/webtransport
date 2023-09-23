use crate::{
    connection::{Conn, Server},
    RUNTIME, SEND_FN,
};

use std::slice::from_raw_parts_mut;
use tokio::runtime::Runtime;
use wtransport::{error::SendDatagramError, RecvStream, SendStream};

#[repr(C)]
pub struct BidiStreams {
    pub send: Option<SendStream>,
    pub recv: Option<RecvStream>,
}

/// Send a datagram.
#[no_mangle]
pub unsafe extern "C" fn proc_send_datagram(
    connptr: *mut Conn<Server>,
    buf: *const u8,
    buflen: u32,
) {
    assert!(!connptr.is_null());

    let client = &mut *connptr;
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    match client.conn.as_ref().unwrap().send_datagram(buf) {
        Ok(_) => {}
        Err(err) => {
            //TODO: Handle error better
            match err {
                SendDatagramError::NotConnected => {
                    println!("DBG: Rust Connection closed");
                    SEND_FN.unwrap()(161, vec![0].as_mut_ptr(), 1);
                }
                SendDatagramError::TooLarge => {
                    println!("DBG: Rust Too large");
                    SEND_FN.unwrap()(162, vec![0].as_mut_ptr(), 1);
                }
                SendDatagramError::UnsupportedByPeer => {
                    println!("DBG: Rust not supported by peer");
                    SEND_FN.unwrap()(163, vec![0].as_mut_ptr(), 1);
                }
            };
        }
    }
}

/// Receive a datagram.
#[no_mangle]
pub unsafe extern "C" fn proc_recv_datagram(conn_ptr: *mut Conn<Server>, buff: *mut u8) -> usize {
    assert!(!conn_ptr.is_null());

    let client = &mut *conn_ptr;

    match client.datagrams() {
        Ok(dgram) => {
            from_raw_parts_mut(buff, dgram.len()).clone_from_slice(&dgram);
            dgram.len()
        }
        Err(err) => {
            let mut msg = err.to_string();
            SEND_FN.unwrap()(156, msg.as_mut_ptr(), msg.len() as u32);
            0
        }
    }
}

/// Open a bidirectional stream. (Temporary because unsafe)
#[allow(improper_ctypes_definitions)]
#[no_mangle]
pub unsafe extern "C" fn proc_open_bi(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let stream = _client.open_bi();
    match stream {
        Ok((send, recv)) => {
            let bidi = BidiStreams {
                send: Some(send),
                recv: Some(recv),
            };
            Box::into_raw(Box::new(bidi))
        }
        Err(err) => {
            println!("Error opening bidirectional stream: {:?}", err);
            let mut msg = err.to_string();
            SEND_FN.unwrap()(155, msg.as_mut_ptr(), msg.len() as u32);
            std::ptr::null_mut()
        }
    }
}

/// Open a unidirectional stream.
#[no_mangle]
pub unsafe extern "C" fn proc_open_uni(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let stream = _client.open_uni();
    match stream {
        Ok(stream) => Box::into_raw(Box::new(BidiStreams {
            send: Some(stream),
            recv: None,
        })),
        Err(err) => {
            let mut msg = err.to_string();
            SEND_FN.unwrap()(152, msg.as_mut_ptr(), msg.len() as u32);
            std::ptr::null_mut()
        }
    }
}

/// Accept a unidirectional stream.
#[no_mangle]
pub unsafe extern "C" fn proc_accept_uni(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let stream = _client.accept_uni();
    match stream {
        Ok(stream) => Box::into_raw(Box::new(BidiStreams {
            send: None,
            recv: Some(stream),
        })),
        Err(err) => {
            let mut msg = err.to_string();
            SEND_FN.unwrap()(151, msg.as_mut_ptr(), msg.len() as u32);
            std::ptr::null_mut()
        }
    }
}

/// Accept a bidirectional stream.
#[no_mangle]
pub unsafe extern "C" fn proc_accept_bi(connptr: *mut Conn<Server>) -> *mut BidiStreams {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    let stream = _client.accept_bi();
    match stream {
        Ok((send, recv)) => {
            let bidi = BidiStreams {
                send: Some(send),
                recv: Some(recv),
            };
            Box::into_raw(Box::new(bidi))
        }
        Err(err) => {
            let mut msg = err.to_string();
            SEND_FN.unwrap()(152, msg.as_mut_ptr(), msg.len() as u32);
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
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    let writer = bidi_streams.send.as_mut().unwrap();
    let writenlen = RUNTIME.block_on(async move {
        match writer.write(buf).await {
            Ok(len) => len,
            Err(err) => {
                let mut str = err.to_string();
                SEND_FN.unwrap()(153, str.as_mut_ptr(), str.len() as u32);
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
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    let writer = stream.send.as_mut().unwrap();
    let writenlen = RUNTIME.block_on(async move {
        match writer.write_all(buf).await {
            Ok(_) => buflen,
            Err(err) => {
                let mut str = err.to_string();
                SEND_FN.unwrap()(153, str.as_mut_ptr(), str.len() as u32);
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
    let buf = ::std::slice::from_raw_parts_mut(buf, buflen as usize);
    let readlen = RUNTIME.block_on(async move {
        match stream.recv.as_mut().unwrap().read(buf).await {
            Ok(len) => len,
            Err(err) => {
                let mut strs = err.to_string();
                SEND_FN.unwrap()(154, strs.as_mut_ptr(), strs.len() as u32);
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
    let sendstream = stream.send.as_mut().unwrap();
    RUNTIME.block_on(async move {
        match sendstream.finish().await {
            Ok(_) => drop(stream_ptr.as_ref()),
            Err(err) => {
                let mut msg = err.to_string();
                SEND_FN.unwrap()(150, msg.as_mut_ptr(), msg.len() as u32);
            }
        }
    });
}

#[no_mangle]
pub unsafe extern "C" fn proc_recvtream_stop(stream_ptr: *mut BidiStreams) {
    assert!(!stream_ptr.is_null());
    let stream = &mut *stream_ptr;
    RUNTIME.block_on(async move {
        match stream.recv.as_mut().unwrap().stop(0).await {
            Ok(_) => drop(stream_ptr.as_ref()),
            Err(_) => {
                SEND_FN.unwrap()(158, std::ptr::null_mut(), 0);
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
