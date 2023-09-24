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
