import { readCertFile } from "../mod/crypto.ts";

const certFile = readCertFile("./certs/cert.pem");
const certHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', certFile)));

let indexHTML  =Deno.readTextFileSync('./examples/index.html');

indexHTML = indexHTML.replace('CERT_HASH', "[" + certHash + "]");

Deno.serve((_) => {
	return new Response(indexHTML, {
		headers: {
			'content-type': 'text/html'
		}
	});
})