/**
 * @class WebTransportDatagramDuplexStream
 */
export class WebTransportDatagramDuplexStream {
    #READ_BUFFER?: Uint8Array;
    readonly incomingHighWaterMark = 1;
    readonly incomingMaxAge = 0;
    readonly maxDatagramSize = 1024;
    readonly outgoingHighWaterMark = 1;
    readonly outgoingMaxAge = 0;
    constructor(
        private readonly connection: Deno.PointerValue<unknown>,
        readonly _buffer: Uint8Array,
        private readonly cb: Deno.PointerValue<unknown>,
    ) {
        this.#READ_BUFFER = _buffer;
    }
    get writable() {
        const connection = this.connection;
        const error = this.cb;
        return new WritableStream({
            start(controller) {
                if (!connection || connection === null) {
                    controller.error("Connection is closed");
                    return;
                }
            },
            write(chunk: Uint8Array) {
                window.WTLIB.symbols.proc_send_datagram(
                    connection!,
                    chunk,
                    chunk.byteLength,
                    error,
                );
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
        const cb = this.cb;
        // const DEFAULT_CHUNK_SIZE = this.maxDatagramSize;
        return new ReadableStream({
            type: "bytes",
            async start(controller) {
                if (!connection || connection === null) {
                    controller.error("Connection is closed");
                    return;
                }
                const nread = await window.WTLIB.symbols.proc_recv_datagram(
                    connection,
                    buffer,
                    cb,
                ) as number;
                if (nread <= 0) {
                    return;
                }
                controller.enqueue(
                    buffer.subarray(0, nread as number),
                );
            },
            cancel() {
            },
        });
    }
    close() {
        console.log("[Info] Closing datagram duplex stream");
        this.#READ_BUFFER = undefined;
        this.readable.cancel();
        this.writable.close();
    }
}
/**
 * @class WebTransportBidirectionalStream
 * @description This class is used to read and write data from a bidirectional stream
 */
export class WebTransportBidirectionalStream {
    readonly readable: ReadableStream;
    readonly writable: WritableStream;

    constructor(
        public readonly ptr: Deno.PointerValue<unknown>,
        private readonly errorCB: Deno.PointerValue<unknown>,
    ) {
        this.readable = WebTransportReceiveStream.from(
            this.ptr,
            undefined,
            errorCB,
        );
        this.writable = WebTransportSendStream.from(this.ptr, errorCB);
    }
}

/**
 * @class WebTransportReceiveStream
 * @description This class is used to read data from a stream (uni or bidirectional)
 */
export class WebTransportReceiveStream {
    private static readonly ptr: Deno.PointerValue<unknown>;
    constructor(private readonly ptr: Deno.PointerValue<unknown>) {
    }
    static from(
        ptr: Deno.PointerValue<unknown>,
        DEFAULT_CHUNK_SIZE = 1024,
        cb: Deno.PointerValue<unknown>,
    ) {
        return new ReadableStream({
            type: "bytes",
            start(controller) {
                readRepeatedly().catch((e) => controller.error(e));
                async function readRepeatedly() {
                    // return socket.select2().then(() => {
                    // Since the socket can become readable even when there's
                    // no pending BYOB requests, we need to handle both cases.
                    let bytesRead;
                    if (controller.byobRequest) {
                        const v = controller.byobRequest.view;
                        bytesRead = await window.WTLIB.symbols.proc_read(
                            ptr,
                            v?.buffer!,
                            v?.byteLength!,
                            cb,
                        );
                        if (bytesRead === 0) {
                            controller.close();
                        }
                        controller.byobRequest.respond(bytesRead as number);
                        console.log(`byobRequest with ${bytesRead} bytes`);
                    } else {
                        const buffer = new ArrayBuffer(DEFAULT_CHUNK_SIZE);
                        bytesRead = await window.WTLIB.symbols.proc_read(
                            ptr,
                            buffer,
                            DEFAULT_CHUNK_SIZE,
                            cb,
                        );
                        if (bytesRead === 0) {
                            controller.close();
                        } else {
                            controller.enqueue(
                                new Uint8Array(buffer, 0, bytesRead as number),
                            );
                        }
                        console.log(
                            `enqueue() ${bytesRead} bytes (no byobRequest)`,
                        );
                    }

                    if (bytesRead === 0) {
                        return;
                        // no more bytes in source
                    }
                    return readRepeatedly();
                    // });
                }
            },
            // pull(controller) {
            //     readRepeatedly().catch((e) => controller.error(e));
            //     async function readRepeatedly() {
            //         if (!ptr || ptr === null) {
            //             throw new Error("Stream is closed");
            //         }
            //         let bytesRead;
            //         if (controller.byobRequest) {
            //             const v = controller.byobRequest.view;
            //             bytesRead = await window.WTLIB.symbols.proc_read(
            //                 ptr,
            //                 v?.buffer!,
            //                 v?.byteLength!,
            //             );
            //             if (bytesRead === 0) {
            //                 console.log("BYOB REQUEST");
            //                 controller.close();
            //             }
            //             controller.byobRequest.respond(bytesRead as number);
            //         } else {
            //             const buffer = new ArrayBuffer(DEFAULT_CHUNK_SIZE);
            //             bytesRead = await window.WTLIB.symbols.proc_read(
            //                 ptr,
            //                 buffer,
            //                 DEFAULT_CHUNK_SIZE,
            //             );
            //             if (bytesRead === 0) {
            //                 controller.close();
            //             } else {
            //                 controller.enqueue(
            //                     new Uint8Array(buffer, 0, bytesRead as number),
            //                 );
            //             }
            //         }
            //         if (bytesRead === 0) {
            //             return;
            //         }
            //         return readRepeatedly();
            //     }
            // },
            async cancel(reason?: string): Promise<void> {
                if (!ptr || ptr === null) {
                    console.debug("Stream is closed");
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

/**
 * @class WebTransportSendStream
 * @description This class is used to write data to a stream (uni or bidirectional)
 */
export class WebTransportSendStream {
    static from(
        ptr: Deno.PointerValue<unknown>,
        cb: Deno.PointerValue<unknown>,
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
                        cb,
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
