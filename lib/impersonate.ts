/**
 * curl-impersonate support for node-libcurl.
 *
 * Provides browser TLS/HTTP2 fingerprint profiles and helpers to apply them
 * to an Easy handle. Requires node-libcurl to be built against libcurl-impersonate.
 *
 * @see https://github.com/lwthiker/curl-impersonate
 */
import './moduleSetup'

import { Easy } from './Easy'
import { CurlCode } from './enum/CurlCode'
import { CurlHttpVersion } from './enum/CurlHttpVersion'
import { CurlSslVersion, CurlSslVersionMax } from './enum/CurlSslVersion'

// ─── Browser type ────────────────────────────────────────────────────────────

/**
 * Supported browser impersonation targets.
 *
 * Aliases (`'chrome'`, `'firefox'`, `'safari'`, `'safari_ios'`) resolve to the
 * latest available profile of that browser family.
 *
 * @public
 */
export type BrowserType =
  // Chrome
  | 'chrome99'
  | 'chrome100'
  | 'chrome101'
  | 'chrome104'
  | 'chrome107'
  | 'chrome110'
  | 'chrome116'
  | 'chrome119'
  | 'chrome120'
  | 'chrome123'
  | 'chrome124'
  | 'chrome131'
  | 'chrome133a'
  | 'chrome136'
  | 'chrome142'
  | 'chrome145'
  | 'chrome99_android'
  | 'chrome131_android'
  // Edge
  | 'edge99'
  | 'edge101'
  // Firefox
  | 'firefox133'
  | 'firefox135'
  | 'firefox144'
  | 'firefox147'
  // Safari
  | 'safari153'
  | 'safari155'
  | 'safari170'
  | 'safari172_ios'
  | 'safari180'
  | 'safari180_ios'
  | 'safari184'
  | 'safari184_ios'
  | 'safari260'
  | 'safari260_ios'
  | 'safari2601'
  // Tor
  | 'tor145'
  // Aliases
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'safari'
  | 'safari_ios'

// ─── Alias resolution ────────────────────────────────────────────────────────

const ALIAS_MAP: Record<string, string> = {
  chrome: 'chrome145',
  edge: 'edge101',
  firefox: 'firefox147',
  safari: 'safari2601',
  safari_ios: 'safari260_ios',
}

/**
 * Resolve a browser type alias to its canonical target string.
 * @public
 */
export function normalizeBrowserType(type: BrowserType | string): string {
  return ALIAS_MAP[type] ?? type
}

// ─── curl-impersonate option codes ───────────────────────────────────────────
// These are libcurl-impersonate extensions not present in standard libcurl.
// The numeric values must match those in libcurl-impersonate's curl.h.

/** @internal */
const IMPERSONATE_OPTS = {
  SSL_SIG_HASH_ALGS: 'SSL_SIG_HASH_ALGS',
  SSL_ENABLE_ALPS: 'SSL_ENABLE_ALPS',
  SSL_CERT_COMPRESSION: 'SSL_CERT_COMPRESSION',
  SSL_ENABLE_TICKET: 'SSL_ENABLE_TICKET',
  HTTP2_PSEUDO_HEADERS_ORDER: 'HTTP2_PSEUDO_HEADERS_ORDER',
  HTTP2_SETTINGS: 'HTTP2_SETTINGS',
  SSL_PERMUTE_EXTENSIONS: 'SSL_PERMUTE_EXTENSIONS',
  HTTP2_WINDOW_UPDATE: 'HTTP2_WINDOW_UPDATE',
  TLS_GREASE: 'TLS_GREASE',
  TLS_EXTENSION_ORDER: 'TLS_EXTENSION_ORDER',
  STREAM_EXCLUSIVE: 'STREAM_EXCLUSIVE',
  TLS_SIGNED_CERT_TIMESTAMPS: 'TLS_SIGNED_CERT_TIMESTAMPS',
  TLS_STATUS_REQUEST: 'TLS_STATUS_REQUEST',
  TLS_DELEGATED_CREDENTIALS: 'TLS_DELEGATED_CREDENTIALS',
  TLS_RECORD_SIZE_LIMIT: 'TLS_RECORD_SIZE_LIMIT',
  TLS_KEY_SHARES_LIMIT: 'TLS_KEY_SHARES_LIMIT',
  TLS_USE_NEW_ALPS_CODEPOINT: 'TLS_USE_NEW_ALPS_CODEPOINT',
  HTTP2_NO_PRIORITY: 'HTTP2_NO_PRIORITY',
} as const

