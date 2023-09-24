//TO BE IMPLEMENTED
import "../../mod/mod.ts";

//get the connect address from args 1
const connectAddr = Deno.args[0] ?? "https://localhost:4433";

const client = new WebTransport(connectAddr, {
    maxTimeout: 10,
    keepAlive: 3,
});

// console.log(client);

await client.ready;
console.log("Client connected");
const writer = client.datagrams.writable.getWriter();
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));
writer?.write(new Uint8Array([1, 2, 3, 4, 5]));

// // //await messages
for await (const read of client.datagrams.readable) {
    console.log(read);
}
