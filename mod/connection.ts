// import { FFI_CODES } from "./code.ts";
///
interface WebTransportSendStreamOptions {
    sendOrder?: number | null;
}
interface WebTransportCloseInfo {
    errorCode?: number;
    reason?: string;
}

export class WebTransportDatagramDuplexStream {
    #READ_BUFFER?: Uint8Array;
    readonly incomingHighWaterMark = 1;
    readonly incomingMaxAge = 0;
    readonly maxDatagramSize = 1024;
    readonly outgoingHighWaterMark = 1;
    readonly outgoingMaxAge = 0;
    constructor(
        private connection: WebTransportConnection,
        _buffer: Uint8Array,
    ) {
        this.#READ_BUFFER = _buffer;
    }
    get writable() {
        const connection = this.connection;
        return new WritableStream({
            start(controller) {
                if (!connection.pointer) {
                    controller.error("Connection is closed");
                    return;
                }
            },
            write(chunk: Uint8Array, controller) {
                try {
                    window.WTLIB.symbols.proc_send_datagram(
                        connection.pointer!,
                        chunk,
                        chunk.byteLength,
                    );
                    return;
                } catch (e) {
                    controller.error(e);
                    return;
                }
            },
            abort(e) {
                console.error("[Error] Write aborted", e);
            },
            close() {
                console.log("[Info] Write closed");
            },
        });
    }
    get readable() {
        const connection = this.connection;
        const buffer = this.#READ_BUFFER ?? new Uint8Array(1024);
        const StreamBuffer = new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    const nread = await window.WTLIB.symbols.proc_recv_datagram(
                        connection.pointer!,
                        buffer,
                    );
                    if (nread > 0) {
                        controller.enqueue(
                            buffer.subarray(0, nread as number),
                        );
                    }
                } catch (e) {
                    controller.error(e);
                }
            },
            cancel() {
            },
        });
        return StreamBuffer;
    }
    close() {
        this.#READ_BUFFER = undefined;
        this.readable.cancel();
        this.writable.close();
    }
}

export class WebTransportBidirectionalStream {
    readonly readable: ReadableStream;
    readonly writable: WritableStream;

    constructor(
        public ptr: Deno.PointerValue<unknown>,
    ) {
        this.readable = WebTransportReceiveStream.from(this.ptr);
        this.writable = WebTransportSendStream.from(this.ptr);
    }
}
export class WebTransportReceiveStream {
    private static readonly ptr: Deno.PointerValue<unknown>;
    constructor(private readonly ptr: Deno.PointerValue<unknown>) {
    }
    static from(
        ptr: Deno.PointerValue<unknown>,
        DEFAULT_CHUNK_SIZE = 1024,
    ) {
        return new ReadableStream({
            type: "bytes",
            start(
                _,
            ) {
            },
            pull(controller) {
                readRepeatedly().catch((e) => controller.error(e));
                async function readRepeatedly() {
                    if (!ptr || ptr === null) {
                        throw new Error("Stream is closed");
                    }
                    let bytesRead;
                    if (controller.byobRequest) {
                        const v = controller.byobRequest.view;
                        bytesRead = await window.WTLIB.symbols.proc_read(
                            ptr,
                            v?.buffer!,
                            v?.byteLength!,
                        );
                        if (bytesRead === 0) {
                            console.log("BYOB REQUEST");
                            controller.close();
                        }
                        controller.byobRequest.respond(bytesRead as number);
                    } else {
                        const buffer = new ArrayBuffer(DEFAULT_CHUNK_SIZE);
                        bytesRead = await window.WTLIB.symbols.proc_read(
                            ptr,
                            buffer,
                            DEFAULT_CHUNK_SIZE,
                        );
                        if (bytesRead === 0) {
                            controller.close();
                        } else {
                            controller.enqueue(
                                new Uint8Array(buffer, 0, bytesRead as number),
                            );
                        }
                    }
                    if (bytesRead === 0) {
                        return;
                    }
                    return readRepeatedly();
                }
            },
            async cancel(reason?: string): Promise<void> {
                if (!ptr || ptr === null) {
                    return;
                }
                console.error("Canceled: ", reason);
                await window.WTLIB.symbols.proc_recvtream_stop(ptr).catch(
                    (e) => {
                        console.error(e);
                    },
                );
            },
        });
    }
}

