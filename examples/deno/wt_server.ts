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
} catch (e) {
    console.error("Invalid certFile or keyFile");
    Deno.exit(1);
}

const server = new WebTransportServer(4433, {
    certFile: "./certs/localhost.crt",
    keyFile: "./certs/localhost.key",
    maxTimeout: 10,
    keepAlive: 3,
});

console.log("Server created");
server.on("listening", (e) => {
    console.log("Listening OUT", e);
});

server.on("connection", async (connection) => {
    console.log("Connection ");
    for await (const read of connection.datagrams.readable) {
        console.log(read);
    }
});
