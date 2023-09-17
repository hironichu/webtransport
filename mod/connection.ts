export class Datagram {
    #READ_BUFFER: Uint8Array;
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
}
export class WebTransportConnection {
    #CONN_PTR: Deno.PointerValue<unknown>;
    public datagrams: Datagram;
    constructor(
        pointer: Deno.PointerValue<unknown>,
        buffer: Uint8Array,
    ) {
        this.#CONN_PTR = pointer;
        this.datagrams = new Datagram(this, buffer);
    }

    //TODO: add the rest of the methods for uni and bi streams
    get pointer() {
        return this.#CONN_PTR;
    }
}
