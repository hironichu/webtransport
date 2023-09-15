import { FetchOptions, dlopen } from "./deps.ts";

const symbols = {
    proc_init: {
        parameters: ["u16", "function"],
        result: "pointer",
        callback: true,
    },
    proc_listen: {
        parameters: ["pointer"],
        result: "pointer",
        nonblocking: true,
    },
    proc_newconn: {
        parameters: ["pointer"],
        result: "pointer",
        nonblocking: true,
    },
	proc_init_client_streams: {
		parameters: ["pointer", "pointer", "buffer"],
		result: "void",
		nonblocking: true,
	},
	proc_recv_datagram: {
		parameters: ["pointer", "pointer", "buffer"],
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
    url: "./target/release/",
};


export const LIB = await dlopen(options,symbols);