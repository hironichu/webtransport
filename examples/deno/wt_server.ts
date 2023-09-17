//TO BE IMPLEMENTED
import "../../mod/mod.ts";

const server = new WebTransportServer(4433, {
    certFile: "./certs/cert.pem",
    keyFile: "./certs/key.pem",
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
