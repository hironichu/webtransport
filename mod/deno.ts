import { calculateSHA256, readCertFile } from "./crypto.ts";
import { PackedStruct, u32, u8, NullTerminatedString } from "https://deno.land/x/byte_type@0.2.2/mod.ts";

import { LIB } from "./lib.ts";
const lib = LIB;


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
try {
  const resptr = lib.symbols.proc_init(4433, sender.pointer);
  lib.symbols.proc_listen(resptr);
} catch (e) {
  // console.error(e);
}
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

// // setInterval(() => {
// //     console.log(ptrstate[0]);
// // }, 5000);

// Deno.serve((_req: Request) => {
//     return new Response(Deno.readTextFileSync("./index.html"), {
//         headers: {
//             "content-type": "text/html"
//         }
//     });
// })
