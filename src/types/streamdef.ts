//Copyright (c) 2025, Hironichu. All rights reserved.

/**
 * StreamID class for QUIC stream ID.
 * @class StreamID
 * @description This class is used to generate a random stream ID for QUIC.
 * @example
 * ```typescript
 * const streamID = new StreamID();
 * ```
 */
export class StreamID {
  #id: number;
  constructor() {
    this.#id = crypto.getRandomValues(new Uint32Array(1))[0];
  }
  get value(): number {
    return this.#id;
  }
}

export type BidirectionalStream =
  | WebTransportBidirectionalStream
  | Deno.QuicBidirectionalStream;
export type SendStream = WebTransportSendStream | Deno.QuicSendStream;
export type ReceiveStream = WebTransportReceiveStream | Deno.QuicReceiveStream;
export type Datagrams = WebTransportDatagramDuplexStream;
