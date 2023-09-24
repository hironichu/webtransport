import { GenerateCertKeyFile } from "../../mod/crypto.ts";
import "../../mod/mod.ts";
import { assert } from "https://deno.land/std@0.202.0/assert/mod.ts";

import { WebTransportServer } from "../../mod/server.ts";
// //add certs cleanup methods after tests
// const certPath = join(Deno.cwd(), "./certs/");
async function sleep(msec: number) {
    await new Promise((res, _rej) => setTimeout(res, msec));
}

Deno.test({ name: "Server startup/close" }, async () => {
    //generate a certificate
    sleep(2);

    const server = new WebTransportServer("https://localhost:4433", {
        certFile: "./certs/localhost.crt",
        keyFile: "./certs/localhost.key",
        maxTimeout: 10,
        keepAlive: 3,
    });
    await server.ready;
    server.close();
    //try to start a UDP socket on the same port to see if it's closed
    const sock = Deno.listenDatagram({
        hostname: "0.0.0.0",
        port: 4433,
        transport: "udp",
    });
    assert(sock, "Server did not close");
    sock.close();
});
