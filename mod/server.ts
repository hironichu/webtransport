if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import { EventEmitter } from "./deps.ts";
import { WebTransportServerOptions } from "./interface.ts";
//refuse improt of we dont come from main module

type WebTransportServerEvents = {
    event: [MessageEvent];
    // Error Event
    error: [ErrorEvent | string];
    // Close Event
    close: [CloseEvent];
};

export class WebTransportServer extends EventEmitter<WebTransportServerEvents> {
    constructor(
        _port: number,
        _options: typeof WebTransportServerOptions = WebTransportServerOptions,
    ) {
        super();
    }

    listen() {
        throw new Error("Method not implemented.");
    }

    async close() {
        //
    }
}
export default WebTransportServer;

// Path: mod/client.ts
