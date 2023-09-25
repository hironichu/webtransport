import "../../mod/mod.ts";

//get the connect address from args 1
const connectAddr = Deno.args[0] ?? "https://localhost:4433";

const transport = new WebTransport(connectAddr, {
    maxTimeout: 10,
    keepAlive: 3,
});

await transport.ready;
console.log("Client connected");
const stream = await transport.createBidirectionalStream();
const decoder = new TextDecoder();
const stdin = Deno.stdin.readable;
//get the last oppened stream
await Promise.all([
    (async () => {
        for await (const data of stream!.readable) {
            console.log("Recevied : ", decoder.decode(data));
        }
    })(),
    (() => {
        stdin.pipeTo(stream!.writable);
    })(),
]);
