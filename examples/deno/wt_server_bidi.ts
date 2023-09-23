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

server.listen();
console.log("Server listening");
server.on("connection", async (conn) => {
    const bidiStream = await conn.createBidirectionalStream();
    const writer = bidiStream.writable.getWriter();
    writer.write(new Uint8Array([1, 2, 3, 4, 5]));
    writer.write(new Uint8Array([1, 2, 3, 4, 5]));
    writer.write(new Uint8Array([1, 2, 3, 4, 5]));
    for await (const reads of bidiStream.readable) {
        console.log(reads);
    }
});
