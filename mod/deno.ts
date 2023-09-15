import { calculateSHA256, readCertFile } from "./crypto.ts";
import { PackedStruct, u32, u8, NullTerminatedString } from "https://deno.land/x/byte_type@0.2.2/mod.ts";

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
  const certpath = encodeBuffPtr("./certs/cert.crt");
  const keypath = encodeBuffPtr("./certs/cert.key");
  serverPTR = lib.symbols.proc_init( sender.pointer, 4433 ,true, 0, 100, certpath[0], certpath[1], keypath[0], keypath[1]);
  const new_connection = new Deno.UnsafeCallback(
	{
	  parameters: [ "pointer" ],
	  result: "void",
	},
	(client) => {
		console.log("DENO : New connection");
		lib.symbols.proc_init_client_streams(serverPTR!, client, new Uint32Array(1));

		// const encodedmesg = encodeBuffPtr("Hello from deno");
		// lib.symbols.proc_send_datagram(serverPTR!, client, encodedmesg[0], encodedmesg[1]);
		const buffer = new Uint8Array(65536);
		Promise.all([(async () => {
			console.log("DENO : Reading Datagrams");
			let res = await lib.symbols.proc_recv_datagram(serverPTR!, client, buffer);
			performance.clearMarks("start");
			performance.clearMarks("end");
			performance.clearMeasures("DENO");
			while (res > 0) {
				const ress = buffer.subarray(0, res as number);
				console.log(ress)
				const msg = parseInt(decoder.decode(ress));
				if (msg === 0) {
					console.log("DENO: Start timing");
					performance.mark("start");
				}
				if (msg === 49999) {
					console.log("DENO: End timing");
					performance.mark("end");
					performance.measure("DENO", "start", "end");
					const measure = performance.getEntriesByName("DENO")[0];
					console.log("Last message : " + msg);
					console.log(measure);

				}
				lib.symbols.proc_send_datagram(serverPTR!, client, ress, res);
				res = await lib.symbols.proc_recv_datagram(serverPTR!, client, buffer);
			}
		})()]);
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

//

// Promise.all([(async () => {
// 	let client = await lib.symbols.proc_rec(resptr);

// 	while(client !== null) {
// 		console.log("New connection");
// 		await lib.symbols.proc_rec_streams(resptr, runtime, client)
// 	// 	//start a new thread to handle the connection
// 	// 	lib.symbols.proc_rec_streams(resptr, client);
// 	// 	//
// 	// 	console.log("Connection handled");

// 	// 	// let mut buffer = vec![0; 65536].into_boxed_slice();
// 	Promise.all([(async () => {
// 		let buffer = new Uint8Array(65536);
// 		let res = await lib.symbols.proc_recv_ch_datagram(resptr, client, buffer);
// 		while (res > 0) {
// 			const ress = buffer.subarray(0, res as number);
// 			console.log(ress);
// 			buffer = buffer.fill(0);
// 			res = await lib.symbols.proc_recv_ch_datagram(resptr, client, buffer);
// 		}
// 	})()]);

// 	// 	// const buffview = new Deno.UnsafePointerView(res!);
// 	// 	// console.log(buffview.getBigInt64(0));
// 		client = await lib.symbols.proc_rec(resptr);
// 	}
// })()]);



