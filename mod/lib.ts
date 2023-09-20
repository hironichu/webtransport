import { toFileUrl } from "./deps.ts";
import LIB_URL from "../utils/download_lib.ts";
import { symbols } from "./interface.ts";

let local = false;
let download_lib: URL;
if (import.meta.url.startsWith("file://")) {
    local = true;
    download_lib = new URL(`http://localhost/`);
} else {
    local = false;
    if (LIB_URL) {
        download_lib = LIB_URL;
    } else {
        throw new Error("LIB_URL is not defined");
    }
}
const askPerm = async (): Promise<void> => {
    if ((await Deno.permissions.query({ name: "write" })).state !== "granted") {
        console.info(
            `We need to download the library to use this module, please grant write permission to Deno.`,
        );
        await Deno.permissions.request({
            name: "write",
            path: Deno.cwd(),
        });
    }

    if (
        (await Deno.permissions.query({ name: "read" }))
            .state !==
            "granted"
    ) {
        console.info(
            `We need to download the library to use this module, please grant read permission to Deno.`,
        );
        await Deno.permissions.request({
            name: "read",
        });
    }
};
const currentPath = toFileUrl(Deno.cwd() + "/");

const dirpath = local ? "./target/debug/" : "./.lib/";
let [fileExt, fileprefix] = ["", Deno.build.os === "windows" ? "" : "lib"];
switch (Deno.build.os) {
    case "windows":
        fileExt = ".dll";
        break;
    case "linux":
        fileExt = ".so";
        break;
    case "darwin": {
        fileExt = ".dylib";
        break;
    }
}
const buildFilename = local
    ? `${fileprefix}webtransport${
        !Deno.env.has("CI_BUILD") ? "" : `_${Deno.build.arch}_`
    }${fileExt}`
    : `${fileprefix}webtransport_${Deno.build.arch}_${fileExt}`;
console.log(buildFilename);
const DURL = new URL(dirpath + buildFilename, currentPath);
if (!local) {
    const remoteLIb = await fetch(download_lib, {
        headers: {
            Accept: "application/octet-stream",
        },
    });
    const remoteBuffer = new Uint8Array(await remoteLIb.arrayBuffer());
    let dirs = false;
    try {
        const dir = Deno.statSync(`./.lib`);
        if (dir.isDirectory) {
            dirs = true;
            Deno.statSync(DURL);
            const file = Deno.readFileSync(DURL);
            const localhash = await crypto.subtle.digest("SHA-1", file);
            const remotehash = await crypto.subtle.digest(
                "SHA-1",
                remoteBuffer,
            );
            const localhashHex = Array.from(new Uint8Array(localhash)).map((
                b,
            ) => b.toString(16).padStart(2, "0")).join("");
            const remotehashHex = Array.from(new Uint8Array(remotehash)).map((
                b,
            ) => b.toString(16).padStart(2, "0")).join("");
            if (localhashHex !== remotehashHex) {
                await askPerm();
                Deno.writeFileSync(DURL, remoteBuffer);
            }
        } else {
            dirs = false;
            throw "";
        }
    } catch {
        await askPerm();
        if (!dirs) {
            Deno.mkdirSync(`./dist`, { recursive: false });
        }
        Deno.writeFileSync(DURL, remoteBuffer, {
            create: true,
            mode: 0o755,
        });
    }
    console.log(`Downloaded library to ${DURL}`);
}

export const LIB = async () => await Deno.dlopen(DURL, symbols);

export default { LIB, symbols };
