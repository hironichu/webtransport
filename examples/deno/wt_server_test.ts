// import { join } from "https://deno.land/std@0.201.0/path/mod.ts";
// import { GenerateCertKeyFile } from "../../mod/crypto.ts";
// import "../../mod/mod.ts";
// import { assert } from "https://deno.land/std@0.201.0/assert/assert.ts";

// //add certs cleanup methods after tests
// const certPath = join(Deno.cwd(), "./certs/");
// Deno.test({ name: "Server startup/close" }, () => {
//     //generate a certificate
//     const [cert, key] = GenerateCertKeyFile(
//         "localhost",
//         0,
//         10,
//         undefined,
//         "cert.pem",
//         "key.pem",
//     );
//     const server = new WebTransportServer(4433, {
//         certFile: cert,
//         keyFile: key,
//         maxTimeout: 10,
//         keepAlive: 3,
//     });
//     server.close();
//     //try to start a UDP socket on the same port to see if it's closed
//     const sock = Deno.listenDatagram({
//         hostname: "0.0.0.0",
//         port: 4433,
//         transport: "udp",
//     });
//     assert(sock, "Server did not close");
//     sock.close();
// });

// // Deno.test(
// //     { name: "Server with generated certificate startup/close" },
// //     () => {
// //         const server = new WebTransportServer(4433, {
// //             maxTimeout: 10,
// //             keepAlive: 3,
// //             notAfter: 10,
// //             notBefore: 0,
// //             domain: "localhost",
// //         });
// //         server.close();
// //     },
// // );

// Deno.test({ name: "Server Cleanup certs" }, () => {
//     Deno.removeSync(certPath, { recursive: true });
// });
