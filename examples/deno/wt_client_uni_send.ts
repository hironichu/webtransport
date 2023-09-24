import "../../mod/mod.ts";

//get the connect address from args 1
const connectAddr = Deno.args[0] ?? "https://localhost:4433";

const client = new WebTransport(connectAddr, {
    maxTimeout: 10,
    keepAlive: 3,
});

const transport = await client.ready;
console.log("Client connected");

const _currentTime = performance.now();
console.log("Waiting for a unidirectional stream to open");

// const uds = transport.incomingUnidirectionalStreams;
const stream = await transport.createUnidirectionalStream();
console.log("created stream");
const writer = stream.getWriter();
await writer.write(
    new TextEncoder().encode("Hello from client"),
);
console.log("Stream opened");

// Deno.serve((req) => {
//     return new Response("Hello " + req.url);
// });
