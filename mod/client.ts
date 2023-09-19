if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import WebTransportConnection, {
    WebTransportDatagramDuplexStream,
} from "./connection.ts";
import { EventEmitter } from "./deps.ts";
import {
    type WebTransportOptions,
    WebTransportOptions as ServerOpts,
} from "./interface.ts";
import { encodeBuf } from "./utils.ts";

type WebTransportEvents = {
    connected: [WebTransportConnection];
    ready: [WebTransportConnection];
    // Other Event
    event: [MessageEvent];
    // Error Event
    error: [ErrorEvent | string];
    // Close Event
    close: [CloseEvent];
};
export class WebTransport extends EventEmitter<WebTransportEvents> {
    #CONN_PTR: Deno.PointerValue<unknown> | undefined;
    #STATE_PTR = new Uint32Array(1);
    public datagrams!: WebTransportDatagramDuplexStream;
    conn?: WebTransportConnection;
    #NOTIFY_PTR = new Deno.UnsafeCallback(
        {
            parameters: ["u32", "pointer", "u32"],
            result: "void",
        },
        this.notify.bind(this),
    );
    #CONNECTION_CB = new Deno.UnsafeCallback(
        {
            parameters: ["pointer"],
            result: "void",
        },
        this.connection.bind(this),
    );

    constructor(
        _client: URL | string,
        _options: typeof WebTransportOptions = ServerOpts,
    ) {
        super();
        const [certificate, key] = this.checkArgs(_options);

        const certbuf = encodeBuf(certificate);
        const keybuf = encodeBuf(key);
        try {
            this.#CONN_PTR = window.WTLIB.symbols.proc_client_init(
                this.#NOTIFY_PTR.pointer,
                _options.keepAlive,
                _options.maxTimeout,
                _options.validateCertificate,
                certbuf[0],
                certbuf[1],
                keybuf[0],
                keybuf[1],
            );
        } catch (e) {
            console.error(e);
        }

        if (!this.#CONN_PTR) {
            throw new Error("Failed to initialize client");
        }

        if (_client instanceof URL) {
            _client = _client.href;
        }

        const addr = encodeBuf(_client.toString());
        try {
            window.WTLIB.symbols.proc_client_connect(
                this.#CONN_PTR,
                this.#CONNECTION_CB.pointer,
                addr[0],
                addr[1],
            );
            this.#NOTIFY_PTR.ref();
            this.#CONNECTION_CB.ref();
        } catch (e) {
            console.error("Could not connect to the server", e);
        }
    }
    /**
     * @callback connection
     * @param {Deno.PointerValue<unknown>} client
     * @returns {void}
     * @description This function is called when a new connection is received from the server
     */
    private connection(client: Deno.PointerValue<unknown>) {
        const CONN_BUFFER = new Uint8Array(65536);
        //
        window.WTLIB.symbols.proc_init_datagrams(
            client,
            CONN_BUFFER,
            CONN_BUFFER.byteLength,
        );
        //Setting up the stream for the new connection
        const conn = new WebTransportConnection(
            client,
            CONN_BUFFER,
        );

        this.datagrams = new WebTransportDatagramDuplexStream(
            conn,
            CONN_BUFFER,
        );
        this.emit("ready", conn);
    }
    /**
     * @callback notify
     * @param {number} code
     * @param {Deno.PointerValue<unknown>} buffer
     * @param {number} buflen
     * @returns {void}
     *
     * @description This function is called when a new event is received from the server
     */
    private notify(
        _code: unknown | number,
        buffer: Deno.PointerValue<unknown>,
        buflen: number,
    ) {
        const code = _code as bigint;
        console.log(code);
        if (buflen < 0) {
            return;
        }
        const pointer = Deno.UnsafePointerView.getArrayBuffer(
            buffer as unknown as NonNullable<Deno.PointerValue>,
            buflen,
        );
        const event = new MessageEvent("message", {
            data: pointer,
        });

        //TODO(hironichu): Implement Error/event catching from rust to free the memory once a connection drop or if something else happens.
        this.emit("event", event);
    }
    ready = new Promise<void>((resolve) => {
        this.once("ready", (conn) => {
            conn.state = "connected";
            this.conn = conn;
            resolve();
        });
    });

    async close() {
        this.#NOTIFY_PTR.unref();
        this.#NOTIFY_PTR.close();
        this.#CONNECTION_CB.unref();
        this.#CONNECTION_CB.close();
        if (this.#CONN_PTR) {
            await window.WTLIB.symbols.proc_client_close(
                this.#CONN_PTR,
                this.conn!.pointer,
            );
            //free the Client pointer
            window.WTLIB.symbols.free_all_client(
                this.#CONN_PTR,
                this.conn!.pointer,
            );
        }

        this.emit("close", new CloseEvent("close"));
    }

    private checkArgs(_options: WebTransportOptions) {
        let certificate = "";
        let key = "";
        if (_options.certFile && _options.keyFile) {
            Deno.statSync(_options.certFile);
            Deno.statSync(_options.keyFile);
            //
            certificate = _options.certFile;
            key = _options.keyFile;
            return [certificate, key];
        }
        if (_options.validateCertificate == false) {
            return ["", ""];
        }
        throw new TypeError(
            "Missing necessary parameters",
        );
    }
}

export default WebTransport;

// Path: mod/client.ts
