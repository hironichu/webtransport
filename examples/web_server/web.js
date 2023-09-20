import { readCertFile } from "../../mod/crypto.ts";

//grab the first argument as the IP to connect to (defaults to localhost)
const ip = Deno.args[0] || "localhost";

const certFile = readCertFile("./certs/localhost.crt");
const crtdata = new Uint8Array(await crypto.subtle.digest("SHA-256", certFile));
const certHash = Array.from(crtdata);

let indexHTML = Deno.readTextFileSync("./examples/web_server/index.html");

indexHTML = indexHTML.replace("CERT_HASH", "[" + certHash + "]").replaceAll(
    "HOST_IP",
    ip,
);

Deno.serve((_) => {
    return new Response(indexHTML, {
        headers: {
            "content-type": "text/html",
        },
    });
});
