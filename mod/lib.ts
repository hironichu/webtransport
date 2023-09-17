import { dlopen, FetchOptions } from "./deps.ts";
import LIB_URL from "../utils/download_lib.ts";
import { symbols } from "./interface.ts";

const options: FetchOptions = {
    name: "webtransport",
    cache: "reloadAll",
    url: LIB_URL!,
};

export const LIB = async () => await dlopen(options, symbols);

export default { LIB, symbols };
