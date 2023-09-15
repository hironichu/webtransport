use flume::{Sender, Receiver};
use wtransport::{Connection, datagram::Datagram};


pub struct ClientConn {
	pub conn: Connection,
	pub datagram_ch_sender: Sender<Datagram>,
	pub datagram_ch_receiver: Receiver<Datagram>,
}


impl ClientConn {
	pub(crate) fn new(conn: Connection) -> Self {
		let (sender, receiver) = flume::unbounded();
		Self {
			conn,
			datagram_ch_sender: sender,
			datagram_ch_receiver: receiver,
		}
	}
}