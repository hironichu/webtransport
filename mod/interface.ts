export const WebTransportOptions = {
    maxTimeout: 10,
    keepAlive: 3,
    validateCertificate: true,
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

export type WebTransportOptions =
    & typeof WebTransportOptions
    & Partial<typeof CertificateOptions>;
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
            "bool", //Certcheck
            "buffer", //Cert
            "usize", //CertLen
            "buffer", //Key
            "usize", //KeyLen
        ],
        result: "pointer",
        callback: true,
    },
    proc_client_connect: {
        parameters: ["pointer", "function", "buffer", "usize"],
        result: "pointer",
        callback: true,
    },
    proc_client_close: {
        parameters: ["pointer", "pointer"],
        result: "void",
        nonblocking: true,
    },
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
    proc_init_datagrams: {
        parameters: ["pointer", "buffer", "usize"],
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
} as const;

//change the type of window so we add Webtransport and WebtransportServer
