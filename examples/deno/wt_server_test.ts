import "../../mod/mod.ts";
Deno.test({ name: "Server startup/close" }, async () => {
    const server = new WebTransportServer(4433, {
        certFile: "./certs/cert.pem",
        keyFile: "./certs/key.pem",
        maxTimeout: 10,
        keepAlive: 3,
    });

    await server.close();
});

Deno.test(
    { name: "Server with generated certificate startup/close" },
    () => {
        const server = new WebTransportServer(4433, {
            maxTimeout: 10,
            keepAlive: 3,
            notAfter: 10,
            notBefore: 0,
            domain: "localhost",
        });
        server.close();
    },
);
