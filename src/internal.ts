//Copyright (c) 2025, Hironichu. All rights reserved.
import {
  type BidirectionalStream,
  type ReceiveStream,
  type SendStream,
  StreamID,
} from "./types/streamdef.ts";

import type {
  ClientQcInterface,
  ClientWTInterface,
} from "./types/interfaces.ts";

export type ClientType = "WT" | "QC";

/**
 * A class representing a WebTransport client.
 *
 * @example
 * ```ts
 * import { Client } from "@webtransport/webtransport";
 * ... server code ...
 * const client = new Client(transport);
 * ```
 *
 * @module
 */
export class WtClient implements ClientWTInterface<WebTransport> {
  public readonly bidirectionalStreams: WeakMap<StreamID, BidirectionalStream> =
    new WeakMap<StreamID, BidirectionalStream>();

  public readonly sendStream: WeakMap<StreamID, SendStream> = new WeakMap<
    StreamID,
    SendStream
  >();

  public readonly receiveStream: WeakMap<StreamID, ReceiveStream> = new WeakMap<
    StreamID,
    ReceiveStream
  >();

  public constructor(
    public readonly transport: WebTransport,
    public readonly signal: AbortController,
  ) {
    this.transport.closed.then(() => {
      this.signal.abort();
    }).catch((e) => {
      this.signal.abort(e);
    });
  }

  /**
   * Returns the stream associated with the given stream ID.
   * @param {StreamID} streamID - The ID of the stream to retrieve.
   * @returns {BidirectionalStream | SendStream | ReceiveStream | undefined} The stream associated with the given ID, or undefined if not found.
   */
  getStream(
    streamID: StreamID,
  ): BidirectionalStream | SendStream | ReceiveStream | undefined {
    if (this.bidirectionalStreams.has(streamID)) {
      return this.bidirectionalStreams.get(streamID);
    } else if (this.sendStream.has(streamID)) {
      return this.sendStream.get(streamID);
    } else if (this.receiveStream.has(streamID)) {
      return this.receiveStream.get(streamID);
    }
    console.error("WTClient: invalid streamid");
    return undefined;
  }

  /**
   * Opens a send stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID.
   */
  async openSendStream(
    sendGroup?: WebTransportSendGroup,
  ): Promise<StreamID | undefined> {
    if (this.signal.signal.aborted) {
      return undefined;
    }
    try {
      const stream = await this.transport.createUnidirectionalStream({
        sendGroup,
        waitUntilAvailable: true,
      });
      const id = new StreamID();
      this.sendStream.set(id, stream);
      return id;
    } catch {
      //
    }
  }

  /**
   * Opens a receive stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID.
   */
  async openReceiveStream(): Promise<StreamID | undefined> {
    if (this.signal.signal.aborted) {
      return undefined;
    }
    try {
      const rstream = this.transport.incomingUnidirectionalStreams;
      const stream = (await rstream.getReader().read()).value;
      if (!stream) {
        return undefined;
      }
      const id = new StreamID();
      this.receiveStream.set(id, stream);
      return id;
    } catch {
      // console.error("QC_Client: Error while waiting for an incoming stream");
      return undefined;
    }
  }

  /**
   * Opens a bidirectional stream over the transport.
   * @returns {Promise<StreamID>} A promise that resolves to the stream ID.
   */
  async openBidirectionalStream(): Promise<StreamID | undefined> {
    if (this.signal.signal.aborted) {
      return undefined;
    }
    try {
      const bidistream = this.transport.incomingBidirectionalStreams;

      const stream = (await bidistream.getReader().read()).value;
      if (!stream) {
        return undefined;
      }
      const id = new StreamID();
      this.bidirectionalStreams.set(id, stream);
      return id;
    } catch {
      // console.error("WTClient: Error while waiting for an incoming stream");
      return undefined;
    }
  }

  /**
   * Sends datagrams over the transport.
   * @param {Uint8Array} buffer - The datagram to send.
   * @returns {Promise<void | undefined>} A promise that resolves when the datagram is sent, or undefined if not supported.
   */
  close(closeInfo?: WebTransportCloseInfo): void {
    try {
      this.transport.close(closeInfo);
    } catch {
      console.error("[WTClient] Error while closing transport");
    }
  }
}

/**
 * A class representing a QUIC client.
 *
 * @example
 * ```ts
 * import { Client } from "@webtransport/webtransport";
 * const client = new Client(transport);
 * ```
 *
 * @module
 */
export class QcClient implements ClientQcInterface<Deno.QuicConn> {
  public readonly bidirectionalStreams: WeakMap<StreamID, BidirectionalStream> =
    new WeakMap<StreamID, BidirectionalStream>();
  public readonly sendStream: WeakMap<StreamID, SendStream> = new WeakMap<
    StreamID,
    SendStream
  >();
  public readonly receiveStream: WeakMap<StreamID, ReceiveStream> = new WeakMap<
    StreamID,
    ReceiveStream
  >();

