# Deno Webtransport

This library implements a very WIP version of the
[WebTransport](https://w3c.github.io/webtransport/) API for Deno.


> This implementation tries to follow the web standards but has some differences
> ⚠️ This is not production ready ⚠️

# TODO

- [x] Implement the client API
- [x] Implement the server API
- [x] Implement Streams
  - [x] Implement BidirectionalStream
  - [x] Implement UniDirectionalStream
- [x] Implement Datagrams
- [ ] Implement closes and errors :
  - [x] Implement closes and errors for the client
  - [ ] Implement closes and errors for the server

For now, the server doesnt really close gracefully, it will try to close any
connection to it, but it might never stop running.. this needs way more work in
order to be usable.

Most of the code has been tested without unit tests, so there will be a lot of
bugs.

# NOTICE

This library is no way near production ready, and should never be used without
throughly testing it.

Feel free to open issues and PRs.

# IMPORTANT

The module add declaration to the global namespace, so you can use the API
without importing the classes

This might not be practical for some people, but for now wont be changed.



## Usage

### Client example :

This client follows the standards of the API, but the server does not (since it
has not been defined).

```ts
import "https://deno.land/x/webtransport/mod.ts";

const encoder = new TextEncoder();
//Client
const transport = new WebTransport("https://localhost:4433");

await transport.ready;

// Send Datagram packet

const data = encoder.encode("Hello World");
const writer = await transport.datagrams.writable.getWriter();
await writer.write(data);

/// Create a bidirectional stream and send data
/// The bidirectional stream is a duplex stream, so you can read and write from it.
/// it also sends data in order and is reliable. (unlike datagrams)
const stream = await transport.createBidirectionalStream();
const writer = stream.writable.getWriter();
const data = encoder.encode("Hello World");
await writer.write(data);

/// Read incoming data from the stream
/// You can also loop over the readable stream using a for await loop
/// NOTE : The api for looping over the readable stream is not yet implemented in the browser
const reader = stream.readable.getReader();
const decoder = new TextDecoder();
const { value, done } = await reader.read();
console.log(decoder.decode(value));
```

### Server example :

This server tries to be as close to the client api but has some differences.
You can reuse the same api as the client because they share the same
implementation for streams.

```ts
import "https://deno.land/x/webtransport/mod.ts";

//Server
const transport = new WebTransportServer(4433, {
    keyFile: "./certs/key.pem",
    certFile: "./certs/cert.pem",
    maxTimeout: 10,
    keepAlive: 3,
});


//Required to make sure the server is listening for new connections.
await transport.ready;

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

