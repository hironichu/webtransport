export const C_TYPES = {
    "PROC_OK": 0,
    "PROC_ERR": 1,
    "PROC_CONN_CLOSED": 2,
    "PROC_CONN_TIMEOUT": 3,
    "PROC_CONN_H3_ERROR": 4,
    "PROC_CONN_QUIC_ERROR": 5,
    "PROC_CONN_CLOSED_BY_APP": 6,
    "PROC_CONN_CLOSED_LOCALLY": 7,
    "PROC_CONN_TIMEDOUT": 8,
} as const;
export type C_TYPES = typeof C_TYPES[keyof typeof C_TYPES];
//make so i can get the KEY from the VALUE of C_TYPES
const C_TYPES_KEYS = Object.keys(C_TYPES) as (keyof typeof C_TYPES)[];

export const FFI_CODES = {
    0: {
        type: C_TYPES.PROC_OK,
        name: C_TYPES_KEYS[C_TYPES.PROC_OK],
        desc: "Success",
    },
    1: {
        type: C_TYPES.PROC_ERR,
        name: C_TYPES_KEYS[C_TYPES.PROC_ERR],
        desc: "Generic error",
    },
    2: {
        type: C_TYPES.PROC_CONN_CLOSED,
        name: C_TYPES_KEYS[C_TYPES.PROC_CONN_CLOSED],
        desc: "Connection closed by peer",
    },
    3: {
        type: C_TYPES.PROC_CONN_TIMEOUT,
        name: C_TYPES_KEYS[C_TYPES.PROC_CONN_TIMEOUT],
        desc: "Connection timed out",
    },
    4: {
        type: C_TYPES.PROC_CONN_H3_ERROR,
        name: C_TYPES_KEYS[C_TYPES.PROC_CONN_H3_ERROR],
        desc: "Connection closed by peer due to H3 error",
    },
    5: {
        type: C_TYPES.PROC_CONN_QUIC_ERROR,
        name: C_TYPES_KEYS[C_TYPES.PROC_CONN_QUIC_ERROR],
        desc: "Connection closed by peer due to QUIC error",
    },
    6: {
        type: C_TYPES.PROC_CONN_CLOSED_BY_APP,
        name: C_TYPES_KEYS[C_TYPES.PROC_CONN_CLOSED_BY_APP],
        desc: "Connection closed by application",
    },
    7: {
        type: C_TYPES.PROC_CONN_CLOSED_LOCALLY,
        name: C_TYPES_KEYS[C_TYPES.PROC_CONN_CLOSED_LOCALLY],
        desc: "Connection closed locally",
    },
} as const;

export type FFI_CODES = typeof FFI_CODES[keyof typeof FFI_CODES];
