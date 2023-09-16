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
