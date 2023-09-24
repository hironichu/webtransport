if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import WebTransportConnection, {
    WebTransportDatagramDuplexStream,
} from "./connection.ts";

import {
    type WebTransportOptions,
    WebTransportOptions as ServerOpts,
} from "./interface.ts";
import { encodeBuf } from "./utils.ts";

export class WebTransport {
    #CONN_PTR: Deno.PointerValue<unknown> | undefined;
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
    public datagrams!: WebTransportDatagramDuplexStream;
    public readonly ready: Promise<WebTransportConnection>;

    public conn?: WebTransportConnection;
    protected remote: URL;
    constructor(
        _client: URL | string,
        _options: WebTransportOptions = ServerOpts,
    ) {
        /// if _client is string convert it to an URL
        if (typeof _client === "string") {
            _client = new URL(_client);
        }

        try {
            this.#CONN_PTR = window.WTLIB.symbols.proc_client_init(
                this.#NOTIFY_PTR.pointer,
                _options.keepAlive,
                _options.maxTimeout,
            );
        } catch (e) {
            console.error(e);
        }

        if (!this.#CONN_PTR) {
            throw new Error("Failed to initialize client");
        }
        /// Set the current remote to the client
        this.remote = _client;

        /// ref the callback to prevent it from being garbage collected
        this.#NOTIFY_PTR.ref();
        this.#CONNECTION_CB.ref();
        this.ready = new Promise<WebTransportConnection>((resolve, reject) => {
            const encoded = encodeBuf(this.remote.href);
            window.WTLIB.symbols.proc_client_connect(
                this.#CONN_PTR!,
                this.#CONNECTION_CB.pointer,
                encoded[0],
                encoded[1],
            );
            if (this.conn) {
                resolve(this.conn);
            } else {
                this.conn = undefined;
                reject("Failed to connect to server");
            }
        });
    }
    /**
     * @callback connection
     * @param {Deno.PointerValue<unknown>} client
     * @returns {void}
     * @description This function is called when a new connection is received from the server
     */
    private connection(client: Deno.PointerValue<unknown>) {
        if (!client || client == null) {
            return;
        }
        Promise.resolve(this.ready);
        const CONN_BUFFER = new Uint8Array(65536);

        this.conn = new WebTransportConnection(
            client,
            CONN_BUFFER,
        );

        this.datagrams = new WebTransportDatagramDuplexStream(
            this.conn,
            CONN_BUFFER,
        );
        return this.conn;
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
    private async notify(
        _code: unknown | number,
        buffer: Deno.PointerValue<unknown>,
        buflen: number,
    ) {
        const code = _code as number;

        if (buflen < 0) {
            return;
        }

        const pointer = Deno.UnsafePointerView.getArrayBuffer(
            buffer as unknown as NonNullable<Deno.PointerValue>,
            buflen,
        );
        const data = new TextDecoder().decode(pointer);
        if (code >= 130) {
            // await Promise.race([this.closed]);
            await this.closed;
            throw new Error(data);
        }
        const _event = new MessageEvent("error", {
            data,
        });
        dispatchEvent(_event);
    }
    get closed() {
        return new Promise((resolve) => {
            this.#NOTIFY_PTR.unref();
            this.#CONNECTION_CB.unref();

            //close the datagrams
            if (this.datagrams) {
                this.datagrams.close();
            }
            //close all the streams

            if (this.#CONN_PTR && this.conn) {
                window.WTLIB.symbols.proc_client_close(
                    this.#CONN_PTR,
                    this.conn!.pointer,
                );
            }
            if (this.#CONN_PTR && !this.conn) {
                window.WTLIB.symbols.free_client(
                    this.#CONN_PTR,
                );
            }

            resolve(true);
            // this.#NOTIFY_PTR.close();
            // this.#CONNECTION_CB.close();
        });
    }
}

export default WebTransport;

// Path: mod/client.ts
