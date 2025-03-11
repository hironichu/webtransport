import {
  BidirectionalStream,
  ReceiveStream,
  SendStream,
  StreamID,
} from "./streamdef.ts";

export interface ClientQcInterface<T> {
  transport: T;
  bidirectionalStreams: WeakMap<StreamID, BidirectionalStream>;
  sendStream: WeakMap<StreamID, SendStream>;
  receiveStream: WeakMap<StreamID, ReceiveStream>;
  // STREAMS
  getStream(
    streamID: StreamID,
  ): BidirectionalStream | SendStream | ReceiveStream | undefined;
  // receiveFromStream(streamID: StreamID): Promise<Uint8Array<ArrayBufferLike> | undefined>;
  // UNI STREAMS
  openSendStream(): Promise<StreamID | undefined>;
  openReceiveStream(): Promise<StreamID | undefined>;
  openBidirectionalStream(): Promise<StreamID | undefined>;
  // DATAGRAMS
  sendDatagrams(buffer: Uint8Array<ArrayBufferLike>): Promise<void>;
  receiveDatagrams():
    | Promise<Uint8Array<ArrayBuffer> | undefined>
    | Promise<Uint8Array<ArrayBufferLike> | undefined>
    | boolean
    | ReadableStream<Uint8Array<ArrayBufferLike>>
    | undefined
    | void;
  signal: AbortController;
  close(info?: Deno.QuicCloseInfo | WebTransportCloseInfo): void;
}

export interface ClientWTInterface<T> {
  transport: T;
  bidirectionalStreams: WeakMap<StreamID, BidirectionalStream>;
  sendStream: WeakMap<StreamID, SendStream>;
  receiveStream: WeakMap<StreamID, ReceiveStream>;
  // STREAMS
  getStream(
    streamID: StreamID,
  ): BidirectionalStream | SendStream | ReceiveStream | undefined;
  // receiveFromStream(streamID: StreamID): Promise<Uint8Array<ArrayBufferLike> | undefined>;
  // UNI STREAMS
  openSendStream(): Promise<StreamID | undefined>;
  openReceiveStream(): Promise<StreamID | undefined>;
  openBidirectionalStream(): Promise<StreamID | undefined>;

  signal: AbortController;
  close(info?: Deno.QuicCloseInfo | WebTransportCloseInfo): void;
}
