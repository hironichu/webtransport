if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import { join } from "./deps.ts";
import { encodeBuf } from "./utils.ts";
export function base64ToArrayBuffer(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function readCertFile(certpath: string) {
    try {
        Deno.statSync(certpath);
    } catch {
        throw new Error("Certificate file does not exist");
    }
    const cert = Deno.readTextFileSync(certpath);
    const certBase64 = cert.replace(/-----BEGIN CERTIFICATE-----/g, "").replace(
        /-----END CERTIFICATE-----/g,
        "",
    ).replace(/\n/g, "");
    const certBuffer = base64ToArrayBuffer(certBase64);
    return certBuffer;
}

export function GenerateCertKey(
    domainStr: string,
    start: number,
    end: number,
) {
    if (start > end) throw new Error("Invalid date range");
    if (domainStr.length === 0) throw new Error("Invalid domain name");

    const domain = encodeBuf(domainStr);
    const certBUFF = new Uint8Array(2048);
    const certLenPTR = new Uint32Array(1);
    const keyBUFF = new Uint8Array(2048);
    const keyLenPTR = new Uint32Array(1);
    try {
        const struct = window.WTLIB.symbols.proc_gencert(
            domain[0],
            domain[1],
            start,
            end,
            certBUFF,
            certLenPTR,
            keyBUFF,
            keyLenPTR,
        );
        if (!struct) {
            throw new Error("Failed to generate certificate");
        }

        const cert = certBUFF.subarray(0, certLenPTR[0]);
        const key = keyBUFF.subarray(0, keyLenPTR[0]);

        return [cert, key];
    } catch (e) {
        console.error(e);
        Deno.exit(1);
    }
}

/// Generate certificate and key file
/// GenerateCertKeyFile("localhost", 0, 10);
export function GenerateCertKeyFile(
    domainStr: string,
    start: number,
    end: number,
    path?: string,
    keyFileName?: string,
    certFileName?: string,
) {
    if (start > end) throw new Error("Invalid date range");
    path = path ?? join(Deno.cwd(), "./certs/");
    //check path
    try {
        Deno.statSync(path);
    } catch {
        console.info("[Webtransport] Creating directory: ", path);
        Deno.mkdirSync(path, {
            recursive: true,
        });
    }
    const [cert, key] = GenerateCertKey(domainStr, start, end);
    const certpath = join(path, `${certFileName ?? domainStr + ".crt"}`);
    const keypath = join(path, `${keyFileName ?? domainStr + ".key"}`);
    try {
        Deno.writeFileSync(certpath, cert, {
            mode: 0o766,
            create: true,
        });
        Deno.writeFileSync(keypath, key, {
            mode: 0o766,
            create: true,
        });
        return [certpath, keypath];
    } catch (e) {
        console.error(e);
        throw new Error("Failed to write certificate or key file ", e);
    }
}
