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

await server.ready;
console.log("Server listening");
const decodeer = new TextDecoder();
const stdin = Deno.stdin.readable;
server.on("connection", async (conn) => {
    console.log("New connection");
    const bidiStream = conn.incomingBidirectionalStreams;
    const BIDireader = bidiStream.getReader();
    const { value: firststream } = await BIDireader.read();

    console.log("READING STD IN");
    await Promise.all([
        (async () => {
            for await (const data of firststream!.readable) {
                const decoded = decodeer.decode(data).trim().replaceAll(
                    "\t",
                    " ",
                );
                if (decoded === "exit") {
                    await server.close();
                    return;
                }
                console.log("Recevied : ", decoded);
            }
        })(),
        (() => {
            stdin.pipeTo(firststream!.writable);
        })(),
    ]);
});
