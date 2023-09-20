use crate::{
    connection::{Conn, Server},
    SEND_FN,
};
use core::panic;
use std::slice::from_raw_parts_mut;
use tokio::runtime::Runtime;
use wtransport::error::SendDatagramError;

#[no_mangle]
pub unsafe extern "C" fn proc_recv_datagram(conn_ptr: *mut Conn<Server>) -> usize {
    let client = &mut *conn_ptr;
    match client.datagram_ch_receiver.recv() {
        Ok(dgram) => {
            from_raw_parts_mut(client.buffer.as_mut().unwrap().as_mut_ptr(), dgram.len())
                .clone_from_slice(&dgram);
            dgram.len()
        }
        Err(_) => 0,
    }
}

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
                    SEND_FN.unwrap()(0, vec![0].as_mut_ptr(), 1);
                }
                SendDatagramError::TooLarge => {
                    println!("DBG: Rust Too large");
                    SEND_FN.unwrap()(0, vec![0].as_mut_ptr(), 1);
                }
                SendDatagramError::UnsupportedByPeer => {
                    println!("DBG: Rust not supported by peer");
                    SEND_FN.unwrap()(0, vec![0].as_mut_ptr(), 1);
                }
            };
        }
    }
}
#[no_mangle]
pub unsafe extern "C" fn proc_init_datagrams(
    conn_ptr: *mut Conn<Server>,
    buffer: *mut u8,
    buflen: usize,
) {
    assert!(!conn_ptr.is_null());

    let connection = &mut *conn_ptr;
    connection.buffer = Some(from_raw_parts_mut(buffer, buflen));
    connection.datagrams();
}

#[no_mangle]
pub unsafe extern "C" fn proc_open_bi(connptr: *mut Conn<Server>, _buf: *mut u8) {
    assert!(!connptr.is_null());

    let _client = &mut *connptr;
    //return not implemented
    panic!("Not implemented");
    // executor::spawn(async move {
    //     let stream = client.conn.open_bi().await.unwrap();
    // 	stream.await.unwrap().
    // })
    // .detach();
    // let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    // match client.conn.send_datagram(buf) {
    //     Ok(_) => {}
    //     Err(e) => {
    //         //TODO: Handle error better
    //         println!("Error sending datagram: {:?}", e);
    //     }
    // }
}
#[no_mangle]
pub unsafe extern "C" fn free_conn(_: *mut Conn<Server>) {}

#[no_mangle]
pub unsafe extern "C" fn free_runtime(_: *mut Runtime) {}
