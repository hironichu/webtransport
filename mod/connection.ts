// import { FFI_CODES } from "./code.ts";

import {
    WebTransportBidirectionalStream,
    WebTransportDatagramDuplexStream,
    WebTransportReceiveStream,
    WebTransportSendStream,
} from "./streams.ts";

///
export interface WebTransportSendStreamOptions {
    sendOrder?: number | null;
}
export interface WebTransportCloseInfo {
    errorCode?: number;
    reason?: string;
}

export default class WebTransportConnection {
    state:
        | "connected"
        | "closed"
        | "draining"
        | "failed"
        | "connecting" = "closed" as const;

    constructor(
        public readonly pointer: Deno.PointerValue<unknown>,
        private readonly buffer: Uint8Array,
    ) {
        this.state = "connected";
    }
    get datagrams() {
        return new WebTransportDatagramDuplexStream(
            this.pointer,
            this.buffer,
            this.error.pointer,
        );
    }
    get incomingBidirectionalStreams() {
        const pointer = this.pointer;
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
                        console.error(
                            "[incoming BIDI] Stream not accepted",
                        );
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
        const pointer = this.pointer;
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
    public async createBidirectionalStream(
        _options?: WebTransportSendStreamOptions,
    ): Promise<WebTransportBidirectionalStream> {
        //The following operation block the thread until the stream is created.
        if (!this.pointer || this.pointer === null) {
            throw new Error("Connection is closed");
        }
        const _streams = await window.WTLIB.symbols.proc_open_bi(
            this.pointer,
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
        if (!this.pointer || this.pointer === null) {
            throw new Error("Connection is closed");
        }
        //The following operation block the thread until the stream is created.
        const _streams = await window.WTLIB.symbols.proc_open_uni(
            this.pointer,
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
        if (code === 154) {
            this.close();
        }
    });
    close(_closeInfo?: WebTransportCloseInfo) {
        if (!this.pointer || this.pointer === null) {
            throw new Error("Connection is closed");
        }

        this.state = "closed";
        window.WTLIB.symbols.proc_client_close(
            this.pointer,
        );
    }
}
