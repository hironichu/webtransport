use crate::RUNTIME;
use std::{collections::HashMap, future::Future, marker::PhantomData, pin::Pin};
use wtransport::{datagram::Datagram, endpoint::SessionRequest, Connection};
use wtransport_proto::varint::VarInt;

type DynFutureIncomingSession = dyn Future<Output = Result<(), ()>> + Send + Sync;

impl<Side: std::marker::Send> Conn<Side> {
    //TODO(hironichu): Add generic methods for openning and closing streams instead of doing it in both client and server.
    pub async fn closed(&mut self) {
        let conn = self.conn.as_ref().unwrap();
        conn.closed().await
    }

    pub fn open_uni(&'static mut self) {
        println!("To be implemented");
        // executor::spawn(async move {
        //     let conn = self.conn.as_ref().unwrap();
        //     let stream = conn.open_uni().await.unwrap();
        //     stream.await.unwrap();
        // })
        // .detach();
    }
    pub fn open_bi(&'static mut self) {
        println!("To be implemented");
        // executor::spawn(async move {
        //     let conn = self.conn.as_ref().unwrap();
        //     let stream = conn.open_bi().await.unwrap();
        //     stream.await.unwrap();
        // })
        // .detach();
    }
    pub fn close(&mut self, code: u32, reason: Option<&[u8]>) {
        let reason = match reason {
            Some(reason) => reason,
            None => b"closed",
        };
        self.conn
            .as_ref()
            .unwrap()
            .close(VarInt::from_u32(code), reason);
    }
}

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
    pub fn datagrams(&mut self) -> Result<Datagram, usize> {
        let stream = RUNTIME.block_on(async move {
            let conn = self.conn.as_ref().unwrap();
            conn.receive_datagram().await
        });
        match stream {
            Ok(dgram) => Ok(dgram),
            _ => {
                //We should close the connection from Deno.
                // conn.closed().await;
                //TODO(hironichu): Send action to Deno to free the pointer and buffer
                // SEND_FN.unwrap()(client, std::ptr::null_mut(), 0);
                Err(0)
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
