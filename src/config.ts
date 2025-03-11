//Copyright (c) 2025, Hironichu. All rights reserved.
import { assert } from "@std/assert/assert";
import { decodeBase64 } from "@std/encoding/base64";
export type alpnProtocols = Array<"h3" | "h3-qc" | string>;

export class ServerConfig {
  private readonly alpnProtocols: alpnProtocols = ["h3", "h3-29"];
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
