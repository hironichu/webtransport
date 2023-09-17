use flume::{Receiver, Sender};
use wtransport::{datagram::Datagram, Connection};

pub struct Conn {
    pub conn: Connection,
    pub buffer: Option<&'static mut [u8]>,
    pub datagram_ch_sender: Sender<Datagram>,
    pub datagram_ch_receiver: Receiver<Datagram>,
}

impl Conn {
    pub(crate) fn new(conn: Connection) -> Self {
        let (sender, receiver) = flume::bounded(1);

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
}
