use flume::{Receiver, Sender};
use wtransport::{datagram::Datagram, Connection};
use wtransport_proto::varint::VarInt;

use crate::executor;
pub struct Conn {
    pub conn: Connection,
    pub buffer: Option<&'static mut [u8]>,
    pub datagram_ch_sender: Sender<Datagram>,
    pub datagram_ch_receiver: Receiver<Datagram>,
}

impl Conn {
    pub(crate) fn new(conn: Connection) -> Self {
        let (sender, receiver) = flume::bounded(2);

        Self {
            conn,
            buffer: None,
            datagram_ch_sender: sender,
            datagram_ch_receiver: receiver,
        }
    }
    //TODO(hironichu): Add generic methods for openning and closing streams instead of doing it in both client and server.
    pub async fn closed(&mut self) {
        self.conn.closed().await
    }

    pub fn close(&mut self, code: u32, reason: Option<&[u8]>) {
        let reason = match reason {
            Some(reason) => reason,
            None => b"closed",
        };
        self.conn.close(VarInt::from_u32(code), reason);
    }

    pub fn datagrams(&'static mut self) {
        executor::spawn(async move {
            loop {
                tokio::select! {
                    stream = self.conn.receive_datagram() => {
                        match stream {
                            Ok(dgram) => match self.datagram_ch_sender.send_async(dgram).await {
                                Ok(_) => {}
                                Err(_) => {
                                    //We should close the connection from Deno.
                                    self.conn.closed().await;
                                    // SEND_FN.unwrap()(client, std::ptr::null_mut(), 0);
                                    return ;
                                }
                            },
                            _ => {
                                 //We should close the connection from Deno.
                                 self.conn.closed().await;
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
}
