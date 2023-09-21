// import { FFI_CODES } from "./code.ts";

export class WebTransportDatagramDuplexStream {
    #READ_BUFFER: Uint8Array;
    readonly incomingHighWaterMark = 1;
    readonly incomingMaxAge = null;
    readonly maxDatagramSize = 1024;
    readonly outgoingHighWaterMark = 1;
    readonly outgoingMaxAge = null;
    constructor(
        private connection: WebTransportConnection,
        _buffer: Uint8Array,
    ) {
        this.#READ_BUFFER = _buffer;
    }
    get writable() {
        const connection = this.connection;
        return new WritableStream({
            write(chunk) {
                try {
                    window.WTLIB.symbols.proc_send_datagram(
                        connection.pointer!,
                        chunk,
                        chunk.byteLength,
                    );

                    return chunk.byteLength;
                } catch (e) {
                    console.error(e);
                    return -1;
                }
            },
            abort() {
                console.error("[Error] Write aborted");
            },
            close() {
                // console.log("[Info] Write closed");
            },
        });
    }
    get readable() {
        const connection = this.connection;
        const buffer = this.#READ_BUFFER;
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
}

export default class WebTransportConnection {
    state:
        | "connected"
        | "closed"
        | "draining"
        | "failed"
        | "connecting" = "closed" as const;

    readonly #CONN_PTR: Deno.PointerValue<unknown>;
    public readonly datagrams: WebTransportDatagramDuplexStream;
    constructor(
        pointer: Deno.PointerValue<unknown>,
        buffer: Uint8Array,
    ) {
        this.state = "connected";
        this.#CONN_PTR = pointer;
        this.datagrams = new WebTransportDatagramDuplexStream(this, buffer);
    }

    //TODO(hironichu): implement the rest of the methods
    public readonly incomingBidirectionalStreams?: ReadableStream<
        ReadableStream<Uint8Array>
    > = undefined;
    public readonly incomingUnidirectionalStreams?: ReadableStream<
        ReadableStream<Uint8Array>
    > = undefined;

    async close() {
        this.state = "closed";
        await window.WTLIB.symbols.proc_client_close(
            this.#CONN_PTR,
            this.pointer,
        );
    }
    get pointer() {
        return this.#CONN_PTR;
    }
}
