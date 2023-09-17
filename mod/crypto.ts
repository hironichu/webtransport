if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
import { join } from "https://deno.land/std@0.184.0/path/mod.ts";
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
    const certBUFF = new Uint8Array(1024);
    const keyBUFF = new Uint8Array(1024);
    const certLenPTR = new Uint32Array(1);
    const keyLenPTR = new Uint32Array(1);
    try {
        const struct = window.WTLIB.symbols.proc_gencert(
            domain[0],
            domain[1],
            2,
            10,
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
    path = "./certs/",
) {
    const [cert, key] = GenerateCertKey(domainStr, start, end);
    try {
        const certpath = join(path, `${domainStr}.crt`);
        const keypath = join(path, `${domainStr}.key`);
        Deno.writeFileSync(certpath, cert, {
            mode: 0o444,
            createNew: true,
        });
        Deno.writeFileSync(keypath, key, {
            mode: 0o444,
            createNew: true,
        });
        return [certpath, keypath];
    } catch {
        throw new Error("Failed to write certificate file");
    }
}
