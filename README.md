# Deno Webtransport

This library implements a very WIP version of the
[WebTransport](https://w3c.github.io/webtransport/) API for Deno.

> This does not follow perfectly the web standards and is not production ready.
> basically just a PoC

## Usage

### Client example :

This client follows the standards of the API, but the server does not (since it
has not been defined).

```ts
import "https://deno.land/x/webtransport/mod.ts";

//Client
const transport = new Deno.WebTransport("https://localhost:4433");
/**
 * Please note that this example above will not work if you have self validated certificates
 * use the following to disable certificate verification.. (Warning this is not secure)
 * const transport = new WebTransport("https://localhost:4433", {
 *   maxTimeout: 10,
 *   keepAlive: 3,
 *   validateCertificate: false,
 * });
 */
await transport.ready;
// Send Datagram packet

const encoder = new TextEncoder();
const data = encoder.encode("Hello World");
const writer = await transport.datagrams.writable.getWriter();
await writer.write(data);
```

### Server example :

This server tries to be as close to the client api but has some differences.

```ts
import "https://deno.land/x/webtransport/mod.ts";

//Client
const transport = new Deno.WebTransportServer(4433, {
    keyFile: "./certs/key.pem",
    certFile: "./certs/cert.pem",
    maxTimeout: 10,
    keepAlive: 3,
});

transport.on("connection", async (conn) => {
    //To get the datagrams from the client you can just look over the datagram stream
    for await (const datagram of conn.datagrams.readable) {
        const decoder = new TextDecoder();
        console.log(decoder.decode(datagram));
    }
    //The server can also send datagrams to the client (using the same API for consistency)
    const encoder = new TextEncoder();
    const data = encoder.encode("Hello World");
    const writer = await conn.datagrams.writable.getWriter();
    await writer.write(data);
});
```

# IMPORTANT

The module add declaration to the global scope, so you can use the API without
importing the classes

This might not be practical for some people, but for now cannot be changed.
