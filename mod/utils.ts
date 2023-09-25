if (import.meta.main) {
    throw new Error("This module is not meant to be imported.");
}
export const encoder = new TextEncoder();

export function encodeBuf(v: string | Uint8Array): [Uint8Array, number] {
    if (typeof v !== "string") return [v, v.byteLength];
    const encoded = encoder.encode(v);
    return [encoded, encoded.byteLength];
}
export const decoder = new TextDecoder();
export default {
    decoder,
    encoder,
    encodeBuf,
};
