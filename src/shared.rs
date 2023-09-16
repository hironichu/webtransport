use std::slice::from_raw_parts_mut;
use tokio::runtime::Runtime;
use crate::connection::Conn;

#[no_mangle]
pub unsafe extern "C" fn proc_recv_datagram(
    conn_ptr: *mut Conn,
) -> usize {
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
    connptr: *mut Conn,
    buf: *const u8,
    buflen: u32,
) {
    assert!(!connptr.is_null());

    let client = &mut *connptr;
    let buf = ::std::slice::from_raw_parts(buf, buflen as usize);
    match client.conn.send_datagram(buf) {
        Ok(_) => {}
        Err(e) => {
            //TODO: Handle error better
            println!("Error sending datagram: {:?}", e);
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn free_conn(_: *mut Conn) {}

#[no_mangle]
pub unsafe extern "C" fn free_runtime(_: *mut Runtime) {}