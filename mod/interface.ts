export const WebTransportOptions = {
    maxTimeout: 10,
    keepAlive: 3,
};

export const CertificateOptions = {
    certFile: "",
    keyFile: "",
};

export const CertificateGenParams = {
    domain: Deno.hostname(),
    notBefore: 0,
    notAfter: 10,
};
type CertificateOptions =
    & typeof CertificateOptions
    & typeof CertificateGenParams;

export const WebTransportServerOptions = {
    maxTimeout: 10,
    keepAlive: 3,
};
export type WebTransportServerOptions =
    & typeof WebTransportServerOptions
    & Partial<CertificateOptions>;

export type WebTransportOptions = typeof WebTransportOptions;
export const symbols = {
    // Server symbols
    proc_server_init: {
        parameters: [
            "function", //Callback
            "u16", //Port
            "bool", //Migration
            "u64", //KeepAlive
            "u64", //MaxTimeout
            "buffer", //Cert
            "usize", //CertLen
            "buffer", //Key
            "usize", //KeyLen
        ],
        result: "pointer",
        callback: true,
    },
    proc_server_listen: {
        parameters: ["pointer", "function"],
        result: "pointer",
        callback: true,
    },
    proc_server_close: {
        parameters: ["pointer"],
        result: "usize",
        nonblocking: true,
    },
    // Client symbols
    proc_client_init: {
        parameters: [
            "function",
            "u64", //KeepAlive
            "u64", //MaxTimeout
        ],
        result: "pointer",
        callback: true,
    },
    proc_client_connect: {
        parameters: ["pointer", "function", "buffer", "usize"],
        result: "void",
        callback: true,
    },
    proc_client_close: {
        parameters: ["pointer", "pointer"],
        result: "void",
        nonblocking: true,
    },
    // Shared symbols
    proc_recv_datagram: {
        parameters: ["pointer", "buffer"],
        result: "usize",
        nonblocking: true,
    },
    proc_send_datagram: {
        parameters: ["pointer", "buffer", "usize"],
        result: "void",
        nonblocking: false,
    },
    proc_accept_bi: {
        parameters: ["pointer"], //Option<>
        result: "pointer",
        nonblocking: true,
    },
    proc_open_bi: {
        parameters: ["pointer"], //Option<>
        result: "pointer",
        nonblocking: true,
    },

    proc_accept_uni: {
        parameters: ["pointer"],
        result: "pointer",
        nonblocking: true,
    },
    proc_open_uni: {
        parameters: ["pointer"],
        result: "pointer",
        nonblocking: true,
    },

    proc_read: {
        parameters: ["pointer", "buffer", "u32"],
        result: "usize",
        nonblocking: true,
    },
    proc_write: {
        parameters: ["pointer", "buffer", "u32"],
        result: "usize",
        nonblocking: true,
    },
    proc_write_all: {
        parameters: ["pointer", "buffer", "u32"],
        result: "usize",
        nonblocking: true,
    },
    proc_recvstream_id: {
        parameters: ["pointer"],
        result: "u64",
    },
    proc_sendstream_id: {
        parameters: ["pointer"],
        result: "u64",
    },
    proc_sendstream_priority: {
        parameters: ["pointer"],
        result: "u64",
    },
    proc_sendstream_set_priority: {
        parameters: ["pointer", "u64"],
        result: "u64",
    },
    proc_sendstream_finish: {
        parameters: ["pointer"],
        result: "void",
        nonblocking: true,
    },
    proc_recvtream_stop: {
        parameters: ["pointer"],
        result: "void",
        nonblocking: true,
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
    free_server: {
        parameters: ["pointer"],
        result: "void",
    },
    free_conn: {
        parameters: ["pointer"],
        result: "void",
    },
    free_all_client: {
        parameters: ["pointer", "pointer"],
        result: "void",
    },
    free_client: {
        parameters: ["pointer"],
        result: "void",
    },
} as const;
