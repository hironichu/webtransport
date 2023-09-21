import {
    symbols,
    WebTransportOptions,
    WebTransportServerOptions,
} from "./interface.ts";
import { LIB } from "./lib.ts";

if (window.WTLIB_STATE) {
    throw new Error("[Webtransport] Main module already imported.");
}

window.WTLIB = await LIB();
window.WTLIB_STATE = true;
import { WebTransportServer } from "./server.ts";
import { WebTransport } from "./client.ts";

declare global {
    export interface Window {
        WTLIB: Deno.DynamicLibrary<typeof symbols>;
        WTLIB_STATE: boolean;
    }
}

declare global {
    namespace globalThis {
        const WebTransport: {
            readonly prototype: WebTransport;
            new (
                _client: URL | string,
                _options?: WebTransportOptions,
            ): WebTransport;
        };
        const WebTransportServer: {
            readonly prototype: WebTransportServer;
            new (
                _url: URL | string,
                _options: WebTransportServerOptions,
            ): WebTransportServer;
        };
    }
}

((globalThis) => {
    Object.assign(globalThis, {
        WebTransport: WebTransport,
        WebTransportServer: WebTransportServer,
    });
})(globalThis);

// Path: mod/mod.ts
