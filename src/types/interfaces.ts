//Copyright (c) 2025, Hironichu. All rights reserved.
import type {
  BidirectionalStream,
  ReceiveStream,
  SendStream,
  StreamID,
} from "./streamdef.ts";

/**
 * ClientQcInterface interface for QUIC client.
 * @interface ClientQcInterface
 * @param {T} transport - The transport protocol.
 * @param {WeakMap<StreamID, BidirectionalStream>} bidirectionalStreams - The bidirectional streams.
 * @param {WeakMap<StreamID, SendStream>} sendStream - The send streams.
 * @param {WeakMap<StreamID, ReceiveStream>} receiveStream - The receive streams.
 * @description This interface is used to define the QUIC client with the specified parameters.
 * It provides methods to get the stream, open a stream, send datagrams, receive datagrams, and close the connection.
 * @example
 * ```typescript
 * const clientQcInterface = new ClientQc(
 *   transport,
 * );
 */
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

/**
 * ClientWTInterface interface for WebTransport client.
 * @interface ClientWTInterface
 * @param {T} transport - The transport protocol.
 * @param {WeakMap<StreamID, BidirectionalStream>} bidirectionalStreams - The bidirectional streams.
 * @param {WeakMap<StreamID, SendStream>} sendStream - The send streams.
 * @param {WeakMap<StreamID, ReceiveStream>} receiveStream - The receive streams.
 * @description This interface is used to define the WebTransport client with the specified parameters.
 * It provides methods to get the stream, open a stream, and close the connection.
 * @example
 * ```typescript
 * const clientWTInterface = new ClientWT(
 *   transport,
 * );
 */
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