export class WebTransportSendStream {
    static from(
        ptr: Deno.PointerValue<unknown>,
    ) {
        return new WritableStream({
            async write(
                chunk: Uint8Array,
                controller: WritableStreamDefaultController,
            ) {
                let written = 0;
                if (!ptr || ptr === null) {
                    controller.error("Stream is closed");
                    return;
                }
                try {
                    written = await window.WTLIB.symbols.proc_write_all(
                        ptr,
                        chunk,
                        chunk.byteLength,
                    ) as number;
                    if (written === 0) {
                        controller.error("Write failed");
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    return;
                }
            },
            async abort() {
                if (!ptr || ptr === null) {
                    return;
                }
                await window.WTLIB.symbols.proc_sendstream_finish(
                    ptr,
                );
            },
            async close() {
                if (!ptr || ptr === null) {
                    return;
                }
                await window.WTLIB.symbols.proc_sendstream_finish(
                    ptr,
                );
            },
        });
    }
}

export default class WebTransportConnection {
    state:
        | "connected"
        | "closed"
        | "draining"
        | "failed"
        | "connecting" = "closed" as const;

    // readonly #CONN_PTR!: Deno.PointerValue<unknown>;
    public readonly datagrams: WebTransportDatagramDuplexStream;
    public readonly incomingBidirectionalStreams: ReadableStream<
        WebTransportBidirectionalStream
    >;
    public readonly incomingUnidirectionalStreams: ReadableStream<
        ReadableStream<Uint8Array>
    >;

    constructor(
        public readonly pointer: Deno.PointerValue<unknown>,
        buffer: Uint8Array,
    ) {
        this.state = "connected";
        // this.#CONN_PTR = pointer;
        this.datagrams = new WebTransportDatagramDuplexStream(this, buffer);

        this.incomingBidirectionalStreams = new ReadableStream<
            WebTransportBidirectionalStream
        >({
            async start(controller) {
                try {
                    const stream = await window.WTLIB.symbols
                        .proc_accept_bi(
                            pointer,
                        );
                    if (!stream) {
                        controller.close();
                        return;
                    }
                    const jsStream = new WebTransportBidirectionalStream(
                        stream,
                    );
                    controller.enqueue(jsStream);
                } catch (e) {
                    controller.error(e);
                }
            },
            cancel() {
            },
        });
        this.incomingUnidirectionalStreams = new ReadableStream<
            ReadableStream<Uint8Array>
        >({
            async start(controller) {
                try {
                    const stream = await window.WTLIB.symbols
                        .proc_accept_uni(
                            pointer,
                        );
                    if (!stream) {
                        controller.close();
                        return;
                    }
                    controller.enqueue(WebTransportReceiveStream.from(
                        stream,
                    ));
                } catch (e) {
                    controller.error(e);
                }
            },
            cancel() {
            },
        });
    }

    public async createBidirectionalStream(
        _options?: WebTransportSendStreamOptions,
    ): Promise<WebTransportBidirectionalStream> {
        //The following operation block the thread until the stream is created.
        if (!this.pointer) {
            throw new Error("Connection is closed");
        }
        const _streams = await window.WTLIB.symbols.proc_open_bi(
            this.pointer,
        );
        if (!_streams) {
            throw new Error("Failed to create stream");
        }
        return new WebTransportBidirectionalStream(_streams);
    }

    public async createUnidirectionalStream(
        _options?: WebTransportSendStreamOptions,
    ): Promise<WritableStream> {
        if (!this.pointer) {
            throw new Error("Connection is closed");
        }
        //The following operation block the thread until the stream is created.
        const _streams = await window.WTLIB.symbols.proc_open_uni(
            this.pointer,
        );

        if (!_streams) {
            throw new Error("Failed to create stream");
        }
        const stream = WebTransportSendStream.from(_streams);

        return stream;
    }

    async close(_closeInfo?: WebTransportCloseInfo) {
        this.state = "closed";
        if (!this.pointer || this.pointer === null) {
            throw new Error("Connection is closed");
        }
        if (!this.pointer || this.pointer === null) {
            throw new Error("Connection is closed");
        }
        await window.WTLIB.symbols.proc_client_close(
            this.pointer,
            this.pointer,
        );
    }
}
