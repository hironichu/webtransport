import { dlopen, FetchOptions } from "./deps.ts";
import LIB_URL from "../utils/download_lib.ts";
import { symbols } from "./interface.ts";
import { CacheSetting } from "https://deno.land/x/plug@1.0.2/mod.ts";

const cache: CacheSetting = Deno.env.has("DEVELOPMENT") ? "reloadAll" : "only";

const options: FetchOptions = {
    name: "webtransport",
    cache: cache,
    url: LIB_URL!,
};

export const LIB = async () => await dlopen(options, symbols);

export default { LIB, symbols };
