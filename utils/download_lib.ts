import "https://deno.land/std@0.201.0/dotenv/load.ts";
const LIB_NAME = "webtransport";
let LIB_URL: URL | undefined;

if (!Deno.env.get("DEVELOPMENT")) {
    if (!Deno.env.get("DENO_AUTH_TOKENS")) {
        throw new Error("Please set DENO_AUTH_TOKENS to your auth tokens");
    }
    const data = await fetch(
        `https://api.github.com/repos/hironichu/${LIB_NAME}/releases`,
        {
            headers: {
                Authorization: `token ${
                    Deno.env.get("DENO_AUTH_TOKENS")!.split("@")[0].split(
                        ":",
                    )[1]
                }`,
                Accept: "application/vnd.github.v3+json",
            },
        },
    );

    const json = await data.json() as Array<{
        assets: {
            [key: string]: Array<{
                url: string;
            }>;
        };
    }>;
    if (json.length === 0) {
        throw new Error("No release found");
    }

    switch (Deno.build.os) {
        case "windows":
            LIB_URL = new URL(
                // json[0].assets.filter((item: { name: string }) =>
                //     item.name.endsWith(".dll")
                // )[0].url,
                json[0].assets[`${LIB_NAME}.dll`][0].url,
            );
            break;
        case "linux":
            {
                let filename = LIB_NAME;
                if (Deno.build.arch === "aarch64") {
                    filename = `lib${LIB_NAME}_aarch64.so`;
                } else {
                    filename = `lib${LIB_NAME}.so`;
                }
                LIB_URL = new URL(
                    json[0].assets[filename][0].url,
                );
            }
            break;
        case "darwin":
            LIB_URL = new URL(
                json[0].assets[`${LIB_NAME}.dylib`][0].url,
            );
            break;
    }
    LIB_URL!.username = Deno.env.get("DENO_AUTH_TOKENS")!.split("@")[0]!;
}

LIB_URL = LIB_URL ?? new URL("../target/release/", import.meta.url);
export default LIB_URL;