  #readableController: ReadableByteStreamController | undefined;

  public constructor(
    public readonly transport: Deno.QuicConn,
    public readonly signal: AbortController,
  ) {
    // console.debug("QC_Client: New Webtransport Client initialized");
    this.transport.closed
      .then((e) => {
        this.signal.abort(e);
      })
      .catch((e) => {
        // console.error("QC_Client: Error while closing transport", e);
        this.signal.abort(e);
      });
    Promise.all([
      (async () => {
        await this.#receiveDatagrams();
      })(),
    ]);
  }
  /**
   * Returns the stream associated with the given stream ID.
   * @param {StreamID} streamID - The ID of the stream to retrieve.
   * @returns {BidirectionalStream | SendStream | ReceiveStream | undefined} The stream associated with the given ID, or undefined if not found.
   */
  getStream(
    streamID: StreamID,
  ): SendStream | BidirectionalStream | ReceiveStream | undefined {
    if (this.bidirectionalStreams.has(streamID)) {
      return this.bidirectionalStreams.get(streamID);
    } else if (this.sendStream.has(streamID)) {
      return this.sendStream.get(streamID);
    } else if (this.receiveStream.has(streamID)) {
      return this.receiveStream.get(streamID);
    }
    // console.error("QC_Client: invalid streamid");
    return undefined;
  }
  /**
   * Opens a send stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID.
   */
  async openSendStream(): Promise<StreamID | undefined> {
    try {
      const stream = await this.transport.createUnidirectionalStream({
        // sendGroup?: WebTransportSendGroup;
        waitUntilAvailable: true,
      });
      const id = new StreamID();
      this.sendStream.set(id, stream);
      return id;
    } catch {
      //
    }
  }
  /**
   * Opens a receive stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID.
   */
  async openReceiveStream(): Promise<StreamID | undefined> {
    try {
      const rstream = this.transport.incomingUnidirectionalStreams;
      const stream = (await rstream.getReader().read()).value;
      if (!stream) {
        return undefined;
      }
      const id = new StreamID();
      this.receiveStream.set(id, stream);
      return id;
    } catch {
      // console.error("QC_Client: Error while waiting for an incoming stream");
      return undefined;
    }
  }
  /**
   * Opens a bidirectional stream over the transport.
   * @returns {Promise<StreamID>} A promise that resolves to the stream ID.
   */
  async openBidirectionalStream(): Promise<StreamID | undefined> {
    try {
      const bidistream = this.transport.incomingBidirectionalStreams;
      const stream = (await bidistream.getReader().read()).value;
      if (!stream) {
        return undefined;
      }
      const id = new StreamID();
      this.bidirectionalStreams.set(id, stream);
      return id;
    } catch {
      // console.error("QC_Client: Error while waiting for an incoming stream");
      return undefined;
    }
  }
  /**
   * Sends datagrams over the transport.
   * @param {Uint8Array} buffer - The datagram to send.
   * @returns {Promise<void | undefined>} A promise that resolves when the datagram is sent, or undefined if not supported.
   */
  async sendDatagrams(buffer: Uint8Array): Promise<void | undefined> {
    try {
      return await this.transport.sendDatagram(buffer);
    } catch (_) {
      // console.error("Error while sending datagrams", e);
      return undefined;
    }
  }
  /**
   * Returns a readable stream for receiving datagrams.
   * @returns {ReadableStream<Uint8Array<ArrayBufferLike>>} A readable stream of datagrams.
   */
  get readable(): ReadableStream<Uint8Array<ArrayBufferLike>> {
    return new ReadableStream({
      type: "bytes",
      start: (controller) => {
        this.#readableController = controller;
      },
    });
  }

  async #receiveDatagrams() {
    while (true) {
      let datagram;
      try {
        datagram = await this.transport.readDatagram();
        if (
          !datagram ||
          this.#readableController === undefined ||
          this.signal.signal.aborted
        ) {
          break;
        }
        this.#readableController!.enqueue(datagram);
      } catch {
        break;
      }
    }
  }
  /**
   * Receives datagrams from the transport.
   * @returns {ReadableStream<Uint8Array<ArrayBufferLike>> | undefined} A readable stream of datagrams, or undefined if not supported.
   */
  receiveDatagrams(): ReadableStream<Uint8Array<ArrayBufferLike>> | undefined {
    try {
      return this.readable;
    } catch {
      // console.error("Error while receiving datagrams");
      return undefined;
    }
  }
  close(info?: Deno.QuicCloseInfo): void {
    this.transport.close(info);
  }
} // QUIC Client
