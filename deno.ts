const lib = Deno.dlopen("./target/release/ftlt.dll", {
    start: {
        parameters: ["function", "buffer", "pointer"],
        result: "pointer",
        callback: true,
    },
    handle_session: {
        parameters: ["pointer", "pointer"],
        result: "pointer",
        nonblocking: true,
    },
    init_runtime: {
        parameters: [],
        result: "pointer",
    },
    proc_rec: {
        parameters: ["pointer"],
        result: "pointer",
        nonblocking: true,
    },
	proc_rec_streams: {
		parameters: ["pointer", "pointer", "pointer"],
		result: "void",
		nonblocking: true,
	},
	proc_recv_ch_datagram: {
		parameters: ["pointer", "pointer", "buffer"],
		result: "usize",
		nonblocking: true,
	},
	test_proc: {
		parameters: ["pointer"],
		result: "void",
		nonblocking: true,
	},
})

const ptrstate = new Uint32Array(1);

const sender = new Deno.UnsafeCallback(
    {
      parameters: ["u32", "pointer", "u32"],
      result: "void",
    },
    (_code: unknown | number, buffer, buflen) => {
      const code = _code as typeof ptrstate[0];
      if (buflen < 0) {
        return;
      }
      const pointer = Deno.UnsafePointerView.getArrayBuffer(
        buffer as unknown as NonNullable<Deno.PointerValue>,
        buflen,
      );
    },
  );
  const runtime = lib.symbols.init_runtime();
  const resptr = lib.symbols.start(sender.pointer, ptrstate, runtime);
  await lib.symbols.handle_session(resptr, runtime);


Promise.all([(async () => {
	let client = await lib.symbols.proc_rec(resptr);

	while(client !== null) {
		console.log("New connection");
		await lib.symbols.proc_rec_streams(resptr, runtime, client)
	// 	//start a new thread to handle the connection
	// 	lib.symbols.proc_rec_streams(resptr, client);
	// 	//
	// 	console.log("Connection handled");

	// 	// let mut buffer = vec![0; 65536].into_boxed_slice();
	Promise.all([(async () => {
		let buffer = new Uint8Array(65536);
		let res = await lib.symbols.proc_recv_ch_datagram(resptr, client, buffer);
		while (res > 0) {
			const ress = buffer.subarray(0, res as number);
			console.log(ress);
			buffer = buffer.fill(0);
			res = await lib.symbols.proc_recv_ch_datagram(resptr, client, buffer);
		}
	})()]);

	// 	// const buffview = new Deno.UnsafePointerView(res!);
	// 	// console.log(buffview.getBigInt64(0));
		client = await lib.symbols.proc_rec(resptr);
	}
})()]);

// setInterval(() => {
//     console.log(ptrstate[0]);
// }, 5000);

Deno.serve((_req: Request) => {
    return new Response(Deno.readTextFileSync("./index.html"), {
        headers: {
            "content-type": "text/html"
        }
    });
})