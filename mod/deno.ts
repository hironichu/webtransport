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
const decoder = new TextDecoder();
try {
  const certpath = encodeBuffPtr("./certs/cert.pem");
  const keypath = encodeBuffPtr("./certs/key.pem");

  serverPTR = lib.symbols.proc_init( sender.pointer, 4433 ,true, 0, 100, certpath[0], certpath[1], keypath[0], keypath[1]);
  const new_connection = new Deno.UnsafeCallback(
	{
	  parameters: [ "pointer" ],
	  result: "void",
	},
	async (client) => {
		console.log("DENO : New connection");
		// const DBuffer = new Uint8Array(65536);
		const DBufferB = new Uint8Array(65536);
		//fill the buffer with 0
		DBufferB.fill(0);
		lib.symbols.proc_init_client_streams(serverPTR!, client, DBufferB, DBufferB.byteLength);
		const StreamBuffer = new ReadableStream({

			async pull(controller) {
				const nread = await lib.symbols.proc_recv_datagram(serverPTR!, client);
				if (nread > 0) {
					controller.enqueue(DBufferB.slice(0, nread as number));
				}
			},
			cancel(_) {
				console.error("[Error] Stream cancelled");
			}
		});
		for await (const chunk of StreamBuffer) {
			const msg = parseInt(decoder.decode(chunk));
			console.log(msg);
		}
	},
  );
  new_connection.ref(); 
  lib.symbols.proc_listen(serverPTR, new_connection.pointer);
  console.info("Server is running");
} catch (e) {
	sender.unref();
  	console.error(e);
}
if (!serverPTR) throw new Error("Server is not running");



