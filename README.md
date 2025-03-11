# Webtransport

A QUIC+Webtransport server abstraction for Deno

> Module still in development relying on unstable feature in Deno 2.0.3+, do not
> use in production.

This module aims to have a tiny amount of abstraction to manage clients
connection in Deno, using no dependencies and very tiny codebase.

It is aimed to be used in server application that want to receive and manage
both QUIC and Webtransport connection simultanously.

### How to install :

```bash
deno add jsr:@webtransport/webtransport
```

### Exemples :

```type
import { Client, ClientTransportType, Server, ServerConfig, StreamID } from "@webtransport/webtransport";

const config = new ServerConfig(
  "0.0.0.0",
  443,
  "./cert.pem",
  "./private.pem",
  "h3-qcw",
);

const server = new Server(config);

await server.start();


try {
    for await (const conn of server.listener!) {
        const client = await server.handle(conn);
        if (client) {
            Promise.all([handle(client)]);
        }
    }
} catch (e) {
    console.error("CATCHED ERROR: ", e);
    Deno.exit(1);
}



async function handle(info: [StreamID, Client<ClientTransportType>]) {
    const client = info[1];
    console.log("Handling new client with id: ", info[0].value);
    try {
        for await (const data of client.receiveDatagrams()!) {
            console.log("Data: ", data);
            //echo back
        }
    } catch (e) {
        console.error("Error while handling client: ", e);
    }
    await client.transport.closed;
    console.log("Client closed: ", client);
}
```
