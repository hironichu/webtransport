// import { GenerateCertKeyFile } from "../../mod/crypto.ts";
import "../../mod/mod.ts";
// import { assert } from "https://deno.land/std@0.202.0/assert/mod.ts";

// import { WebTransportServer } from "../../mod/server.ts";
// //add certs cleanup methods after tests
// const certPath = join(Deno.cwd(), "./certs/");
async function _sleep(msec: number) {
    await new Promise((res, _rej) => setTimeout(res, msec));
}

// Deno.test({ name: "Server startup/close" }, async () => {
//     //generate a certificate

//     const server = new WebTransportServer("https://localhost:4433", {
//         certFile: "./certs/localhost.crt",
//         keyFile: "./certs/localhost.key",
//         maxTimeout: 10,
//         keepAlive: 3,
//     });
//     await server.ready;
//     await server.close().catch((e) => {
//         console.log(e);
//     });
// });
