use crate::RUNTIME;
use std::{collections::HashMap, future::Future, marker::PhantomData, pin::Pin};
use wtransport::{
    datagram::Datagram, endpoint::SessionRequest, error::ConnectionError, Connection, RecvStream,
    SendStream,
};
use wtransport_proto::varint::VarInt;

type DynFutureIncomingSession = dyn Future<Output = Result<(), ()>> + Send + Sync;

pub struct Server(Pin<Box<DynFutureIncomingSession>>);

/// Type of endpoint opening a WebTransport connection.
pub struct Client;

pub struct Conn<Side: std::marker::Send> {
    pub conn: Option<Connection>,
    pub accepted_session: Option<SessionRequest>,
    pub buffer: Option<&'static mut [u8]>,
    _marker: PhantomData<Side>,
}

impl<Side: std::marker::Send> Conn<Side> {
    pub fn read_datagram(&mut self) -> Result<Datagram, ConnectionError> {
        let conn = self.conn.as_ref().unwrap();
        let stream = RUNTIME.block_on(async move { conn.receive_datagram().await });
        match stream {
            Ok(dgram) => Ok(dgram),
            Err(error) => Err(error),
        }
    }

    pub async fn closed(&mut self) {
        let conn = self.conn.as_ref().unwrap();
        conn.closed().await
    }

    /// Open a unidirectional stream.
    pub fn open_uni(&'static mut self) -> Result<SendStream, ConnectionError> {
        let conn = self.conn.as_ref().unwrap();
        let stream = RUNTIME.block_on(async move {
            let stream = conn.open_uni().await;
            match stream {
                Ok(stream) => Ok(stream.await.unwrap()),
                Err(e) => Err(e),
            }
        });
        stream
    }

    /// Open a bidirectional stream.
    pub fn open_bi(&'static mut self) -> Result<(SendStream, RecvStream), ConnectionError> {
        let conn = self.conn.as_ref().unwrap();
        let stream = RUNTIME.block_on(async move {
            let stream = conn.open_bi().await;
            match stream {
                Ok(stream) => Ok(stream.await.unwrap()),
                Err(e) => Err(e),
            }
        });

        stream
    }

    /// Accept a unidirectional stream.
    pub fn accept_uni(&'static mut self) -> Result<RecvStream, ConnectionError> {
        let conn = self.conn.as_ref().unwrap();
        let stream = RUNTIME.block_on(async move {
            let stream = conn.accept_uni().await;
            match stream {
                Ok(stream) => Ok(stream),
                Err(e) => Err(e),
            }
        });
        stream
    }

    /// Accept a bidirectional stream.
    pub fn accept_bi(&'static mut self) -> Result<(SendStream, RecvStream), ConnectionError> {
        let conn = self.conn.as_ref().unwrap();
        let stream = RUNTIME.block_on(async move {
            let stream = conn.accept_bi().await;
            match stream {
                Ok(stream) => Ok(stream),
                Err(e) => Err(e),
            }
        });
        stream
    }

    /// Close the connection.
    pub fn close(&mut self, code: u32, reason: Option<&[u8]>) {
        let reason = match reason {
            Some(reason) => reason,
            None => b"closed",
        };
        let conn = self.conn.as_ref();
        match conn {
            Some(conn) => {
                conn.close(VarInt::from_u32(code), reason);
                drop(self.conn.take())
            }
            None => {
                println!("Connection is None");
            }
        }
    }
}

impl Conn<Server> {
    pub(crate) fn new(accepted_session: SessionRequest) -> Self {
        Self {
            conn: None,
            accepted_session: Some(accepted_session),
            buffer: None,
            _marker: PhantomData,
        }
    }
    pub fn accepted(&mut self, conn: Connection) {
        self.conn = Some(conn);
    }
    pub async fn accept(&mut self) -> Result<Connection, wtransport::error::ConnectionError> {
        let accepted_session = self.accepted_session.take().unwrap();
        accepted_session.accept().await
    }
    pub fn path(&self) -> &str {
        self.accepted_session.as_ref().unwrap().path()
    }
    pub fn authority(&self) -> &str {
        self.accepted_session.as_ref().unwrap().authority()
    }
    pub fn headers(&self) -> &HashMap<String, String> {
        self.accepted_session.as_ref().unwrap().headers()
    }
}

impl Conn<Client> {
    pub(crate) fn new(conn: Connection) -> Self {
        Self {
            conn: Some(conn),
            accepted_session: None,
            buffer: None,
            _marker: PhantomData,
        }
    }
}
