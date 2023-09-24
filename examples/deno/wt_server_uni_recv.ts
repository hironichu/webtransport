//TO BE IMPLEMENTED
import "../../mod/mod.ts";

//get cert path from args 1 and 2 (cert and key) or use default
const certFile = Deno.args[0] ?? "./certs/localhost.crt";
const keyFile = Deno.args[1] ?? "./certs/localhost.key";
//check if certFile and keyFile are valid non-empty strings
if (typeof certFile !== "string" || typeof keyFile !== "string") {
    console.error("Invalid certFile or keyFile");
    Deno.exit(1);
}
//check path
try {
    Deno.statSync(certFile);
    Deno.statSync(keyFile);
} catch {
    console.error("Invalid certFile or keyFile");
    Deno.exit(1);
}

const server = new WebTransportServer("https://localhost:4433", {
    certFile: "./certs/localhost.crt",
    keyFile: "./certs/localhost.key",
    maxTimeout: 10,
    keepAlive: 3,
});

await server.listen();
console.log("Server listening");
server.on("connection", async (transport) => {
    console.log("New client");

    const stream = transport.incomingUnidirectionalStreams;
    const reader = stream.getReader();
    while (true) {
        const { value, done } = await reader.read();
        const DATA = value!.getReader();
        console.log("New incoming stream opened ", value);
        let { value: val, done: d } = await DATA.read();
        console.log(val);

        if (done) break;
    }
});
const client = new WebTransport("https://localhost:4433");
await client.ready;
console.log("Client connected");

//after 5 seconds call closed on client
setTimeout(async () => {
    console.log("Client client after 2 seconds");
    await client.closed;
}, 2000);

//after 10 seconds call close on server
setTimeout(() => {
    console.log("Server closed after 5 seconds");
    server.close();
}, 5000);
