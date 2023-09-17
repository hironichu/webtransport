//TO BE IMPLEMENTED
import "../../mod/mod.ts";

const client = new Deno.WebTransport("https://localhost:4433", {
    validateCertificate: false,
    maxTimeout: 10,
    keepAlive: 3,
});

await client.ready;
console.log("Client connected");
const writer = client.datagrams.writable.getWriter();
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