// ─── Browser profile type ────────────────────────────────────────────────────

interface BrowserProfile {
  /** TLS cipher list (CURLOPT_SSL_CIPHER_LIST) */
  ciphers: string
  /** TLS elliptic curves (CURLOPT_SSL_EC_CURVES) */
  curves: string
  /** Signature hash algorithms - curl-impersonate extension */
  sigHashAlgs?: string
  /** Default HTTP request headers */
  headers: string[]
  /** HTTP/2 SETTINGS frame string - curl-impersonate extension */
  http2Settings: string
  /** HTTP/2 window update value - curl-impersonate extension */
  http2WindowUpdate: number
  /** HTTP/2 stream weight (CURLOPT_STREAM_WEIGHT) */
  http2StreamWeight?: number
  /** HTTP/2 stream exclusive flag - curl-impersonate extension */
  http2StreamExclusive?: number
  /** HTTP/2 pseudo-headers order - curl-impersonate extension */
  http2PseudoHeadersOrder?: string
  /** Disable HTTP/2 stream priority - curl-impersonate extension */
  http2NoPriority?: boolean
  /** Minimum TLS version (CURLOPT_SSLVERSION) */
  tlsMinVersion: number
  /** Enable ALPS extension - curl-impersonate extension */
  alps?: boolean
  /** Use new ALPS codepoint - curl-impersonate extension */
  alpsNewCodepoint?: boolean
  /** Permute TLS extensions order - curl-impersonate extension */
  tlsPermuteExtensions?: boolean
  /** Certificate compression algorithm - curl-impersonate extension */
  certCompression?: string
  /** Enable TLS GREASE - curl-impersonate extension */
  tlsGrease?: boolean
  /** Enable TLS signed certificate timestamps - curl-impersonate extension */
  tlsSignedCertTimestamps?: boolean
  /** Enable TLS status request - curl-impersonate extension */
  tlsStatusRequest?: boolean
  /** Enable ECH (CURLOPT_ECH) */
  ech?: boolean
  /** Disable TLS session ticket - curl-impersonate extension */
  noTlsSessionTicket?: boolean
  /** TLS extension order - curl-impersonate extension */
  tlsExtensionOrder?: string
  /** TLS delegated credentials - curl-impersonate extension */
  tlsDelegatedCredentials?: string
  /** TLS record size limit - curl-impersonate extension */
  tlsRecordSizeLimit?: number
  /** TLS key shares limit - curl-impersonate extension */
  tlsKeySharesLimit?: number
  /**
   * If set, this profile is handled natively by `curl_easy_impersonate()`.
   * This is the target string passed to that function.
   */
  nativeTarget?: string
}

// ─── SSLVERSION helper ───────────────────────────────────────────────────────
const TLS_1_0 = CurlSslVersion.TlsV1_0 | CurlSslVersionMax.Default
const TLS_1_2 = CurlSslVersion.TlsV1_2 | CurlSslVersionMax.Default

// ─── Cipher lists ────────────────────────────────────────────────────────────
const CHROME_CIPHERS =
  'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA:AES256-SHA'

const FIREFOX_CIPHERS =
  'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA'

const SAFARI_CIPHERS =
  'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA:TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA:TLS_RSA_WITH_3DES_EDE_CBC_SHA'

const FIREFOX_SIG_ALGS =
  'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:rsa_pss_rsae_sha256:rsa_pss_rsae_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha256:rsa_pkcs1_sha384:rsa_pkcs1_sha512:ecdsa_sha1:rsa_pkcs1_sha1'

const SAFARI_SIG_ALGS =
  'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512:rsa_pkcs1_sha1'

// ─── Chrome shared settings ───────────────────────────────────────────────────
const CHROME_HTTP2_SETTINGS = '1:65536;2:0;4:6291456;6:262144'
const CHROME_HTTP2_WINDOW_UPDATE = 15663105

// ─── Browser profiles ────────────────────────────────────────────────────────

