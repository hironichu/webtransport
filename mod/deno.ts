import { LIB } from "./lib.ts";

const lib = LIB;
export function encode(v: string | Uint8Array): Uint8Array {
    if (typeof v !== "string") return v;
    return new TextEncoder().encode(v);
}
export function encodeBuffPtr(v: string | Uint8Array): [Uint8Array, number] {
    if (typeof v !== "string") return [v, v.length];
    return [new TextEncoder().encode(v), v.length];
}

const ptrstate = new Uint32Array(1);

const sender = new Deno.UnsafeCallback(
    {
        parameters: ["u32", "pointer", "u32"],
        result: "void",
    },
    (_code: unknown | number, buffer, buflen) => {
        const code = _code as typeof ptrstate[0];
        console.log(code);
        if (buflen < 0) {
            return;
        }
        const pointer = Deno.UnsafePointerView.getArrayBuffer(
            buffer as unknown as NonNullable<Deno.PointerValue>,
            buflen,
        );
        console.log(pointer);
    },
);

sender.ref();
let serverPTR;
let new_connection;
const decoder = new TextDecoder();
try {
    const certpath = encodeBuffPtr("./certs/cert.pem");
    const keypath = encodeBuffPtr("./certs/key.pem");

    serverPTR = lib.symbols.proc_server_init(
        sender.pointer,
        4433,
        true,
        0,
        100,
        certpath[0],
        certpath[1],
        keypath[0],
        keypath[1],
    );
    new_connection = new Deno.UnsafeCallback(
        {
            parameters: ["pointer"],
            result: "void",
        },
        async (client) => {
            console.log("DENO : New connection");
            const DBufferB = new Uint8Array(65536);

            lib.symbols.proc_server_init_streams(
                client,
                DBufferB,
                DBufferB.byteLength,
            );
            const StreamBuffer = new ReadableStream({
                async pull(controller) {
                    try {
                        const nread = await lib.symbols.proc_recv_datagram(
                            client,
                        );
                        if (nread > 0) {
                            controller.enqueue(
                                DBufferB.subarray(0, nread as number),
                            );
                        }
                    } catch (e) {
                        controller.error(e);
                    }
                },
                cancel() {
                    console.error("[Error] Stream cancelled");
                },
            });
            for await (const chunk of StreamBuffer) {
                // const msg = parseInt(decoder.decode(chunk));
                // console.log(decoder.decode(chunk));
                lib.symbols.proc_send_datagram(client, chunk, chunk.length);
            }
        },
    );
    new_connection.ref();
    lib.symbols.proc_server_listen(serverPTR, new_connection.pointer);
    console.info("Server is running");
} catch (e) {
    sender.unref();
    new_connection?.unref();
    console.error(e);
}
if (!serverPTR) throw new Error("Server is not running");
