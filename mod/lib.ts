import { FetchOptions, dlopen } from "./deps.ts";

const symbols = {
    proc_server_init: {
        parameters: ["function", "u16", "bool", "u64", "u64","buffer","usize","buffer","usize"],
        result: "pointer",
        callback: true,
    },
    proc_server_listen: {
        parameters: ["pointer", "function"],
        result: "pointer",
    },

	proc_server_init_streams: {
		parameters: ["pointer", "buffer", "usize"],
		result: "void",
		nonblocking: true,
	},
	proc_recv_datagram: {
		parameters: ["pointer"],
		result: "usize",
		nonblocking: true,
	},
    proc_send_datagram: {
        parameters: ["pointer", "buffer", "usize"],
        result: "void",
        nonblocking: false,
    },


} as const;

//TODO(hironichu): Make this works from internet path
const options: FetchOptions = {
    name: "ftlt",
	cache: "reloadAll",
    url: "./target/release/",
};


export const LIB = await dlopen(options,symbols);