const BROWSER_PROFILES: Record<string, BrowserProfile> = {
  // ── Chrome 99 ──────────────────────────────────────────────────────────────
  chrome99: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="99", "Google Chrome";v="99"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "Windows"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: '1:65536;3:1000;4:6291456;6:262144',
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  // ── Chrome 100 ─────────────────────────────────────────────────────────────
  chrome100: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "Windows"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: '1:65536;3:1000;4:6291456;6:262144',
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  // ── Chrome 101 ─────────────────────────────────────────────────────────────
  chrome101: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "Windows"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: '1:65536;3:1000;4:6291456;6:262144',
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  // ── Chrome 104 ─────────────────────────────────────────────────────────────
  chrome104: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.81 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  // ── Chrome 107-116 share same profile ─────────────────────────────────────
  chrome107: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.107 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  chrome110: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.177 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  chrome116: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.180 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  // ── Chrome 119 ─────────────────────────────────────────────────────────────
  chrome119: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 120 ─────────────────────────────────────────────────────────────
  chrome120: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 123 ─────────────────────────────────────────────────────────────
  chrome123: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Accept-Language: en-US,en;q=0.9',
      'Priority: u=0, i',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 124 ─────────────────────────────────────────────────────────────
  chrome124: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519Kyber768Draft00:X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Accept-Language: en-US,en;q=0.9',
      'Priority: u=0, i',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 131 ─────────────────────────────────────────────────────────────
  chrome131: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Accept-Language: en-US,en;q=0.9',
      'Priority: u=0, i',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 133a ────────────────────────────────────────────────────────────
  chrome133a: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Accept-Language: en-US,en;q=0.9',
      'Priority: u=0, i',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    alpsNewCodepoint: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 136 ─────────────────────────────────────────────────────────────
  chrome136: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "macOS"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Accept-Language: en-US,en;q=0.9',
      'Priority: u=0, i',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    alpsNewCodepoint: true,
    tlsPermuteExtensions: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Chrome 142/145 - native impersonate ────────────────────────────────────
  chrome142: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    headers: [],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    tlsMinVersion: TLS_1_2,
    nativeTarget: 'chrome142',
  },

  chrome145: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    headers: [],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    tlsMinVersion: TLS_1_2,
    nativeTarget: 'chrome145',
  },

  // ── Chrome Android ─────────────────────────────────────────────────────────
  chrome99_android: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: "Google Chrome";v="99", "Chromium";v="99", " Not A;Brand";v="99"',
      'sec-ch-ua-mobile: ?1',
      'sec-ch-ua-platform: "Android"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.73 Mobile Safari/537.36',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: '1:65536;3:1000;4:6291456;6:262144',
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  chrome131_android: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384',
    headers: [],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    tlsMinVersion: TLS_1_2,
    nativeTarget: 'chrome131_android',
  },

  // ── Edge 99 / 101 ──────────────────────────────────────────────────────────
  edge99: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="99", "Microsoft Edge";v="99"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "Windows"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.30',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: '1:65536;3:1000;4:6291456;6:262144',
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  edge101: {
    ciphers: CHROME_CIPHERS,
    curves: 'X25519:P-256:P-384',
    headers: [
      'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="101", "Microsoft Edge";v="101"',
      'sec-ch-ua-mobile: ?0',
      'sec-ch-ua-platform: "Windows"',
      'Upgrade-Insecure-Requests: 1',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.47',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-User: ?1',
      'Sec-Fetch-Dest: document',
      'Accept-Encoding: gzip, deflate, br',
      'Accept-Language: en-US,en;q=0.9',
    ],
    http2Settings: CHROME_HTTP2_SETTINGS,
    http2WindowUpdate: CHROME_HTTP2_WINDOW_UPDATE,
    http2StreamWeight: 256,
    http2StreamExclusive: 1,
    tlsMinVersion: TLS_1_2,
    alps: true,
    certCompression: 'brotli',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  // ── Firefox 133 ────────────────────────────────────────────────────────────
  firefox133: {
    ciphers: FIREFOX_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521:ffdhe2048:ffdhe3072',
    sigHashAlgs: FIREFOX_SIG_ALGS,
    headers: [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language: en-US,en;q=0.5',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Upgrade-Insecure-Requests: 1',
      'Sec-Fetch-Dest: document',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-User: ?1',
      'Priority: u=0, i',
      'TE: trailers',
    ],
    http2Settings: '1:65536;2:0;4:131072;5:16384',
    http2PseudoHeadersOrder: 'mpas',
    http2WindowUpdate: 12517377,
    http2StreamWeight: 42,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_2,
    tlsExtensionOrder: '0-23-65281-10-11-35-16-5-34-51-43-13-45-28-27-65037',
    tlsDelegatedCredentials:
      'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:ecdsa_sha1',
    tlsRecordSizeLimit: 4001,
    tlsKeySharesLimit: 3,
    certCompression: 'zlib,brotli,zstd',
    ech: true,
  },

  // ── Firefox 135 ────────────────────────────────────────────────────────────
  firefox135: {
    ciphers: FIREFOX_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521:ffdhe2048:ffdhe3072',
    sigHashAlgs: FIREFOX_SIG_ALGS,
    headers: [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language: en-US,en;q=0.5',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Upgrade-Insecure-Requests: 1',
      'Sec-Fetch-Dest: document',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-User: ?1',
      'Priority: u=0, i',
      'TE: trailers',
    ],
    http2Settings: '1:65536;2:0;4:131072;5:16384',
    http2PseudoHeadersOrder: 'mpas',
    http2WindowUpdate: 12517377,
    http2StreamWeight: 42,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_2,
    tlsExtensionOrder: '0-23-65281-10-11-35-16-5-34-18-51-43-13-45-28-27-65037',
    tlsDelegatedCredentials:
      'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:ecdsa_sha1',
    tlsRecordSizeLimit: 4001,
    tlsKeySharesLimit: 3,
    certCompression: 'zlib,brotli,zstd',
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Firefox 144 ────────────────────────────────────────────────────────────
  firefox144: {
    ciphers: FIREFOX_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521:ffdhe2048:ffdhe3072',
    sigHashAlgs: FIREFOX_SIG_ALGS,
    headers: [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language: en-US,en;q=0.5',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Upgrade-Insecure-Requests: 1',
      'Sec-Fetch-Dest: document',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-User: ?1',
      'Priority: u=0, i',
      'TE: trailers',
    ],
    http2Settings: '1:65536;2:0;4:131072;5:16384',
    http2PseudoHeadersOrder: 'mpas',
    http2WindowUpdate: 12517377,
    http2StreamWeight: 42,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_2,
    tlsExtensionOrder: '0-23-65281-10-11-35-16-5-34-18-51-43-13-45-28-27-65037',
    tlsDelegatedCredentials:
      'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:ecdsa_sha1',
    tlsRecordSizeLimit: 4001,
    tlsKeySharesLimit: 3,
    certCompression: 'zlib,brotli,zstd',
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Firefox 147 - native impersonate ───────────────────────────────────────
  firefox147: {
    ciphers: FIREFOX_CIPHERS,
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521:ffdhe2048:ffdhe3072',
    headers: [],
    http2Settings: '1:65536;2:0;4:131072;5:16384',
    http2WindowUpdate: 12517377,
    tlsMinVersion: TLS_1_2,
    nativeTarget: 'firefox147',
  },

  // ── Tor 145 ────────────────────────────────────────────────────────────────
  tor145: {
    ciphers:
      'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA',
    curves: 'X25519:P-256:P-384:P-521:ffdhe2048:ffdhe3072',
    sigHashAlgs: FIREFOX_SIG_ALGS,
    headers: [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language: en-US,en;q=0.5',
      'Accept-Encoding: gzip, deflate, br, zstd',
      'Sec-GPC: 1',
      'Upgrade-Insecure-Requests: 1',
      'Sec-Fetch-Dest: document',
      'Sec-Fetch-Mode: navigate',
      'Sec-Fetch-Site: none',
      'Sec-Fetch-User: ?1',
      'Priority: u=0, i',
      'TE: trailers',
    ],
    http2Settings: '1:65536;2:0;4:131072;5:16384',
    http2PseudoHeadersOrder: 'mpas',
    http2WindowUpdate: 12517377,
    http2StreamWeight: 42,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_2,
    tlsExtensionOrder: '0-23-65281-10-11-16-5-34-51-43-13-28-65037',
    tlsDelegatedCredentials:
      'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:ecdsa_sha1',
    tlsRecordSizeLimit: 16385,
    tlsKeySharesLimit: 2,
    certCompression: 'zlib,brotli,zstd',
    tlsSignedCertTimestamps: true,
    ech: true,
  },

  // ── Safari 15.3 / 15.5 ────────────────────────────────────────────────────
  safari153: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;8:1;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  safari155: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;8:1;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  // ── Safari 17.0 ────────────────────────────────────────────────────────────
  safari170: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  safari172_ios: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  // ── Safari 18.0 ────────────────────────────────────────────────────────────
  safari180: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'priority: u=0, i',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;8:1;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  safari180_ios: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'priority: u=0, i',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  // ── Safari 18.4 ────────────────────────────────────────────────────────────
  safari184: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'priority: u=0, i',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  safari184_ios: {
    ciphers: SAFARI_CIPHERS,
    curves: 'X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'priority: u=0, i',
      'accept-encoding: gzip, deflate, br',
    ],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2StreamWeight: 256,
    http2StreamExclusive: 0,
    tlsMinVersion: TLS_1_0,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
    noTlsSessionTicket: true,
  },

  // ── Safari 26.0 ────────────────────────────────────────────────────────────
  safari260: {
    ciphers:
      'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA:TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA:TLS_RSA_WITH_3DES_EDE_CBC_SHA',
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [
      'sec-fetch-dest: document',
      'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
      'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'sec-fetch-site: none',
      'sec-fetch-mode: navigate',
      'accept-language: en-US,en;q=0.9',
      'priority: u=0, i',
      'accept-encoding: gzip, deflate, br, zstd',
    ],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2PseudoHeadersOrder: 'msap',
    http2WindowUpdate: 10420225,
    http2NoPriority: true,
    tlsMinVersion: TLS_1_2,
    certCompression: 'zlib',
    tlsGrease: true,
    tlsSignedCertTimestamps: true,
  },

  safari260_ios: {
    ciphers:
      'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA:TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA:TLS_RSA_WITH_3DES_EDE_CBC_SHA',
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521',
    sigHashAlgs: SAFARI_SIG_ALGS,
    headers: [],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2WindowUpdate: 10420225,
    tlsMinVersion: TLS_1_2,
    nativeTarget: 'safari260_ios',
  },

  // ── Safari 26.0.1 - native impersonate ─────────────────────────────────────
  safari2601: {
    ciphers:
      'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA:TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA:TLS_RSA_WITH_3DES_EDE_CBC_SHA',
    curves: 'X25519MLKEM768:X25519:P-256:P-384:P-521',
    headers: [],
    http2Settings: '2:0;3:100;4:2097152;9:1',
    http2WindowUpdate: 10420225,
    tlsMinVersion: TLS_1_2,
    nativeTarget: 'safari2601',
  },
}

// ─── Apply impersonate ────────────────────────────────────────────────────────

/**
 * Apply a browser impersonation profile to an Easy handle by setting all
 * relevant curl options (TLS fingerprint, HTTP/2 settings, and default headers).
 *
 * This is a **pure TypeScript** implementation - it does not call
 * `curl_easy_impersonate()`. It works with any libcurl build but only applies
 * the curl-impersonate-specific options when they are registered (i.e. when
 * node-libcurl is built against libcurl-impersonate).
 *
 * @param easy - The Easy handle to configure
 * @param target - Browser target (e.g. `'chrome131'`, `'firefox135'`)
 * @param defaultHeaders - Whether to set the browser's default HTTP headers (default: `true`)
 * @throws `Error` if the browser target is not recognized
 *
 * @example
 * ```typescript
 * import { Easy } from 'node-libcurl'
 * import { applyImpersonateOptions } from 'node-libcurl/lib/impersonate'
 *
 * const easy = new Easy()
 * applyImpersonateOptions(easy, 'chrome131')
 * easy.setOpt('URL', 'https://tls.peet.ws/api/all')
 * easy.perform()
 * ```
 *
 * @public
 */
export function applyImpersonateOptions(
  easy: Easy,
  target: BrowserType | string,
  defaultHeaders = true,
): void {
  const resolved = normalizeBrowserType(target)
  const profile = BROWSER_PROFILES[resolved]

  if (!profile) {
    throw new Error(
      `Unknown browser impersonation target: "${target}". ` +
        `Supported targets: ${Object.keys(BROWSER_PROFILES).join(', ')}`,
    )
  }

  const s = easy.setOpt.bind(easy) as (opt: string, val: unknown) => CurlCode

  // TLS
  s('SSL_CIPHER_LIST', profile.ciphers)
  s('SSL_EC_CURVES', profile.curves)
  s('SSLVERSION', profile.tlsMinVersion)

  if (profile.sigHashAlgs) {
    s(IMPERSONATE_OPTS.SSL_SIG_HASH_ALGS, profile.sigHashAlgs)
  }
  if (profile.tlsGrease) {
    s(IMPERSONATE_OPTS.TLS_GREASE, 1)
  }
  if (profile.alps) {
    s(IMPERSONATE_OPTS.SSL_ENABLE_ALPS, 1)
  }
  if (profile.alpsNewCodepoint) {
    s(IMPERSONATE_OPTS.TLS_USE_NEW_ALPS_CODEPOINT, 1)
  }
  if (profile.tlsPermuteExtensions) {
    s(IMPERSONATE_OPTS.SSL_PERMUTE_EXTENSIONS, 1)
  }
  if (profile.certCompression) {
    s(IMPERSONATE_OPTS.SSL_CERT_COMPRESSION, profile.certCompression)
  }
  if (profile.tlsSignedCertTimestamps) {
    s(IMPERSONATE_OPTS.TLS_SIGNED_CERT_TIMESTAMPS, 1)
  }
  if (profile.tlsStatusRequest) {
    s(IMPERSONATE_OPTS.TLS_STATUS_REQUEST, 1)
  }
  if (profile.noTlsSessionTicket) {
    s(IMPERSONATE_OPTS.SSL_ENABLE_TICKET, 0)
  }
  if (profile.tlsExtensionOrder) {
    s(IMPERSONATE_OPTS.TLS_EXTENSION_ORDER, profile.tlsExtensionOrder)
  }
  if (profile.tlsDelegatedCredentials) {
    s(IMPERSONATE_OPTS.TLS_DELEGATED_CREDENTIALS, profile.tlsDelegatedCredentials)
  }
  if (profile.tlsRecordSizeLimit != null) {
    s(IMPERSONATE_OPTS.TLS_RECORD_SIZE_LIMIT, profile.tlsRecordSizeLimit)
  }
  if (profile.tlsKeySharesLimit != null) {
    s(IMPERSONATE_OPTS.TLS_KEY_SHARES_LIMIT, profile.tlsKeySharesLimit)
  }
  if (profile.ech) {
    s('ECH', 'grease')
  }

  // HTTP/2
  s('HTTP_VERSION', CurlHttpVersion.V2Tls)
  s(IMPERSONATE_OPTS.HTTP2_SETTINGS, profile.http2Settings)
  s(IMPERSONATE_OPTS.HTTP2_WINDOW_UPDATE, profile.http2WindowUpdate)

  if (profile.http2PseudoHeadersOrder) {
    s(IMPERSONATE_OPTS.HTTP2_PSEUDO_HEADERS_ORDER, profile.http2PseudoHeadersOrder)
  }
  if (profile.http2StreamWeight != null) {
    s('STREAM_WEIGHT', profile.http2StreamWeight)
  }
  if (profile.http2StreamExclusive != null) {
    s(IMPERSONATE_OPTS.STREAM_EXCLUSIVE, profile.http2StreamExclusive)
  }
  if (profile.http2NoPriority) {
    s(IMPERSONATE_OPTS.HTTP2_NO_PRIORITY, 1)
  }

  // Accept-Encoding (--compressed)
  s('ACCEPT_ENCODING', '')

  // Headers
  if (defaultHeaders && profile.headers.length > 0) {
    s('HTTPHEADER', profile.headers)
  }
}

/**
 * Impersonate a browser on an Easy handle, preferring the native
 * `curl_easy_impersonate()` API when available.
 *
 * If the Easy handle's `impersonate()` method returns a non-zero code
 * (e.g. because libcurl-impersonate is not installed), this function
 * falls back to {@link applyImpersonateOptions}.
 *
 * @param easy - The Easy handle to configure
 * @param target - Browser target (e.g. `'chrome131'`, `'firefox135'`)
 * @param defaultHeaders - Whether to set browser default headers (default: `true`)
 *
 * @public
 */
export function impersonate(
  easy: Easy,
  target: BrowserType | string,
  defaultHeaders = true,
): void {
  const resolved = normalizeBrowserType(target)

  // Try native impersonation first
  const ret = easy.impersonate(resolved, defaultHeaders)
  if (ret === CurlCode.CURLE_OK) {
    return
  }

  // Fall back to manual option setting
  applyImpersonateOptions(easy, resolved, defaultHeaders)
}

/**
 * Returns all registered browser profile targets.
 * @public
 */
export function getSupportedTargets(): string[] {
  return Object.keys(BROWSER_PROFILES)
}
