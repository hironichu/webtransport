import { LIB } from "./lib.ts";

window.WTLIB = await LIB();

import WebTransportServer from "./server.ts";
import WebTransport from "./client.ts";
import { symbols } from "./interface.ts";

window.WebTransport = WebTransport;
window.WebTransportServer = WebTransportServer;
declare global {
    interface Window {
        WebTransport: typeof WebTransport;
        WebTransportServer: typeof WebTransportServer;
        WTLIB: Deno.DynamicLibrary<typeof symbols>;
    }
}

export default {
    WebTransportServer,
    WebTransport,
};

// Path: mod/mod.ts
