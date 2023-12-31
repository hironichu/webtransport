if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import WebTransportConnection from "./connection.ts";
import { GenerateCertKeyFile } from "./crypto.ts";
import { EventEmitter } from "./deps.ts";
import {
    type WebTransportServerOptions,
    WebTransportServerOptions as ServerOpts,
} from "./interface.ts";
import { encodeBuf } from "./utils.ts";

export type WebTransportServerEvents = {
    listening: [Event];
    connection: [WebTransportConnection];
    event: [MessageEvent];
    // Error Event
    error: [ErrorEvent | string];
    // Close Event
    close: [CloseEvent];
};

export class WebTransportServer extends EventEmitter<WebTransportServerEvents> {
    public connections: Map<number, WebTransportConnection> = new Map();
    #SRV_PTR: Deno.PointerValue<unknown> | undefined;

    #CONNECTION_CB = new Deno.UnsafeCallback(
        {
            parameters: ["pointer"],
            result: "void",
        },
        this.connection.bind(this),
    );
    constructor(
        _url: URL | string,
        _options: WebTransportServerOptions = ServerOpts,
    ) {
        super();
        //if _url is a string, we need to convert it to an URL
        if (typeof _url === "string") {
            _url = new URL(_url);
        }
        if (_url.port.length == 0) {
            throw new TypeError("Invalid port");
        }
        if (_url.protocol != "https:") {
            throw new TypeError("Invalid protocol");
        }
        if (_url.hostname.length == 0) {
            throw new TypeError("Invalid hostname");
        }
        _options.domain ??= _url.hostname ?? Deno.hostname();

        const [certificate, key] = this.checkArgs(_options);

        const certbuf = encodeBuf(certificate);
        const keybuf = encodeBuf(key);

        this.#SRV_PTR = window.WTLIB.symbols.proc_server_init(
            parseInt(_url.port),
            true,
            _options.keepAlive,
            _options.maxTimeout,
            certbuf[0],
            certbuf[1],
            keybuf[0],
            keybuf[1],
        );

        if (!this.#SRV_PTR) {
            throw new Error("Failed to initialize server");
        }

        this.#CONNECTION_CB.ref();
        this.emit("listening", new Event("listening"));
    }
    /**
     * @callback connection
     * @param {Deno.PointerValue<unknown>} client
     * @returns {void}
     * @description This function is called when a new connection is received from the server
     */
    private connection(client: Deno.PointerValue<unknown>) {
        const SHARED_BUF = new ArrayBuffer(65536);
        const CONN_BUFFER = new Uint8Array(SHARED_BUF);

        const conn = new WebTransportConnection(
            client,
            CONN_BUFFER,
        );

        this.connections.set(
            this.connections.size,
            conn,
        );
        this.emit("connection", conn);
    }

    async close() {
        console.info("[JS] SERVER CLOSE CALLED");
        //free all the connections
        if (this.#SRV_PTR) {
            if (this.connections.size > 0) {
                await window.WTLIB.symbols.proc_server_close_clients(
                    this.#SRV_PTR,
                );
            }
        }
        this.connections.forEach((conn, id) => {
            if (conn.state != "closed" && conn.pointer) {
                window.WTLIB.symbols.proc_client_close(
                    conn.pointer,
                );
                window.WTLIB.symbols.free_conn(conn.pointer);
                conn.state = "closed";
            }
            this.connections.delete(id);
        });

        this.#CONNECTION_CB.close();
        await new Promise((r) => {
            setTimeout(() => {
                window.WTLIB.symbols.proc_server_close(this.#SRV_PTR!);
                r(true);
            }, 100);
        });
        window.WTLIB.symbols.free_server(this.#SRV_PTR!);
        this.#SRV_PTR = undefined;
        console.info("[SERVER] Server closed");
    }
    get ready() {
        return new Promise((resolve, reject) => {
            console.info("[SERVER] Server ready");
            const rest = window.WTLIB.symbols.proc_server_listen(
                this.#SRV_PTR!,
                this.#CONNECTION_CB.pointer,
            );
            if (!rest) {
                reject("Failed to listen");
            }
            resolve(this);
        });
    }
    private checkArgs(_options: WebTransportServerOptions) {
        if (
            ((!_options.certFile || _options.certFile.length == 0) &&
                (!_options.keyFile || _options.keyFile.length == 0)) &&
            (typeof _options.notAfter == "undefined" &&
                typeof _options.notBefore == "undefined" &&
                !_options.domain)
        ) {
            throw new TypeError(
                "Missing necessary parameters: certFile, keyFile or notAfter, notBefore to generate a new certificate",
            );
        }
        let certificate = "";
        let key = "";

        if (
            (_options.certFile && _options.keyFile)
        ) {
            if (_options.certFile.length == 0 || _options.keyFile.length == 0) {
                throw new TypeError(
                    "Invalid certificate or key file path (empty string)",
                );
            }
            try {
                Deno.statSync(_options.certFile);
                Deno.statSync(_options.keyFile);
            } catch {
                throw new TypeError(
                    "Invalid certificate or key file path",
                );
            }
            //
            certificate = _options.certFile;
            key = _options.keyFile;
            return [certificate, key];
        }
        if (
            typeof _options.notAfter != "undefined" &&
            typeof _options.notBefore != "undefined" && _options.domain
        ) {
            return [certificate, key] = GenerateCertKeyFile(
                _options.domain,
                _options.notBefore,
                _options.notAfter,
            );
        } else {
            throw new TypeError(
                "Missing necessary parameters: notAfter, notBefore, domain to generate a new certificate",
            );
        }
    }
}
export default WebTransportServer;

// Path: mod/client.ts
