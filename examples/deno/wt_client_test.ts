import "../../mod/mod.ts";
// import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
// import { getAnyEdgeLatest } from "npm:edge-paths";

// Deno.test(
//     { name: "Browser test", ignore: Deno.build.os != "windows" },
//     async () => {
//         const browser = await puppeteer.launch({
//             headless: true,
//             defaultViewport: null,
//             executablePath: getAnyEdgeLatest(),
//             // no extension
//             args: [
//                 "--enable-automation",
//                 "--disable-gpu",
//                 "--disable-extensions",
//             ],
//         });
//         //TODO(hironichu): Setup valid testing context for client
//         const page = await browser.newPage();

//         await page.goto("https://google.com", {
//             waitUntil: "networkidle2",
//         });

//         // await page.pdf({ path: "hn.pdf", format: "A4" });

//         await browser.close();
//     },
// );
Deno.test(
    {
        name: "Client connect/close (unsafe)",
        sanitizeOps: false,
        sanitizeResources: false,
    },
    async () => {
        //THis causes panic???????
        const server = new WebTransportServer("https://localhost:4433", {
            certFile: "./certs/localhost.crt",
            keyFile: "./certs/localhost.key",
            maxTimeout: 10,
            keepAlive: 3,
        });
        await server.ready;

        const client = new WebTransport("https://localhost:4433", {
            maxTimeout: 50,
            keepAlive: 3,
        });
        await client.ready;
        server.on("connection", (_) => {
            setTimeout(async () => {
                await client.closed;
            }, 2000);
        });
        console.log("Closing");
        server.close();
    },
);
