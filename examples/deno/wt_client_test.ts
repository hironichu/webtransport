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
        // const server = new WebTransportServer(4433, {
        //     certFile: "./certs/cert.pem",
        //     keyFile: "./certs/key.pem",
        //     maxTimeout: 10,
        //     keepAlive: 5,
        // });

        // const client = new WebTransport("https://localhost:4433", {
        //     maxTimeout: 50,
        //     keepAlive: 3,
        //     validateCertificate: false,
        // });
        // server.on("connection", (_) => {
        //     console.log("OK");
        //     // await client.close();
        // });
    },
);