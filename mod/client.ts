if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import { EventEmitter } from "./deps.ts";
import { symbols, WebTransportOptions } from "./interface.ts";

type WebTransportEvents = {
    event: [MessageEvent];
    // Error Event
    error: [ErrorEvent | string];
    // Close Event
    close: [CloseEvent];
};
export class WebTransport extends EventEmitter<WebTransportEvents> {
    #CONN_PTR: number | undefined;
    #LIB: Deno.DynamicLibrary<typeof symbols> = window.WTLIB;

    constructor(
        _client: string,
        _options: typeof WebTransportOptions = WebTransportOptions,
    ) {
        super();
    }

    connect(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async close() {
        // return this;
    }
}

export default WebTransport;

// Path: mod/client.ts
