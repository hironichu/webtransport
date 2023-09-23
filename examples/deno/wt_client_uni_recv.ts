import "../../mod/mod.ts";

//get the connect address from args 1
const connectAddr = Deno.args[0] ?? "https://localhost:4433";

const client = new WebTransport(connectAddr, {
    maxTimeout: 10,
    keepAlive: 3,
});

const transport = await client.ready;
console.log("Client connected");

const currentTime = performance.now();
console.log("Waiting for a unidirectional stream to open");

// const uds = transport.incomingUnidirectionalStreams;
const streams = transport.incomingUnidirectionalStreams;

for await (const stream of streams.values()) {
    const buff = new Uint8Array(100);
    const reader = stream.getReader({ mode: "byob" });
    const first = await reader.read(buff);
    console.log(first.value);

    // ({ value, done } = await reader.read(buff));
    // console.log(value);
    // ({ value, done } = await reader.read(buff));
    // console.log(value);
    // }
}

//stream should close after 20 messages
console.log("Stream closed after " + (performance.now() - currentTime));
