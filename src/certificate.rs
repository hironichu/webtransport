use anyhow::Result;
use rcgen::BasicConstraints;
use rcgen::CertificateParams;
use rcgen::DistinguishedName;
use rcgen::DnType;
use rcgen::ExtendedKeyUsagePurpose;
use rcgen::IsCa;
use rcgen::KeyPair;
use rcgen::PKCS_ECDSA_P256_SHA256;

use time::Duration;
use time::OffsetDateTime;

pub struct SelfCertificate {
    /// DER certificate.
    pub certificate: rcgen::Certificate,
}

/// Generates a self-signed certificate for WebTransport connections.
pub fn generate_certificate<S: AsRef<str>>(
    common_name: S,
    start: OffsetDateTime,
    end: OffsetDateTime,
) -> Result<SelfCertificate> {
    let keypair = KeyPair::generate(&PKCS_ECDSA_P256_SHA256)?;

    let mut dname = DistinguishedName::new();
    dname.push(DnType::CommonName, common_name.as_ref());

    let mut cert_params = CertificateParams::new(vec![common_name.as_ref().to_string()]);
    cert_params.distinguished_name = dname;
    cert_params.alg = &PKCS_ECDSA_P256_SHA256;
    cert_params.key_pair = Some(keypair);
    cert_params.not_before = start;
    cert_params.not_after = end;
    cert_params.extended_key_usages = vec![
        ExtendedKeyUsagePurpose::ServerAuth,
        ExtendedKeyUsagePurpose::ClientAuth,
    ];
    cert_params.key_usages = vec![
        rcgen::KeyUsagePurpose::DigitalSignature,
        rcgen::KeyUsagePurpose::KeyCertSign,
    ];
    cert_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);

    let certificate = rcgen::Certificate::from_params(cert_params)?;

    Ok(SelfCertificate { certificate })
}

#[no_mangle]
pub unsafe extern "C" fn proc_gencert(
    domain_buf: *const u8,
    domain_buf_len: usize,
    start: i64,
    end: i64,
    cert_buf: *mut u8,
    cert_buf_len: *mut usize,
    key_buf: *mut u8,
    key_buf_len: *mut usize,
) -> bool {
    let buf = ::std::slice::from_raw_parts(domain_buf, domain_buf_len);
    let domain = String::from_utf8_lossy(buf);
    let start = OffsetDateTime::now_utc()
        .checked_add(Duration::days(start))
        .unwrap();
    let end = OffsetDateTime::now_utc()
        .checked_add(Duration::days(end))
        .unwrap();
    let cert = generate_certificate(domain, start, end).unwrap();
    let certbuffer = cert.certificate.serialize_pem().unwrap();
    let keybuff = cert.certificate.serialize_private_key_pem();

    let cert_len = certbuffer.len();
    let key_len = keybuff.len();

    ::std::slice::from_raw_parts_mut(cert_buf, cert_len).copy_from_slice(certbuffer.as_bytes());
    ::std::slice::from_raw_parts_mut(key_buf, key_len).copy_from_slice(keybuff.as_bytes());
    *cert_buf_len = cert_len;
    *key_buf_len = key_len;
    true
}
