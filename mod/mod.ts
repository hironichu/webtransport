import { symbols } from "./interface.ts";
import { LIB } from "./lib.ts";

window.WTLIB = await LIB();
Deno.WTLIB = window.WTLIB;
import { WebTransportServer as WtServer } from "./server.ts";
import { WebTransport as WtClient } from "./client.ts";

// Deno.WebTransport = WebTransport;
// Deno.WebTransportServer = WebTransportServer;

declare global {
    namespace Deno {
        export class WebTransport extends WtClient {}
        export class WebTransportServer extends WtServer {}
        export let WTLIB: Deno.DynamicLibrary<typeof symbols>;
    }
    export interface Window {
        WebTransport: typeof Deno.WebTransport;
        WebTransportServer: typeof Deno.WebTransportServer;
        WTLIB: Deno.DynamicLibrary<typeof symbols>;
    }
}

Deno.WebTransport = WtClient;
Deno.WebTransportServer = WtServer;
window.WebTransport = WtClient;
window.WebTransportServer = WtServer;
export { WtClient, WtServer };

// Path: mod/mod.ts
