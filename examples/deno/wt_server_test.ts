import { GenerateCertKeyFile } from "../../mod/crypto.ts";
import "../../mod/mod.ts";
import { assert } from "https://deno.land/std@0.202.0/assert/mod.ts";

import { WebTransportServer } from "../../mod/server.ts";
// //add certs cleanup methods after tests
// const certPath = join(Deno.cwd(), "./certs/");
async function _sleep(msec: number) {
    await new Promise((res, _rej) => setTimeout(res, msec));
}

Deno.test({ name: "Server startup/close" }, () => {
    //generate a certificate
    const [cert, key] = GenerateCertKeyFile(
        "localhost",
        0,
        10,
    );
    const server = new WebTransportServer("https://localhost:4433", {
        certFile: cert,
        keyFile: key,
        maxTimeout: 10,
        keepAlive: 3,
    });
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

// Deno.test(
//     { name: "Server with generated certificate startup/close" },
//     async (test) => {
//         const _srv = GetTestServer();
//         const client = new WebTransport("https://localhost:4433");

//         await client.ready;

//         await test.step("Client connection", () => {
//             assert(client.ready, "Client not ready");
//         });
//         const testCases = [1];
//         Promise.all(testCases.map(async (testCase) => {
//             await test.step({
//                 name: "Client message Receiving: " + testCase,
//                 fn: async () => {
//                     console.info("steup listener");
//                     for await (const data of client.datagrams.readable) {
//                         console.log(data);
//                     }
//                 },
//                 sanitizeOps: false,
//                 sanitizeResources: false,
//                 sanitizeExit: false,
//             });

//             await test.step({
//                 name: "Client message Sending: " + testCase,
//                 fn: async () => {
//                     console.log("SENDING SHIT");
//                     const writer = client.datagrams.writable.getWriter();
//                     await writer.write(new Uint8Array([1, 2, 3, 4, 5]));
//                 },
//                 sanitizeOps: false,
//                 sanitizeResources: false,
//                 sanitizeExit: false,
//             });
//         })).then(client.close);
//         _srv.close();
//     },
// );
