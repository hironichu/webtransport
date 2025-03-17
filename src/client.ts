import type {
  BidirectionalStream,
  ReceiveStream,
  SendStream,
  StreamID,
} from "../mod.ts";
import { QcClient, WtClient } from "./internal.ts";
import type { ClientTransportType } from "./types/interfaces.ts";
/**
 * A class representing a WebTransport and QUIC client.
 *
 * @example
 * ```ts
 * import { Client } from "@webtransport/webtransport";
 * const client = new Client(transport);
 * ```
 *
 * @module
 */
export class Client<Type extends ClientTransportType> {
  private readonly client: WtClient | QcClient;
  public readonly signal: AbortController = new AbortController();
  /**
   * Creates a new Client instance.
   * @param {Type} transport - The transport protocol (WebTransport or QUIC).
   * @throws {Error} If the transport type is not supported.
   */
  public constructor(public readonly transport: Type) {
    if (transport.constructor.name === "WebTransport") {
      this.client = new WtClient(transport as WebTransport, this.signal);
      transport.closed.then(() => {
        this.signal.abort();
      }).catch((e) => {
        this.signal.abort(e);
      });
    } else if (transport.constructor.name === "QuicConn") {
      this.client = new QcClient(transport as Deno.QuicConn, this.signal);
    } else {
      throw new Error(
        `Unsupported transport type: ${transport.constructor.name}`,
      );
    }
  }
  /**
   * Returns the stream associated with the given stream ID.
   * @param {StreamID} id - The ID of the stream to retrieve.
   * @returns {BidirectionalStream | SendStream | ReceiveStream | undefined} The stream associated with the given ID, or undefined if not found.
   */
  getStream(
    id: StreamID,
  ): BidirectionalStream | SendStream | ReceiveStream | undefined {
    return this.client.getStream(id);
  }
  /**
   * Opens a send stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID, or undefined if not supported.
   */
  openSendStream(): Promise<StreamID | undefined> {
    return this.client.openSendStream();
  }
  /**
   * Opens a receive stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID, or undefined if not supported.
   */
  openReceiveStream(): Promise<StreamID | undefined> | undefined {
    try {
      return this.client.openReceiveStream();
    } catch {
      console.error("Error while opening receive stream");
      return undefined;
    }
  }
  /**
   * Opens a bidirectional stream over the transport.
   * @returns {Promise<StreamID | undefined>} A promise that resolves to the stream ID, or undefined if not supported.
   */
  openBidirectionalStream(): Promise<StreamID | undefined> | undefined {
    try {
      return this.client.openBidirectionalStream();
    } catch {
      console.error("Error while opening bidirectional stream");
      return undefined;
    }
  }
  /**
   * Sends datagrams over the transport.
   * @param {Uint8Array<ArrayBufferLike>} buffer - The datagram to send.
   * @returns {Promise<void> | undefined} A promise that resolves when the datagram is sent, or undefined if not supported.
   */
  sendDatagrams(
    buffer: Uint8Array<ArrayBufferLike>,
  ): Promise<void> | undefined {
    // Check if we are using WebTransport or QUIC
    if (this.client instanceof WtClient) {
      console.error("Error: sendDatagrams is not supported for WebTransport");
      return undefined;
    }
    return this.client.sendDatagrams(buffer);
  }

  /**
   * Receives datagrams from the transport.
   * @returns {ReadableStream<Uint8Array<ArrayBufferLike>> | undefined} A readable stream of datagrams, or undefined if not supported.
   */
  receiveDatagrams(): ReadableStream<Uint8Array<ArrayBufferLike>> | undefined {
    // Check if we are using WebTransport or QUIC
    if (this.client instanceof WtClient) {
      console.error(
        "Error: receiveDatagrams is not supported for WebTransport",
      );
      return undefined;
    } else {
      return this.client.receiveDatagrams();
    }
  }
  /**
   * Closes the inner transport
   * @returns undefined
   */
  close(): void {
    return this.client.close();
  }
}
