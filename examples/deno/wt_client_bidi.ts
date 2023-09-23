import "../../mod/mod.ts";

//get the connect address from args 1
const connectAddr = Deno.args[0] ?? "https://localhost:4433";

const client = new WebTransport(connectAddr, {
    maxTimeout: 10,
    keepAlive: 3,
});

const transport = await client.ready;
console.log("Client connected");
const stream = transport.incomingBidirectionalStreams;
const reader = stream.getReader();
//get the last oppened stream
reader.read().then((value) => {
    console.log("new stream opened ", value);
});
// for await (const streams of uni) {
//     const writer = streams.writable.getWriter();
//     for await (const reads of streams.readable) {
//         console.log(reads);
//         writer.write(reads);
//     }
// }
