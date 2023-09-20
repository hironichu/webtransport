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
import { WebTransportServer as WebTransportServerT } from "./server.ts";
import { WebTransport as WebTransportT } from "./client.ts";

declare global {
    export interface Window {
        WTLIB: Deno.DynamicLibrary<typeof symbols>;
        WTLIB_STATE: boolean;
    }
}

declare global {
    namespace globalThis {
        export class WebTransport extends WebTransportT {
            constructor(
                _client: URL | string,
                _options: WebTransportOptions,
            );
        }
        export class WebTransportServer extends WebTransportServerT {
            constructor(
                _port: number,
                _options: WebTransportServerOptions,
            );
        }
    }
}

((globalThis) => {
    Object.assign(globalThis, {
        WebTransport: WebTransportT,
        WebTransportServer: WebTransportServerT,
    });
})(globalThis);

// Path: mod/mod.ts
