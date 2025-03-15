//Copyright (c) 2025, Hironichu. All rights reserved.
import { assert } from "@std/assert/assert";
import { decodeBase64 } from "@std/encoding/base64";
export type alpnProtocols = Array<
  "h3" | "h3-qc-01" | "quic" | "h3-29" | string
>;

/**
 * ServerConfig class for QUIC server configuration.
 * @class ServerConfig
 * @param {string}
 * @param {number} port - The port number for the server.
 * @param {string} certFile - The path to the certificate file.
 * @param {string} keyFile - The path to the key file.
 * @param {string} [separateProtocol] - Optional separate protocol for ALPN.
 * @description This class is used to configure the QUIC server with the specified parameters.
 * It validates the port number and reads the certificate and key files.
 * It also provides methods to get the server configuration and calculate the certificate hash.
 * @example
 * ```typescript
 * const serverConfig = new ServerConfig(
 *   "localhost",
 *   4433,
 *   "./cert.pem",
 *   "./key.pem",
 *   "my-protocol"
 * );
 * ```
 * @throws {Error} If the port number is not between 1 and 65535.
 * @throws {Error} If the certificate or key file cannot be read.
 * @throws {Error} If the certificate hash cannot be calculated.
 * @throws {Error} If the ALPN protocol is not supported.
 *
 * @module
 */
export class ServerConfig {
  public readonly alpnProtocols: alpnProtocols = [
    "h3",
    "h3-qc-01",
    "h3-29",
  ];
  private readonly quicOptions: Deno.QuicEndpointOptions;
  constructor(
    private readonly hostmame: string,
    private readonly port: number,
    private readonly certFile: string,
    private readonly keyFile: string,
    public readonly separateProtocol?: string,
  ) {
    assert(
      port > 0 && port < 65536,
      "Port must be between 1 and 65535",
    );
    assert(Deno.statSync(certFile).isFile, "Certificate file does not exist");
    assert(Deno.statSync(keyFile).isFile, "Key file does not exist");
    this.port = port;

    this.certFile = Deno.readTextFileSync(certFile);
    this.keyFile = Deno.readTextFileSync(keyFile);

    this.quicOptions = {
      hostname: this.hostmame,
      port: this.port,
    };
    if (separateProtocol) {
      this.alpnProtocols.push(separateProtocol);
    }
  }

  get getPort(): number {
    return this.port;
  }

  get getHostname(): string {
    return this.hostmame;
  }

  get getAlpnProtocols(): alpnProtocols {
    return this.alpnProtocols;
  }

  get getQuicOptions(): Deno.QuicEndpointOptions {
    return this.quicOptions;
  }

  get getCertFile(): string {
    return this.certFile;
  }

  get getKeyFile(): string {
    return this.keyFile;
  }

  public async certHash(): Promise<Uint8Array<ArrayBufferLike>> {
    const certHash = await crypto.subtle.digest(
      "SHA-256",
      decodeBase64(this.certFile.split("\n").slice(1, -2).join("")),
    );

    return new Uint8Array(certHash);
  }
}
