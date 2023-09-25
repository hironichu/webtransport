import "https://deno.land/std@0.201.0/dotenv/load.ts";
const LIB_NAME = "webtransport";
let LIB_URL: URL | undefined;

if (!Deno.env.has("DEVELOPMENT") && !Deno.env.has("CI_BUILD")) {
    const headers = new Headers();
    if (Deno.env.has("DENO_AUTH_TOKENS")) {
        headers.set(
            "Authorization",
            `token ${
                Deno.env.get("DENO_AUTH_TOKENS")!.split("@")[0].split(
                    ":",
                )[1]
            }`,
        );
    }
    headers.set("Accept", "application/vnd.github.v3+json");
    const data = await fetch(
        `https://api.github.com/repos/hironichu/${LIB_NAME}/releases`,
        {
            headers: headers,
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
    LIB_URL = new URL(
        json[0]
            .assets[
                `${LIB_NAME}_${Deno.build.os}_${Deno.build.arch}`
            ][0].url,
    );
    LIB_URL!.username = Deno.env.has("DENO_AUTH_TOKENS")
        ? Deno.env.get("DENO_AUTH_TOKENS")!.split("@")[0]!
        : "";
}
const build_target = Deno.env.get("DEVELOPMENT") ? "debug" : "release";
LIB_URL = LIB_URL ?? new URL(`../target/${build_target}/`, import.meta.url);
export default LIB_URL;
