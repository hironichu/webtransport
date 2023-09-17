import { symbols } from "./interface.ts";
import { LIB } from "./lib.ts";

window.WTLIB = await LIB();
import { WebTransportServer as WtServer } from "./server.ts";
import { WebTransport as WtClient } from "./client.ts";

declare global {
    export interface Window {
        WTLIB: Deno.DynamicLibrary<typeof symbols>;
    }
    export namespace globalThis {
        export class WebTransport extends WtClient {}
        export class WebTransportServer extends WtServer {}
        export let WTLIB: Deno.DynamicLibrary<typeof symbols>;
    }
}
export declare namespace globalThis {
    export class WebTransport extends WtClient {}
    export class WebTransportServer extends WtServer {}
    export let WTLIB: Deno.DynamicLibrary<typeof symbols>;
}

globalThis.WebTransport = WtClient;
globalThis.WebTransportServer = WtServer;

export { WtClient, WtServer };

// Path: mod/mod.ts
