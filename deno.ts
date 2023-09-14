const lib = Deno.dlopen("./target/release/libftlt.dylib", {
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
    recv_conn: {
        parameters: ["pointer"],
        result: "pointer",
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
  const _ = await lib.symbols.handle_session(resptr, runtime);

//   const delayedResponses = {
//     delays: [500],
  
//     wait(delay: number) {
//       return new Promise((resolve) => {
//         setTimeout(resolve, delay);
//       });
//     },
  
//     async *[Symbol.asyncIterator]() {
//       for (const delay of this.delays) {
//         await this.wait(delay);
//         yield lib.symbols.recv_conn(resptr);
//       }
//     },
//   };
//add ASyncIterator symbol to lib.symbols.recv_conn(resptr)
// let conn = await lib.symbols.recv_conn(resptr);
// for await (const conn of delayedResponses) {
//     console.log(conn);
// }
// let nread = lib.symbols.recv_conn(resptr);

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