import { StreamID } from "../mod.ts";
import type { ServerConfig } from "./config.ts";
import type { ClientTransportType } from "./internal.ts";
import { Client } from "./client.ts";
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
    maxIdleTimeout = 12000,
    keepAliveInterval = 1200,
  ): Promise<void> {
    this.certHash.set(await this.config.certHash());

    this.listener = this.quickEndpoint.listen({
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
      try {
        const webtransport = await Deno.upgradeWebTransport(conn);
        return this.createClient<WebTransport>(webtransport);
      } catch {
        console.error("Error while upgrading connection");
        return undefined;
      }
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
