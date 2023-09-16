use flume::{Sender, Receiver};
use wtransport::{Connection, datagram::Datagram};

pub struct Conn {
	pub conn: Connection,
	pub buffer: Option<&'static mut [u8]>,
	pub datagram_ch_sender: Sender<Datagram>,
	pub datagram_ch_receiver: Receiver<Datagram>,
}


impl Conn {
	pub(crate) fn new(conn: Connection) -> Self {
		let (sender, receiver) = flume::unbounded();

		Self {
			conn,
			buffer: None,
			datagram_ch_sender: sender,
			datagram_ch_receiver: receiver,
		}
	}
}