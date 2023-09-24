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
server.on("connection", async (conn) => {
    console.log("New client");
    const sendStream = await conn.createUnidirectionalStream();
    console.log("Send Stream open");
    const writer = sendStream.getWriter();
    // //wait 5 seeconds and send 2 message every 2 secondes
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // console.log("starting sends");
    await writer.write(new TextEncoder().encode("Hello from server"));
    await writer.write(new TextEncoder().encode("Hello from server 2"));
    await writer.write(new TextEncoder().encode("Hello from server 3"));
    // let sent = 0;
    // const inter = setInterval(() => {
    //     writer.write(new Uint8Array([1, 2, 3, 4, 5]));
    //     writer.write(new Uint8Array([1, 2, 3, 4, 5]));
    //     if (sent === 10) {
    //         clearInterval(inter);
    //         //close the stream (this will also finish the stream on rust side)
    //         writer.close();
    //     }
    //     sent++;
    // }, 2000);
});
