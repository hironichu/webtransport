if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import { WebTransportSendStreamOptions } from "./connection.ts";
import {
    WebTransportBidirectionalStream,
    WebTransportDatagramDuplexStream,
    WebTransportReceiveStream,
    WebTransportSendStream,
} from "./streams.ts";
import {
    type WebTransportOptions,
    WebTransportOptions as ServerOpts,
} from "./interface.ts";
import { encodeBuf } from "./utils.ts";

export class WebTransport {
    #CLIENT_PTR: Deno.PointerValue<unknown> | undefined;

    private conn?: Deno.PointerValue<unknown>;
    protected remote: URL;
    private buffer!: Uint8Array;
    constructor(
        _client: URL | string,
        _options: WebTransportOptions = ServerOpts,
    ) {
        /// if _client is string convert it to an URL
        if (typeof _client === "string") {
            _client = new URL(_client);
        }

        this.#CLIENT_PTR = window.WTLIB.symbols.proc_client_init(
            _options.keepAlive,
            _options.maxTimeout,
        );

        if (!this.#CLIENT_PTR) {
            throw new Error("Failed to initialize client");
        }
        this.remote = _client;
    }
    get incomingBidirectionalStreams() {
        const pointer = this.conn;
        const errorPTR = this.error.pointer;
        return new ReadableStream<
            WebTransportBidirectionalStream
        >({
            async start(controller) {
                try {
                    if (
                        (!pointer || pointer === null) ||
                        (!errorPTR || errorPTR === null)
                    ) {
                        controller.close();
                        return;
                    }
                    const stream = await window.WTLIB.symbols
                        .proc_accept_bi(
                            pointer,
                            errorPTR,
                        );
                    if (!stream || stream === null) {
                        console.error("[incoming BIDI] Stream not accepted");
                        controller.close();
                        return;
                    }
                    controller.enqueue(
                        new WebTransportBidirectionalStream(
                            stream,
                            errorPTR,
                        ),
                    );
                } catch (e) {
                    controller.error(e);
                }
            },
            cancel() {
                console.info("[incoming BIDI] Cancelled");
            },
        });
    }
    get incomingUnidirectionalStreams() {
        const pointer = this.conn!;
        const errorPTR = this.error.pointer;
        return new ReadableStream<
            ReadableStream<Uint8Array>
        >({
            async start(controller) {
                if (
                    (!pointer || pointer === null) ||
                    (!errorPTR || errorPTR === null)
                ) {
                    controller.close();
                    return;
                }
                try {
                    const stream = await window.WTLIB.symbols
                        .proc_accept_uni(
                            pointer,
                            errorPTR,
                        );
                    if (!stream || stream === null) {
                        console.error("[incoming UNI] Stream not accepted");
                        controller.close();
                        return;
                    }

                    controller.enqueue(WebTransportReceiveStream.from(
                        stream,
                        undefined,
                        errorPTR,
                    ));
                } catch (e) {
                    controller.error(e);
                }
            },
            cancel() {
                console.info("[incoming UNI] Cancelled");
            },
        });
    }
    get datagrams() {
        return new WebTransportDatagramDuplexStream(
            this.conn!,
            this.buffer,
            this.error.pointer,
        );
    }

    public async createBidirectionalStream(
        _options?: WebTransportSendStreamOptions,
    ): Promise<WebTransportBidirectionalStream> {
        if (!this.conn) throw new Error("Connection is closed");
        if (!this.conn || this.conn === null) {
            throw new Error("Connection is closed");
        }
        const _streams = await window.WTLIB.symbols.proc_open_bi(
            this.conn,
            this.error.pointer,
        );
        if (!_streams || _streams === null) {
            throw new Error("Failed to create bi stream");
        }
        return new WebTransportBidirectionalStream(
            _streams,
            this.error.pointer,
        );
    }

    public async createUnidirectionalStream(
        _options?: WebTransportSendStreamOptions,
    ): Promise<WritableStream> {
        if (!this.conn || this.conn === null) {
            throw new Error("Connection is closed");
        }
        //The following operation block the thread until the stream is created.
        const _streams = await window.WTLIB.symbols.proc_open_uni(
            this.conn,
            this.error.pointer,
        );

        if (!_streams || _streams === null) {
            throw new Error("Failed to create uni stream");
        }
        const stream = WebTransportSendStream.from(
            _streams,
            this.error.pointer,
        );

        return stream;
    }
    error = new Deno.UnsafeCallback({
        parameters: ["u32", "buffer", "u32"],
        result: "void",
    }, (code, _pointer, _buflen) => {
        console.log("CB CALLED : ", code);
    });
    get closed() {
        return new Promise(() => {
            //close the datagrams
            if (this.datagrams) {
                this.datagrams.close();
            }
            //close all the streams

            if (this.#CLIENT_PTR && this.conn) {
                window.WTLIB.symbols.proc_client_close(
                    this.conn!,
                );
            }
            if (this.#CLIENT_PTR && !this.conn) {
                window.WTLIB.symbols.free_client(
                    this.#CLIENT_PTR,
                );
            }
            // this.#NOTIFY_PTR.unref();
            // this.#CONNECTION_CB.unref();
            // this.#NOTIFY_PTR.close();
            // this.#CONNECTION_CB.close();
        });
    }
    get ready() {
        return new Promise<WebTransport>(
            (resolve, reject) => {
                if (!this.#CLIENT_PTR) {
                    reject("Client is not initialized");
                    return;
                }
                const encoded = encodeBuf(this.remote.href);
                window.WTLIB.symbols.proc_client_connect(
                    this.#CLIENT_PTR,
                    encoded[0],
                    encoded[1],
                ).then((conn) => {
                    if (!conn || conn === null) {
                        reject("Failed to connect");
                        return;
                    }
                    this.buffer = new Uint8Array(1024);
                    this.conn = conn;
                    resolve(this);
                }).catch((e) => {
                    reject(e);
                });
            },
        );
    }
}

export default WebTransport;

// Path: mod/client.ts
