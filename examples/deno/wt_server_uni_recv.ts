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
Deno.serve(() => new Response("Welcome to Deno 🦕"));
const server = new WebTransportServer("https://localhost:4433", {
    certFile: "./certs/localhost.crt",
    keyFile: "./certs/localhost.key",
    maxTimeout: 10,
    keepAlive: 3,
});
server.on("listening", () => {
    console.log("Server listening");
});

server.on("connection", async (transport) => {
    console.log("New client");

    const stream = transport.incomingUnidirectionalStreams;
    const reader = stream.getReader();
    const first = await reader.read();
});

await server.ready;
//after 5 seconds call closed on client

const client = new WebTransport("https://localhost:4433");
await client.ready;
