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
                    Deno.WTLIB.symbols.proc_send_datagram(
                        connection.pointer!,
                        chunk,
                        chunk.byteLength,
                    );
                } catch (e) {
                    console.error(e);
                }
            },
            abort() {
                console.error("[Error] Write aborted");
            },
        });
    }
    get readable() {
        const connection = this.connection;
        const buffer = this.#READ_BUFFER;
        const StreamBuffer = new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    const nread = await Deno.WTLIB.symbols.proc_recv_datagram(
                        connection.pointer!,
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
                console.error("[Error] Stream cancelled");
            },
        });
        return StreamBuffer;
    }

    //TODO(hironichu): implement the rest of the methods
    public incomingBidirectionalStreams?: ReadableStream<
        ReadableStream<Uint8Array>
    > = undefined;
    public incomingUnidirectionalStreams?: ReadableStream<
        ReadableStream<Uint8Array>
    > = undefined;
}

export class WebTransportConnection {
    state: "connected" | "closed" | "draining" | "failed" | "connecting" =
        "connected" as const;

    #CONN_PTR: Deno.PointerValue<unknown>;
    public datagrams: WebTransportDatagramDuplexStream;
    constructor(
        pointer: Deno.PointerValue<unknown>,
        buffer: Uint8Array,
    ) {
        this.state = "closed";
        this.#CONN_PTR = pointer;
        this.datagrams = new WebTransportDatagramDuplexStream(this, buffer);
    }

    get pointer() {
        return this.#CONN_PTR;
    }
}
