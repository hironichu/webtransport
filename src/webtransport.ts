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
import type { ServerConfig } from "./config.ts";

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

  public readonly signal: AbortController = new AbortController();
  public constructor(public readonly transport: WebTransport) {
    // console.debug("WtClient: New Webtransport Client initialized");
    this.transport.closed.then(() => {
      // console.debug("WT_Client: Transport closed");
      this.signal.abort();
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
  async openSendStream(): Promise<StreamID | undefined> {
    if (this.signal.signal.aborted) {
      return undefined;
    }
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
      console.error("QC_Client: Error while waiting for an incoming stream");
      return undefined;
    }
  }

  /**
   * Opens a bidirectional stream over the transport.
   * @returns {Promise<StreamID>} A promise that resolves to the stream ID.
   */
  openBidirectionalStream(): Promise<StreamID> {
    throw new Error("Method not implemented.");
  }

  /**
   * Sends datagrams over the transport.
   * @param {Uint8Array} buffer - The datagram to send.
   * @returns {Promise<void | undefined>} A promise that resolves when the datagram is sent, or undefined if not supported.
   */
  close(closeInfo?: WebTransportCloseInfo): void {
    try {
      this.transport.close(closeInfo);
      this.signal.abort();
    } catch {
      console.error("Error while closing transport");
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
class QcClient implements ClientQcInterface<Deno.QuicConn> {
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
  public readonly signal: AbortController = new AbortController();
  #readableController: ReadableByteStreamController | undefined;

  public constructor(public readonly transport: Deno.QuicConn) {
    // console.debug("QC_Client: New Webtransport Client initialized");
    this.transport.closed.then(() => {
      // console.debug("QC_Client: Transport closed");
      this.signal.abort();
    });
    //   Promise.all([(async () => {
    //   })()]);
    this.#receiveDatagrams();
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
    console.error("QC_Client: invalid streamid");
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
      console.error("QC_Client: Error while waiting for an incoming stream");
      return undefined;
    }
  }
  /**
   * Opens a bidirectional stream over the transport.
   * @returns {Promise<StreamID>} A promise that resolves to the stream ID.
   */
  openBidirectionalStream(): Promise<StreamID> {
    throw new Error("Method not implemented.");
  }
  /**
   * Sends datagrams over the transport.
   * @param {Uint8Array} buffer - The datagram to send.
   * @returns {Promise<void | undefined>} A promise that resolves when the datagram is sent, or undefined if not supported.
   */
  async sendDatagrams(buffer: Uint8Array): Promise<void | undefined> {
    try {
      return await this.transport.sendDatagram(buffer);
    } catch {
      console.error("Error while sending datagrams");
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
      console.error("Error while receiving datagrams");
      return undefined;
    }
  }
  close(info?: Deno.QuicCloseInfo): void {
    this.transport.close(info);
    this.signal.abort();
  }
} // QUIC Client

export type ClientTransportType = WebTransport | Deno.QuicConn;

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

  public constructor(
    public readonly transport: Type,
  ) {
    // console.debug("Client: New Client initialized");

    if (transport.constructor.name === "WebTransport") {
      this.client = new WtClient(transport as WebTransport);
    } else if (transport.constructor.name === "QuicConn") {
      this.client = new QcClient(transport as Deno.QuicConn);
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

/**
 * A class representing a WebTransport and QUIC server.
 *
 * @example
 * ```ts
 * import { Server } from "@webtransport/webtransport";
 * const config = new ServerConfig(
 *    "0.0.0.0", // hostname
 *    443, // port number
 *    "./cert.pem", // path to the certificate file
 *    "./private.pem", // path to the private key file
 *    "h3-qc", // optional argument that will be used for only for QUIC connection in the protocol negotation
 * );
 *
 * ```
 *
 * @module
 */
export class Server {
  private readonly quickEndpoint: Deno.QuicEndpoint;
  public listener: Deno.QuicListener | undefined;
  private readonly clients: WeakMap<StreamID, Client<ClientTransportType>> =
    new WeakMap<StreamID, Client<ClientTransportType>>();
  private readonly config: ServerConfig;
  public readonly certHash: Uint8Array<ArrayBufferLike> = new Uint8Array(32);

  public constructor(config: ServerConfig) {
    this.config = config;
    this.quickEndpoint = new Deno.QuicEndpoint(this.config.getQuicOptions);
  }

  public createClient<T extends ClientTransportType>(
    conn: T,
  ): [StreamID, Client<T>] | undefined {
    const client = new Client<T>(conn);
    const sid = new StreamID();
    this.clients.set(sid, client);

    return [sid, client];
  }

  /**
   * Starts the server and begins listening for incoming connections.
   * @returns {Promise<void>} A promise that resolves when the server is started.
   * @throws {TypeError} If the listener is already started.
   * @throws {Error} If the listener fails to start.
   * @example
   * ```ts
   * const server = new Server(config);
   * await server.start();
   *
   * for await (const conn of server.listener!) {
   *     const client = await server.handle(conn);
   *     if (client) {
   *         Promise.all([handle(client)]);
   *     }
   *  }
   *
   * async function handle(info: [StreamID, Client<ClientTransportType>]): void;
   * ...
   */
  public async start(
    maxIdleTimeout: number = 120000,
    keepAliveInterval: 500,
  ): Promise<void> {
    this.certHash.set(await this.config.certHash());

    this.listener = this.quickEndpoint.listen({
      congestionControl: "low-latency",
      cert: this.config.getCertFile,
      key: this.config.getKeyFile,
      alpnProtocols: this.config.getAlpnProtocols,
      maxIdleTimeout: maxIdleTimeout,
      keepAliveInterval: keepAliveInterval,
    });
  }

  /**
   * Handles incoming connections and creates a client instance.
   * @param {Deno.QuicConn} conn - The incoming connection.
   * @returns {Promise<[StreamID, Client<ClientTransportType>]>} A promise that resolves to a tuple containing the stream ID and the client instance.
   * @throws {TypeError} If the listener is not started.
   * @throws {Error} If the connection fails to upgrade.
   * @example
   * ```ts
   * const server = new Server(config);
   * await server.start();
   *
   * for await (const conn of server.listener!) {
   *    const client = await server.handle(conn);
   *   if (client) {
   *       Promise.all([handle(client)]);
   *   }
   * }
   *
   * async function handle(info: [StreamID, Client<ClientTransportType>]): void;
   * ...
   * ```
   */
  public async handle(
    conn: Deno.QuicConn,
  ): Promise<[StreamID, Client<ClientTransportType>] | undefined> {
    if (typeof this.listener == "undefined") {
      throw new TypeError("Server: Listener not started ");
    }

    if (
      this.config.separateProtocol &&
      conn.protocol === this.config.separateProtocol
    ) {
      return this.createClient<Deno.QuicConn>(conn);
    } else {
      const webtransport = await Deno.upgradeWebTransport(conn);
      return this.createClient<WebTransport>(webtransport);
    }
  }

  /**
   * Closes the server and stops listening for incoming connections.
   * @returns {void} A promise that resolves when the server is closed.
   * @throws {Error} If the listener fails to close.
   * @example
   * ```ts
   * const server = new Server(config);
   * await server.start();
   *
   * // Close the server after 10 seconds
   * setTimeout(() => {
   *     server.close();
   * }, 10000);
   * ```
   */
  public close(): void {
    if (this.listener) {
      this.listener.stop();
      this.quickEndpoint.close();
      console.debug("WTServer: Listener closed");
    } else {
      console.error("WTServer: Listener not started");
    }
  }
}
