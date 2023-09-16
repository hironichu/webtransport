import { FetchOptions, dlopen } from "./deps.ts";

const symbols = {
    proc_init: {
        parameters: ["function", "u16", "bool", "u64", "u64","buffer","usize","buffer","usize"],
        result: "pointer",
        callback: true,
    },
    proc_listen: {
        parameters: ["pointer", "function"],
        result: "pointer",
    },
    // proc_newconn: {
    //     parameters: ["pointer"],
    //     result: "void",
    // },
	proc_init_client_streams: {
		parameters: ["pointer", "pointer", "buffer", "usize"],
		result: "void",
		nonblocking: true,
	},
	proc_recv_datagram: {
		parameters: ["pointer", "pointer"],
		result: "usize",
		nonblocking: true,
	},
    proc_send_datagram: {
        parameters: ["pointer", "pointer", "buffer", "usize"],
        result: "void",
        nonblocking: false,
    },

    // DEBUG CODE
	test_proc: {
		parameters: ["pointer"],
		result: "void",
		nonblocking: true,
	},
} as const;

//TODO(hironichu): Make this works from internet path
const options: FetchOptions = {
    name: "ftlt",
	cache: "reloadAll",
    url: "./target/release/",
};


export const LIB = await dlopen(options,symbols);