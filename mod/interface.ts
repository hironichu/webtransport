import WebTransport from "./client.ts";
import { WebTransportServer } from "./server.ts";

export const WebTransportOptions = {
    maxTimeout: 10,
    keepAlive: 3,
} as const;
export const WebTransportServerOptions = {
    maxTimeout: 10,
    keepAlive: 3,
} as const;

export const symbols = {
    // Server symbols
    proc_server_init: {
        parameters: [
            "function",
            "u16",
            "bool",
            "u64",
            "u64",
            "buffer",
            "usize",
            "buffer",
            "usize",
        ],
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
    // Client symbols
    // Shared symbols
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
    // Crypto symbols
    proc_gencert: {
        parameters: [
            "buffer",
            "usize",
            "i64",
            "i64",
            "buffer",
            "buffer",
            "buffer",
            "buffer",
        ],
        result: "bool",
    },
} as const;

//change the type of window so we add Webtransport and WebtransportServer
