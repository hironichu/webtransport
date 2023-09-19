import "../../mod/mod.ts";
import { GenerateCertKeyFile } from "../../mod/crypto.ts";

const hostname = Deno.args[0] ?? "localhost";

if (typeof hostname !== "string" || hostname.length == 0) {
    console.error("Invalid hostname");
    Deno.exit(1);
}

GenerateCertKeyFile(hostname, 0, 10);