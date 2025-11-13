#ifndef NOMINMAX
#define NOMINMAX
#include <cassert>
#endif

#include "Multi.h"
#include "napi.h"
/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#include "Curl.h"
#include "CurlError.h"
#include "CurlHttpPost.h"
#include "CurlMime.h"
#include "CurlVersionInfo.h"
#include "Easy.h"
#include "Http2PushFrameHeaders.h"
#include "Share.h"
#include "curl/curl.h"
#include "macros.h"

#include <algorithm>
#include <iostream>
#include <mutex>
#include <sstream>
#include <thread>
namespace NodeLibcurl {

// Values from a Win64 build
std::unordered_map<CurlHandleType, int> handleMemoryMap = {{CURL_HANDLE_TYPE_EASY, 30000},
                                                           {CURL_HANDLE_TYPE_MULTI, 60000},
                                                           {CURL_HANDLE_TYPE_SHARE, 60000}};

// Optimized hash map lookups for curl constants with category information
// Note: Stores vectors to handle duplicate names (e.g., CERTINFO as both option and info)
std::unordered_map<std::string, std::vector<CurlConstantLookup>> curlConstantsByName;
std::unordered_map<int64_t, std::vector<CurlConstantLookup>> curlConstantsByValue;

const std::vector<CurlConstant> curlOptionBlob = {
#if NODE_LIBCURL_VER_GE(7, 77, 0)
    {"CAINFO_BLOB", CURLOPT_CAINFO_BLOB},
#endif

#if NODE_LIBCURL_VER_GE(7, 71, 0)
    {"ISSUERCERT_BLOB", CURLOPT_ISSUERCERT_BLOB},

#if NODE_LIBCURL_VER_GE(7, 77, 0)
    {"PROXY_CAINFO_BLOB", CURLOPT_PROXY_CAINFO_BLOB},
#endif

    {"PROXY_SSLCERT_BLOB", CURLOPT_PROXY_SSLCERT_BLOB},
    {"PROXY_SSLKEY_BLOB", CURLOPT_PROXY_SSLKEY_BLOB},
    {"SSLCERT_BLOB", CURLOPT_SSLCERT_BLOB},
    {"SSLKEY_BLOB", CURLOPT_SSLKEY_BLOB},
#endif
};

const std::vector<CurlConstant> curlOptionFunction = {
    {"CHUNK_BGN_FUNCTION", CURLOPT_CHUNK_BGN_FUNCTION},
    {"CHUNK_END_FUNCTION", CURLOPT_CHUNK_END_FUNCTION},
    {"FNMATCH_FUNCTION", CURLOPT_FNMATCH_FUNCTION},
    {"DEBUGFUNCTION", CURLOPT_DEBUGFUNCTION},
    {"HEADERFUNCTION", CURLOPT_HEADERFUNCTION},

#if NODE_LIBCURL_VER_GE(7, 74, 0)
    {"HSTSREADFUNCTION", CURLOPT_HSTSREADFUNCTION},
    {"HSTSWRITEFUNCTION", CURLOPT_HSTSWRITEFUNCTION},
#endif

#if NODE_LIBCURL_VER_GE(7, 80, 0)
    {"PREREQFUNCTION", CURLOPT_PREREQFUNCTION},
#endif

    {"PROGRESSFUNCTION", CURLOPT_PROGRESSFUNCTION},
    {"READFUNCTION", CURLOPT_READFUNCTION},
    {"SEEKFUNCTION", CURLOPT_SEEKFUNCTION},

#if NODE_LIBCURL_VER_GE(7, 64, 0)
    {"TRAILERFUNCTION", CURLOPT_TRAILERFUNCTION},
#endif

#if NODE_LIBCURL_VER_GE(7, 32, 0)
    {"XFERINFOFUNCTION", CURLOPT_XFERINFOFUNCTION},
#endif

    {"WRITEFUNCTION", CURLOPT_WRITEFUNCTION},
};

const std::vector<CurlConstant> curlOptionHttpPost = {
    {"NAME", CurlHttpPost::NAME},         {"FILE", CurlHttpPost::FILE},
    {"CONTENTS", CurlHttpPost::CONTENTS}, {"TYPE", CurlHttpPost::TYPE},
    {"FILENAME", CurlHttpPost::FILENAME},
};

const std::vector<CurlConstant> curlOptionInteger = {
    {"ACCEPTTIMEOUT_MS", CURLOPT_ACCEPTTIMEOUT_MS},
    {"ADDRESS_SCOPE", CURLOPT_ADDRESS_SCOPE},
    {"APPEND", CURLOPT_APPEND},
    {"AUTOREFERER", CURLOPT_AUTOREFERER},
    {"BUFFERSIZE", CURLOPT_BUFFERSIZE},

#if NODE_LIBCURL_VER_GE(7, 87, 0)
    {"CA_CACHE_TIMEOUT", CURLOPT_CA_CACHE_TIMEOUT},
#endif

    {"CERTINFO", CURLOPT_CERTINFO},
    {"CONNECTTIMEOUT", CURLOPT_CONNECTTIMEOUT},
    {"CONNECTTIMEOUT_MS", CURLOPT_CONNECTTIMEOUT_MS},
    {"CONNECT_ONLY", CURLOPT_CONNECT_ONLY},
    {"COOKIESESSION", CURLOPT_COOKIESESSION},
    {"CRLF", CURLOPT_CRLF},
    {"DIRLISTONLY", CURLOPT_DIRLISTONLY},

#if NODE_LIBCURL_VER_GE(7, 60, 0)
    {"DISALLOW_USERNAME_IN_URL", CURLOPT_DISALLOW_USERNAME_IN_URL},
#endif

    {"DNS_CACHE_TIMEOUT", CURLOPT_DNS_CACHE_TIMEOUT},

#if NODE_LIBCURL_VER_GE(7, 60, 0)
    {"DNS_SHUFFLE_ADDRESSES", CURLOPT_DNS_SHUFFLE_ADDRESSES},
#endif
    // Disabled since libcurl 7.62
    {"DNS_USE_GLOBAL_CACHE", CURLOPT_DNS_USE_GLOBAL_CACHE},

#if NODE_LIBCURL_VER_GE(7, 76, 0)
    {"DOH_SSL_VERIFYHOST", CURLOPT_DOH_SSL_VERIFYHOST},
    {"DOH_SSL_VERIFYPEER", CURLOPT_DOH_SSL_VERIFYPEER},
    {"DOH_SSL_VERIFYSTATUS", CURLOPT_DOH_SSL_VERIFYSTATUS},
#endif

#if NODE_LIBCURL_VER_GE(7, 36, 0)
    {"EXPECT_100_TIMEOUT_MS", CURLOPT_EXPECT_100_TIMEOUT_MS},
#endif

    {"FAILONERROR", CURLOPT_FAILONERROR},
    {"FILETIME", CURLOPT_FILETIME},
    {"FOLLOWLOCATION", CURLOPT_FOLLOWLOCATION},
    {"FORBID_REUSE", CURLOPT_FORBID_REUSE},
    {"FRESH_CONNECT", CURLOPT_FRESH_CONNECT},
    {"FTP_CREATE_MISSING_DIRS", CURLOPT_FTP_CREATE_MISSING_DIRS},
    {"FTP_FILEMETHOD", CURLOPT_FTP_FILEMETHOD},
    {"FTP_RESPONSE_TIMEOUT", CURLOPT_FTP_RESPONSE_TIMEOUT},
    {"FTP_SKIP_PASV_IP", CURLOPT_FTP_SKIP_PASV_IP},
    {"FTP_USE_EPRT", CURLOPT_FTP_USE_EPRT},
    {"FTP_USE_EPSV", CURLOPT_FTP_USE_EPSV},
    {"FTP_USE_PRET", CURLOPT_FTP_USE_PRET},
    {"GSSAPI_DELEGATION", CURLOPT_GSSAPI_DELEGATION},

#if NODE_LIBCURL_VER_GE(7, 59, 0)
    {"HAPPY_EYEBALLS_TIMEOUT_MS", CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS},
#endif

#if NODE_LIBCURL_VER_GE(7, 60, 0)
    {"HAPROXYPROTOCOL", CURLOPT_HAPROXYPROTOCOL},
#endif

    {"HEADER", CURLOPT_HEADER},

#if NODE_LIBCURL_VER_GE(7, 37, 0)
    {"HEADEROPT", CURLOPT_HEADEROPT},
#endif

#if NODE_LIBCURL_VER_GE(7, 74, 0)
    {"HSTS_CTRL", CURLOPT_HSTS_CTRL},
#endif

#if NODE_LIBCURL_VER_GE(7, 64, 0)
    {"HTTP09_ALLOWED", CURLOPT_HTTP09_ALLOWED},
#endif

    {"HTTPAUTH", CURLOPT_HTTPAUTH},
    {"HTTPGET", CURLOPT_HTTPGET},
    {"HTTPPROXYTUNNEL", CURLOPT_HTTPPROXYTUNNEL},
    {"HTTP_CONTENT_DECODING", CURLOPT_HTTP_CONTENT_DECODING},
    {"HTTP_TRANSFER_DECODING", CURLOPT_HTTP_TRANSFER_DECODING},
    {"HTTP_VERSION", CURLOPT_HTTP_VERSION},
    {"IGNORE_CONTENT_LENGTH", CURLOPT_IGNORE_CONTENT_LENGTH},
    {"INFILESIZE", CURLOPT_INFILESIZE},
    {"IPRESOLVE", CURLOPT_IPRESOLVE},

#if NODE_LIBCURL_VER_GE(7, 51, 0)
    {"KEEP_SENDING_ON_ERROR", CURLOPT_KEEP_SENDING_ON_ERROR},
#endif

    {"LOCALPORT", CURLOPT_LOCALPORT},
    {"LOCALPORTRANGE", CURLOPT_LOCALPORTRANGE},
    {"LOW_SPEED_LIMIT", CURLOPT_LOW_SPEED_LIMIT},
    {"LOW_SPEED_TIME", CURLOPT_LOW_SPEED_TIME},

#if NODE_LIBCURL_VER_GE(7, 69, 0)
    {"MAIL_RCPT_ALLLOWFAILS", CURLOPT_MAIL_RCPT_ALLLOWFAILS},
#endif
#if NODE_LIBCURL_VER_GE(8, 2, 0)
    {"MAIL_RCPT_ALLOWFAILS", CURLOPT_MAIL_RCPT_ALLOWFAILS},
#endif

#if NODE_LIBCURL_VER_GE(7, 65, 0)
    {"MAXAGE_CONN", CURLOPT_MAXAGE_CONN},
#endif

    {"MAXCONNECTS", CURLOPT_MAXCONNECTS},
    {"MAXFILESIZE", CURLOPT_MAXFILESIZE},

#if NODE_LIBCURL_VER_GE(7, 80, 0)
    {"MAXLIFETIME_CONN", CURLOPT_MAXLIFETIME_CONN},
#endif

    {"MAXREDIRS", CURLOPT_MAXREDIRS},
    {"NETRC", CURLOPT_NETRC},
    {"NEW_DIRECTORY_PERMS", CURLOPT_NEW_DIRECTORY_PERMS},
    {"NEW_FILE_PERMS", CURLOPT_NEW_FILE_PERMS},
    {"NOBODY", CURLOPT_NOBODY},
    {"NOPROGRESS", CURLOPT_NOPROGRESS},
    {"NOSIGNAL", CURLOPT_NOSIGNAL},

#if NODE_LIBCURL_VER_GE(7, 42, 0)
    {"PATH_AS_IS", CURLOPT_PATH_AS_IS},
#endif

#if NODE_LIBCURL_VER_GE(7, 43, 0)
    {"PIPEWAIT", CURLOPT_PIPEWAIT},
#endif

    {"PORT", CURLOPT_PORT},
    {"POST", CURLOPT_POST},
    {"POSTFIELDSIZE", CURLOPT_POSTFIELDSIZE},
    {"POSTREDIR", CURLOPT_POSTREDIR},
    {"PROTOCOLS", CURLOPT_PROTOCOLS},
    {"PROXY_TRANSFER_MODE", CURLOPT_PROXY_TRANSFER_MODE},
    {"PROXYAUTH", CURLOPT_PROXYAUTH},
    {"PROXYPORT", CURLOPT_PROXYPORT},

#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"PROXY_SSL_OPTIONS", CURLOPT_PROXY_SSL_OPTIONS},
    {"PROXY_SSL_VERIFYHOST", CURLOPT_PROXY_SSL_VERIFYHOST},
    {"PROXY_SSL_VERIFYPEER", CURLOPT_PROXY_SSL_VERIFYPEER},
    {"PROXY_SSLVERSION", CURLOPT_PROXY_SSLVERSION},
#endif

    {"PROXYTYPE", CURLOPT_PROXYTYPE},
    {"PUT", CURLOPT_PUT},
    {"READDATA", CURLOPT_READDATA},
    {"REDIR_PROTOCOLS", CURLOPT_REDIR_PROTOCOLS},
    {"RESUME_FROM", CURLOPT_RESUME_FROM},
    {"RTSP_CLIENT_CSEQ", CURLOPT_RTSP_CLIENT_CSEQ},
    {"RTSP_REQUEST", CURLOPT_RTSP_REQUEST},
    {"RTSP_SERVER_CSEQ", CURLOPT_RTSP_SERVER_CSEQ},
    {"SASL_IR", CURLOPT_SASL_IR},

    {"SERVER_RESPONSE_TIMEOUT", CURLOPT_SERVER_RESPONSE_TIMEOUT},

#if NODE_LIBCURL_VER_GE(8, 6, 0)
    {"SERVER_RESPONSE_TIMEOUT_MS", CURLOPT_SERVER_RESPONSE_TIMEOUT_MS},
#endif

#if NODE_LIBCURL_VER_GE(7, 55, 0)
    {"SOCKS5_AUTH", CURLOPT_SOCKS5_AUTH},
#endif

    {"SOCKS5_GSSAPI_NEC", CURLOPT_SOCKS5_GSSAPI_NEC},
    {"SSH_AUTH_TYPES", CURLOPT_SSH_AUTH_TYPES},

#if NODE_LIBCURL_VER_GE(7, 56, 0)
    {"SSH_COMPRESSION", CURLOPT_SSH_COMPRESSION},
#endif

    {"SSL_OPTIONS", CURLOPT_SSL_OPTIONS},
    {"SSLENGINE_DEFAULT", CURLOPT_SSLENGINE_DEFAULT},

#if NODE_LIBCURL_VER_GE(7, 36, 0)
    {"SSL_ENABLE_ALPN", CURLOPT_SSL_ENABLE_ALPN},
    {"SSL_ENABLE_NPN", CURLOPT_SSL_ENABLE_NPN},
#endif

    {"SSL_SESSIONID_CACHE", CURLOPT_SSL_SESSIONID_CACHE},
    {"SSL_VERIFYHOST", CURLOPT_SSL_VERIFYHOST},
    {"SSL_VERIFYPEER", CURLOPT_SSL_VERIFYPEER},

#if NODE_LIBCURL_VER_GE(7, 41, 0)
    {"SSL_VERIFYSTATUS", CURLOPT_SSL_VERIFYSTATUS},
#endif

    {"SSLVERSION", CURLOPT_SSLVERSION},

#if NODE_LIBCURL_VER_GE(7, 54, 0)
    {"SUPPRESS_CONNECT_HEADERS", CURLOPT_SUPPRESS_CONNECT_HEADERS},
#endif

#if NODE_LIBCURL_VER_GE(7, 49, 0)
    {"TCP_FASTOPEN", CURLOPT_TCP_FASTOPEN},
#endif

    {"TCP_KEEPALIVE", CURLOPT_TCP_KEEPALIVE},

#if NODE_LIBCURL_VER_GE(8, 9, 0)
    {"TCP_KEEPCNT", CURLOPT_TCP_KEEPCNT},
#endif

    {"TCP_KEEPIDLE", CURLOPT_TCP_KEEPIDLE},
    {"TCP_KEEPINTVL", CURLOPT_TCP_KEEPINTVL},
    {"TCP_NODELAY", CURLOPT_TCP_NODELAY},
    {"TFTP_BLKSIZE", CURLOPT_TFTP_BLKSIZE},
    {"TIMECONDITION", CURLOPT_TIMECONDITION},
    {"TIMEOUT", CURLOPT_TIMEOUT},
    {"TIMEOUT_MS", CURLOPT_TIMEOUT_MS},
    {"TIMEVALUE", CURLOPT_TIMEVALUE},
    {"TRANSFERTEXT", CURLOPT_TRANSFERTEXT},
    {"TRANSFER_ENCODING", CURLOPT_TRANSFER_ENCODING},
    {"UNRESTRICTED_AUTH", CURLOPT_UNRESTRICTED_AUTH},
    {"UPLOAD", CURLOPT_UPLOAD},

#if NODE_LIBCURL_VER_GE(7, 62, 0)
    {"UPLOAD_BUFFERSIZE", CURLOPT_UPLOAD_BUFFERSIZE},
#if NODE_LIBCURL_VER_GE(8, 13, 0)
    {"UPLOAD_FLAGS", CURLOPT_UPLOAD_FLAGS},
#endif
    {"UPKEEP_INTERVAL_MS", CURLOPT_UPKEEP_INTERVAL_MS},
#endif

    {"USE_SSL", CURLOPT_USE_SSL},
    {"VERBOSE", CURLOPT_VERBOSE},
    {"WILDCARDMATCH", CURLOPT_WILDCARDMATCH},

    // _LARGE options
    {"INFILESIZE_LARGE", CURLOPT_INFILESIZE_LARGE},
    {"MAXFILESIZE_LARGE", CURLOPT_MAXFILESIZE_LARGE},
    {"MAX_RECV_SPEED_LARGE", CURLOPT_MAX_RECV_SPEED_LARGE},
    {"MAX_SEND_SPEED_LARGE", CURLOPT_MAX_SEND_SPEED_LARGE},
    {"POSTFIELDSIZE_LARGE", CURLOPT_POSTFIELDSIZE_LARGE},
    {"RESUME_FROM_LARGE", CURLOPT_RESUME_FROM_LARGE},
#if NODE_LIBCURL_VER_GE(7, 59, 0)
    {"TIMEVALUE_LARGE", CURLOPT_TIMEVALUE_LARGE},
#endif
};

const std::vector<CurlConstant> curlOptionLinkedList = {
#if NODE_LIBCURL_VER_GE(7, 49, 0)
    {"CONNECT_TO", CURLOPT_CONNECT_TO},
#endif

    {"HTTP200ALIASES", CURLOPT_HTTP200ALIASES},
    {"HTTPHEADER", CURLOPT_HTTPHEADER},
    {"HTTPPOST", CURLOPT_HTTPPOST},
#if NODE_LIBCURL_VER_GE(7, 56, 0)
    {"MIMEPOST", CURLOPT_MIMEPOST},
#endif
    {"MAIL_RCPT", CURLOPT_MAIL_RCPT},

#if NODE_LIBCURL_VER_GE(7, 37, 0)
    {"PROXYHEADER", CURLOPT_PROXYHEADER},
#endif

    {"POSTQUOTE", CURLOPT_POSTQUOTE},
    {"PREQUOTE", CURLOPT_PREQUOTE},
    {"QUOTE", CURLOPT_QUOTE},
    {"RESOLVE", CURLOPT_RESOLVE},
    {"RTSPHEADER", CURLOPT_RTSPHEADER},
    {"TELNETOPTIONS", CURLOPT_TELNETOPTIONS},
};

// This should be kept in sync with the options on scripts/utils/curlOptionsBlacklist.js
const std::vector<CurlConstant> curlOptionNotImplemented = {
    // Options that are complex to add support for.
    {"SSL_CTX_FUNCTION", CURLOPT_TELNETOPTIONS},
    {"OPENSOCKETFUNCTION", CURLOPT_OPENSOCKETFUNCTION},
    {"CLOSESOCKETFUNCTION", CURLOPT_CLOSESOCKETFUNCTION},
    {"SOCKOPTFUNCTION", CURLOPT_SOCKOPTFUNCTION},

#if NODE_LIBCURL_VER_GE(7, 59, 0)
    {"RESOLVER_START_DATA", CURLOPT_RESOLVER_START_DATA},
    {"RESOLVER_START_FUNCTION", CURLOPT_RESOLVER_START_FUNCTION},
#endif

    {"CONV_FROM_UTF8_FUNCTION", CURLOPT_CONV_FROM_UTF8_FUNCTION},
    {"CONV_TO_NETWORK_FUNCTION", CURLOPT_CONV_TO_NETWORK_FUNCTION},
    {"CONV_FROM_NETWORK_FUNCTION", CURLOPT_CONV_FROM_NETWORK_FUNCTION},

    // Options that are used internally.
    {"WRITEDATA", CURLOPT_WRITEDATA},
    {"HEADERDATA", CURLOPT_HEADERDATA},

// Options that are not necessary because javascript nature.
#if NODE_LIBCURL_VER_GE(7, 63, 0)
    // URL's can be easily parsed on JS
    {"CURLU", CURLOPT_CURLU},
#endif

    {"PRIVATE", CURLOPT_PRIVATE},
    {"PROGRESSDATA", CURLOPT_PROGRESSDATA},

#if NODE_LIBCURL_VER_GE(7, 32, 0)
    {"XFERINFODATA", CURLOPT_XFERINFODATA},
#endif

    {"CHUNK_DATA", CURLOPT_CHUNK_DATA},
    {"CLOSESOCKETDATA", CURLOPT_CLOSESOCKETDATA},
    {"COPYPOSTFIELDS", CURLOPT_COPYPOSTFIELDS},
    {"DEBUGDATA", CURLOPT_DEBUGDATA},
    {"ERRORBUFFER", CURLOPT_ERRORBUFFER},
    {"FNMATCH_DATA", CURLOPT_FNMATCH_DATA},
    {"INTERLEAVEDATA", CURLOPT_INTERLEAVEDATA},
    {"IOCTLDATA", CURLOPT_IOCTLDATA},
#if NODE_LIBCURL_VER_GE(7, 87, 0)
    {"QUICK_EXIT", CURLOPT_QUICK_EXIT},
#endif
    {"OPENSOCKETDATA", CURLOPT_OPENSOCKETDATA},
    {"SEEKDATA", CURLOPT_SEEKDATA},
    {"SOCKOPTDATA", CURLOPT_SOCKOPTDATA},
    {"SSH_KEYDATA", CURLOPT_SSH_KEYDATA},
    {"SSL_CTX_DATA", CURLOPT_SSL_CTX_DATA},

#if NODE_LIBCURL_VER_GE(7, 64, 0)
    {"TRAILERDATA", CURLOPT_TRAILERDATA},
#endif

    // Maybe?
    {"INTERLEAVEFUNCTION", CURLOPT_INTERLEAVEFUNCTION},
    {"SSH_KEYFUNCTION", CURLOPT_SSH_KEYFUNCTION},
    {"STDERR", CURLOPT_STDERR},

#if NODE_LIBCURL_VER_GE(7, 46, 0)
    {"STREAM_DEPENDS", CURLOPT_STREAM_DEPENDS},
    {"STREAM_DEPENDS_E", CURLOPT_STREAM_DEPENDS_E},
    {"STREAM_WEIGHT", CURLOPT_STREAM_WEIGHT},
#endif
};

const std::vector<CurlConstant> curlOptionSpecific = {
    {"SHARE", CURLOPT_SHARE},
};

const std::vector<CurlConstant> curlOptionString = {
    {"ACCEPT_ENCODING", CURLOPT_ACCEPT_ENCODING},

#if NODE_LIBCURL_VER_GE(7, 75, 0)
    {"AWS_SIGV4", CURLOPT_AWS_SIGV4},
#endif

    {"CAINFO", CURLOPT_CAINFO},
    {"CAPATH", CURLOPT_CAPATH},
    {"COOKIE", CURLOPT_COOKIE},
    {"COOKIEFILE", CURLOPT_COOKIEFILE},
    {"COOKIEJAR", CURLOPT_COOKIEJAR},
    {"COOKIELIST", CURLOPT_COOKIELIST},
    {"CRLFILE", CURLOPT_CRLFILE},
    {"CUSTOMREQUEST", CURLOPT_CUSTOMREQUEST},

#if NODE_LIBCURL_VER_GE(7, 45, 0)
    {"DEFAULT_PROTOCOL", CURLOPT_DEFAULT_PROTOCOL},
#endif

#if NODE_LIBCURL_VER_GE(7, 33, 0)
    {"DNS_INTERFACE", CURLOPT_DNS_INTERFACE},
    {"DNS_LOCAL_IP4", CURLOPT_DNS_LOCAL_IP4},
    {"DNS_LOCAL_IP6", CURLOPT_DNS_LOCAL_IP6},
#endif

    {"DNS_SERVERS", CURLOPT_DNS_SERVERS},

#if NODE_LIBCURL_VER_GE(7, 62, 0)
    {"DOH_URL", CURLOPT_DOH_URL},
#endif

#if NODE_LIBCURL_VER_GE(8, 8, 0)
    {"ECH", CURLOPT_ECH},
#endif

    {"EGDSOCKET", CURLOPT_EGDSOCKET},
    {"ENCODING", CURLOPT_ENCODING},  // should use ACCEPT_ENCODING
    {"FTPPORT", CURLOPT_FTPPORT},
    {"FTP_ACCOUNT", CURLOPT_FTP_ACCOUNT},
    {"FTP_ALTERNATIVE_TO_USER", CURLOPT_FTP_ALTERNATIVE_TO_USER},

#if NODE_LIBCURL_VER_GE(8, 2, 0)
    {"HAPROXY_CLIENT_IP", CURLOPT_HAPROXY_CLIENT_IP},
#endif

    {"HTTP200ALIASES", CURLOPT_HTTP200ALIASES},

#if NODE_LIBCURL_VER_GE(7, 74, 0)
    {"HSTS", CURLOPT_HSTS},
#endif

    {"INTERFACE", CURLOPT_INTERFACE},
    {"ISSUERCERT", CURLOPT_ISSUERCERT},
    {"KEYPASSWD", CURLOPT_KEYPASSWD},
    {"KRBLEVEL", CURLOPT_KRBLEVEL},

#if NODE_LIBCURL_VER_GE(7, 34, 0)
    {"LOGIN_OPTIONS", CURLOPT_LOGIN_OPTIONS},
#endif

    {"MAIL_AUTH", CURLOPT_MAIL_AUTH},
    {"MAIL_FROM", CURLOPT_MAIL_FROM},
    {"NETRC_FILE", CURLOPT_NETRC_FILE},
    {"NOPROXY", CURLOPT_NOPROXY},
    {"PASSWORD", CURLOPT_PASSWORD},

#if NODE_LIBCURL_VER_GE(7, 39, 0)
    {"PINNEDPUBLICKEY", CURLOPT_PINNEDPUBLICKEY},
#endif

    {"POSTFIELDS", CURLOPT_POSTFIELDS},
    {"POSTQUOTE", CURLOPT_POSTQUOTE},
    {"PREQUOTE", CURLOPT_PREQUOTE},

#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"PRE_PROXY", CURLOPT_PRE_PROXY},
#endif

#if NODE_LIBCURL_VER_GE(7, 85, 0)
    {"PROTOCOLS_STR", CURLOPT_PROTOCOLS_STR},
#endif

    {"PROXY", CURLOPT_PROXY},

#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"PROXY_CAINFO", CURLOPT_PROXY_CAINFO},
    {"PROXY_CAPATH", CURLOPT_PROXY_CAPATH},
    {"PROXY_CRLFILE", CURLOPT_PROXY_CRLFILE},
#if NODE_LIBCURL_VER_GE(7, 71, 0)
    {"PROXY_ISSUERCERT", CURLOPT_PROXY_ISSUERCERT},
#endif
    {"PROXY_KEYPASSWD", CURLOPT_PROXY_KEYPASSWD},
    {"PROXY_PINNEDPUBLICKEY", CURLOPT_PROXY_PINNEDPUBLICKEY},
    {"PROXY_SSLCERT", CURLOPT_PROXY_SSLCERT},
    {"PROXY_SSLCERTTYPE", CURLOPT_PROXY_SSLCERTTYPE},
    {"PROXY_SSLKEY", CURLOPT_PROXY_SSLKEY},
    {"PROXY_SSLKEYTYPE", CURLOPT_PROXY_SSLKEYTYPE},
    {"PROXY_SSL_CIPHER_LIST", CURLOPT_PROXY_SSL_CIPHER_LIST},
    {"PROXY_TLSAUTH_PASSWORD", CURLOPT_PROXY_TLSAUTH_PASSWORD},
    {"PROXY_TLSAUTH_TYPE", CURLOPT_PROXY_TLSAUTH_TYPE},
    {"PROXY_TLSAUTH_USERNAME", CURLOPT_PROXY_TLSAUTH_USERNAME},
#endif

#if NODE_LIBCURL_VER_GE(7, 43, 0)
    {"PROXY_SERVICE_NAME", CURLOPT_PROXY_SERVICE_NAME},
#endif

#if NODE_LIBCURL_VER_GE(7, 61, 0)
    {"PROXY_TLS13_CIPHERS", CURLOPT_PROXY_TLS13_CIPHERS},
#endif

    {"PROXYPASSWORD", CURLOPT_PROXYPASSWORD},
    {"PROXYUSERNAME", CURLOPT_PROXYUSERNAME},
    {"PROXYUSERPWD", CURLOPT_PROXYUSERPWD},

    {"QUOTE", CURLOPT_QUOTE},
    {"RANDOM_FILE", CURLOPT_RANDOM_FILE},
    {"RANGE", CURLOPT_RANGE},

#if NODE_LIBCURL_VER_GE(7, 85, 0)
    {"REDIR_PROTOCOLS_STR", CURLOPT_REDIR_PROTOCOLS_STR},
#endif

    {"REFERER", CURLOPT_REFERER},

#if NODE_LIBCURL_VER_GE(7, 55, 0)
    {"REQUEST_TARGET", CURLOPT_REQUEST_TARGET},
#endif

    {"RTSP_SESSION_ID", CURLOPT_RTSP_SESSION_ID},
    {"RTSP_STREAM_URI", CURLOPT_RTSP_STREAM_URI},
    {"RTSP_TRANSPORT", CURLOPT_RTSP_TRANSPORT},

#if NODE_LIBCURL_VER_GE(7, 66, 0)
    {"SASL_AUTHZID", CURLOPT_SASL_AUTHZID},
#endif

#if NODE_LIBCURL_VER_GE(7, 43, 0)
    {"SERVICE_NAME", CURLOPT_SERVICE_NAME},
#endif

    {"SOCKS5_GSSAPI_SERVICE", CURLOPT_SOCKS5_GSSAPI_SERVICE},
    {"SSH_HOST_PUBLIC_KEY_MD5", CURLOPT_SSH_HOST_PUBLIC_KEY_MD5},
    {"SSH_KNOWNHOSTS", CURLOPT_SSH_KNOWNHOSTS},
    {"SSH_PRIVATE_KEYFILE", CURLOPT_SSH_PRIVATE_KEYFILE},
    {"SSH_PUBLIC_KEYFILE", CURLOPT_SSH_PUBLIC_KEYFILE},
    {"SSLCERT", CURLOPT_SSLCERT},
    {"SSLCERTTYPE", CURLOPT_SSLCERTTYPE},
    {"SSLENGINE", CURLOPT_SSLENGINE},
    {"SSLKEY", CURLOPT_SSLKEY},
    {"SSLKEYTYPE", CURLOPT_SSLKEYTYPE},
    {"SSL_CIPHER_LIST", CURLOPT_SSL_CIPHER_LIST},

#if NODE_LIBCURL_VER_GE(7, 73, 0)
    {"SSL_EC_CURVES", CURLOPT_SSL_EC_CURVES},
#endif
#if NODE_LIBCURL_VER_GE(8, 14, 0)
    {"SSL_SIGNATURE_ALGORITHMS", CURLOPT_SSL_SIGNATURE_ALGORITHMS},
#endif

    {"TELNETOPTIONS", CURLOPT_TELNETOPTIONS},

#if NODE_LIBCURL_VER_GE(7, 61, 0)
    {"TLS13_CIPHERS", CURLOPT_TLS13_CIPHERS},
#endif

    {"TLSAUTH_PASSWORD", CURLOPT_TLSAUTH_PASSWORD},
    {"TLSAUTH_TYPE", CURLOPT_TLSAUTH_TYPE},
    {"TLSAUTH_USERNAME", CURLOPT_TLSAUTH_USERNAME},

#if NODE_LIBCURL_VER_GE(7, 40, 0)
    {"UNIX_SOCKET_PATH", CURLOPT_UNIX_SOCKET_PATH},
#endif

    {"URL", CURLOPT_URL},
    {"USERAGENT", CURLOPT_USERAGENT},
    {"USERNAME", CURLOPT_USERNAME},
    {"USERPWD", CURLOPT_USERPWD},

#if NODE_LIBCURL_VER_GE(7, 33, 0)
    {"XOAUTH2_BEARER", CURLOPT_XOAUTH2_BEARER},
#endif
};

const std::vector<CurlConstant> curlMultiOptionFunction = {
#if NODE_LIBCURL_VER_GE(7, 44, 0)
    {"PUSHFUNCTION", CURLMOPT_PUSHFUNCTION},
#endif
};

const std::vector<CurlConstant> curlMultiOptionInteger = {
    {"CHUNK_LENGTH_PENALTY_SIZE", CURLMOPT_CHUNK_LENGTH_PENALTY_SIZE},
    {"CONTENT_LENGTH_PENALTY_SIZE", CURLMOPT_CONTENT_LENGTH_PENALTY_SIZE},
#if NODE_LIBCURL_VER_GE(7, 67, 0)
    {"MAX_CONCURRENT_STREAMS", CURLMOPT_MAX_CONCURRENT_STREAMS},
#endif
#if NODE_LIBCURL_VER_GE(8, 17, 0)
    {"NETWORK_CHANGED", CURLMOPT_NETWORK_CHANGED},
#endif
    {"MAX_HOST_CONNECTIONS", CURLMOPT_MAX_HOST_CONNECTIONS},
    {"MAX_TOTAL_CONNECTIONS", CURLMOPT_MAX_TOTAL_CONNECTIONS},
    {"MAXCONNECTS", CURLMOPT_MAXCONNECTS},
    // Pipelining was removed on libcurl 7.62, since then those options do nothing
    // Also see: https://github.com/curl/curl/pull/3651
    {"MAX_PIPELINE_LENGTH", CURLMOPT_MAX_PIPELINE_LENGTH},
    {"PIPELINING", CURLMOPT_PIPELINING},
};

// This should be kept in sync with the options on scripts/utils/multiOptionsBlacklist.js
const std::vector<CurlConstant> curlMultiOptionNotImplemented = {
    // Used internally.
    {"SOCKETFUNCTION", CURLMOPT_SOCKETFUNCTION},
    {"SOCKETDATA", CURLMOPT_SOCKETDATA},
    {"TIMERFUNCTION", CURLMOPT_TIMERFUNCTION},
    {"TIMERDATA", CURLMOPT_TIMERDATA},
// Unnecessary
#if NODE_LIBCURL_VER_GE(7, 44, 0)
    {"PUSHDATA", CURLMOPT_PUSHDATA},
#endif
#if NODE_LIBCURL_VER_GE(8, 17, 0)
    {"NOTIFYFUNCTION", CURLMOPT_NOTIFYFUNCTION},
    {"NOTIFYDATA", CURLMOPT_NOTIFYDATA},
#endif
};

const std::vector<CurlConstant> curlMultiOptionStringArray = {
    // Pipelining was removed on libcurl 7.62, since then those options do nothing
    // Also see: https://github.com/curl/curl/pull/3651
    {"PIPELINING_SERVER_BL", CURLMOPT_PIPELINING_SERVER_BL},
    {"PIPELINING_SITE_BL", CURLMOPT_PIPELINING_SITE_BL},
};

const std::vector<CurlConstant> curlInfoDouble = {
    {"APPCONNECT_TIME", CURLINFO_APPCONNECT_TIME},
    {"CONNECT_TIME", CURLINFO_CONNECT_TIME},
    {"CONTENT_LENGTH_DOWNLOAD", CURLINFO_CONTENT_LENGTH_DOWNLOAD},
    {"CONTENT_LENGTH_UPLOAD", CURLINFO_CONTENT_LENGTH_UPLOAD},
    {"NAMELOOKUP_TIME", CURLINFO_NAMELOOKUP_TIME},
    {"PRETRANSFER_TIME", CURLINFO_PRETRANSFER_TIME},
    {"REDIRECT_TIME", CURLINFO_REDIRECT_TIME},
    {"SIZE_DOWNLOAD", CURLINFO_SIZE_DOWNLOAD},
    {"SIZE_UPLOAD", CURLINFO_SIZE_UPLOAD},
    {"SPEED_DOWNLOAD", CURLINFO_SPEED_DOWNLOAD},
    {"SPEED_UPLOAD", CURLINFO_SPEED_UPLOAD},
    {"STARTTRANSFER_TIME", CURLINFO_STARTTRANSFER_TIME},
    {"TOTAL_TIME", CURLINFO_TOTAL_TIME},
};

const std::vector<CurlConstant> curlInfoInteger = {
    {"CONDITION_UNMET", CURLINFO_CONDITION_UNMET},
    {"FILETIME", CURLINFO_FILETIME},
    {"HEADER_SIZE", CURLINFO_HEADER_SIZE},
    {"HTTPAUTH_AVAIL", CURLINFO_HTTPAUTH_AVAIL},
    {"HTTP_CONNECTCODE", CURLINFO_HTTP_CONNECTCODE},

#if NODE_LIBCURL_VER_GE(7, 50, 1)
    {"HTTP_VERSION", CURLINFO_HTTP_VERSION},
#endif

    {"LASTSOCKET", CURLINFO_LASTSOCKET},  // deprecated since 7.45.0
    {"LOCAL_PORT", CURLINFO_LOCAL_PORT},
    {"NUM_CONNECTS", CURLINFO_NUM_CONNECTS},
    {"OS_ERRNO", CURLINFO_OS_ERRNO},
    {"PRIMARY_PORT", CURLINFO_PRIMARY_PORT},

#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"PROTOCOL", CURLINFO_PROTOCOL},
#endif

    {"PROXYAUTH_AVAIL", CURLINFO_PROXYAUTH_AVAIL},

#if NODE_LIBCURL_VER_GE(7, 73, 0)
    {"PROXY_ERROR", CURLINFO_PROXY_ERROR},
#endif

#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"PROXY_SSL_VERIFYRESULT", CURLINFO_PROXY_SSL_VERIFYRESULT},
#endif

    {"REDIRECT_COUNT", CURLINFO_REDIRECT_COUNT},
    {"REQUEST_SIZE", CURLINFO_REQUEST_SIZE},
    {"RESPONSE_CODE", CURLINFO_RESPONSE_CODE},
    {"RTSP_CLIENT_CSEQ", CURLINFO_RTSP_CLIENT_CSEQ},
    {"RTSP_CSEQ_RECV", CURLINFO_RTSP_CSEQ_RECV},
    {"RTSP_SERVER_CSEQ", CURLINFO_RTSP_SERVER_CSEQ},
    {"SSL_VERIFYRESULT", CURLINFO_SSL_VERIFYRESULT},
#if NODE_LIBCURL_VER_GE(8, 7, 0)
    {"USED_PROXY", CURLINFO_USED_PROXY},
#endif
#if NODE_LIBCURL_VER_GE(8, 12, 0)
    {"PROXYAUTH_USED", CURLINFO_PROXYAUTH_USED},
    {"HTTPAUTH_USED", CURLINFO_HTTPAUTH_USED},
#endif
};

const std::vector<CurlConstant> curlInfoLinkedList = {
    {"SSL_ENGINES", CURLINFO_SSL_ENGINES},
    {"COOKIELIST", CURLINFO_COOKIELIST},
    {"CERTINFO", CURLINFO_CERTINFO},
};

const std::vector<CurlConstant> curlInfoNotImplemented = {
// Complex.
#if NODE_LIBCURL_VER_GE(7, 34, 0)
    {"TLS_SESSION", CURLINFO_TLS_SESSION},
#endif
#if NODE_LIBCURL_VER_GE(7, 48, 0)
    {"TLS_SSL_PTR", CURLINFO_TLS_SSL_PTR},
#endif
    // Unnecessary.
    {"PRIVATE", CURLINFO_PRIVATE},
    // Maybe
};

const std::vector<CurlConstant> curlInfoOffT = {
#if NODE_LIBCURL_VER_GE(7, 55, 0)
    {"CONTENT_LENGTH_DOWNLOAD_T", CURLINFO_CONTENT_LENGTH_DOWNLOAD_T},
    {"CONTENT_LENGTH_UPLOAD_T", CURLINFO_CONTENT_LENGTH_UPLOAD_T},
    {"SIZE_DOWNLOAD_T", CURLINFO_SIZE_DOWNLOAD_T},
    {"SIZE_UPLOAD_T", CURLINFO_SIZE_UPLOAD_T},
    {"SPEED_DOWNLOAD_T", CURLINFO_SPEED_DOWNLOAD_T},
    {"SPEED_UPLOAD_T", CURLINFO_SPEED_UPLOAD_T},
#endif
#if NODE_LIBCURL_VER_GE(7, 59, 0)
    {"FILETIME_T", CURLINFO_FILETIME_T},
#endif
#if NODE_LIBCURL_VER_GE(7, 61, 0)
    {"APPCONNECT_TIME_T", CURLINFO_APPCONNECT_TIME_T},
    {"CONNECT_TIME_T", CURLINFO_CONNECT_TIME_T},
    {"NAMELOOKUP_TIME_T", CURLINFO_NAMELOOKUP_TIME_T},
    {"PRETRANSFER_TIME_T", CURLINFO_PRETRANSFER_TIME_T},
    {"REDIRECT_TIME_T", CURLINFO_REDIRECT_TIME_T},
    {"STARTTRANSFER_TIME_T", CURLINFO_STARTTRANSFER_TIME_T},
    {"TOTAL_TIME_T", CURLINFO_TOTAL_TIME_T},
#endif
#if NODE_LIBCURL_VER_GE(7, 66, 0)
    {"RETRY_AFTER", CURLINFO_RETRY_AFTER},
#endif
#if NODE_LIBCURL_VER_GE(8, 2, 0)
    {"CONN_ID", CURLINFO_CONN_ID},
    {"XFER_ID", CURLINFO_XFER_ID},
#endif
#if NODE_LIBCURL_VER_GE(8, 6, 0)
    {"QUEUE_TIME_T", CURLINFO_QUEUE_TIME_T},
#endif
#if NODE_LIBCURL_VER_GE(8, 10, 0)
    {"POSTTRANSFER_TIME_T", CURLINFO_POSTTRANSFER_TIME_T},
#endif
#if NODE_LIBCURL_VER_GE(8, 11, 0)
    {"EARLYDATA_SENT_T", CURLINFO_EARLYDATA_SENT_T},
#endif
};

const std::vector<CurlConstant> curlInfoSocket = {
#if NODE_LIBCURL_VER_GE(7, 45, 0)
    {"ACTIVESOCKET", CURLINFO_ACTIVESOCKET},
#endif
};

const std::vector<CurlConstant> curlInfoString = {
#if NODE_LIBCURL_VER_GE(7, 84, 0)
    {"CAINFO", CURLINFO_CAINFO},
    {"CAPATH", CURLINFO_CAPATH},
#endif

    {"CONTENT_TYPE", CURLINFO_CONTENT_TYPE},
    {"EFFECTIVE_URL", CURLINFO_EFFECTIVE_URL},

#if NODE_LIBCURL_VER_GE(7, 72, 0)
    {"EFFECTIVE_METHOD", CURLINFO_EFFECTIVE_METHOD},
#endif

    {"FTP_ENTRY_PATH", CURLINFO_FTP_ENTRY_PATH},
    {"LOCAL_IP", CURLINFO_LOCAL_IP},
    {"PRIMARY_IP", CURLINFO_PRIMARY_IP},
    {"REDIRECT_URL", CURLINFO_REDIRECT_URL},

#if NODE_LIBCURL_VER_GE(7, 76, 0)
    {"REFERER", CURLINFO_REFERER},
#endif

    {"RTSP_SESSION_ID", CURLINFO_RTSP_SESSION_ID},

#if NODE_LIBCURL_VER_GE(7, 52, 0)
    {"SCHEME", CURLINFO_SCHEME},
#endif
};

// Helper function to add constants to an Node.js object. Private to this file.
static void AddConstants(Napi::Object obj, const std::vector<CurlConstant>& constants) {
  Napi::Env env = obj.Env();

  for (const auto& constant : constants) {
    obj.DefineProperty(Napi::PropertyDescriptor::Value(
        constant.name, Napi::Number::New(env, static_cast<double>(constant.value)),
        static_cast<napi_property_attributes>(napi_enumerable | napi_configurable)));
  }
}

Curl::Curl(Napi::Env env, Napi::Object exports) : env(env), addonAllocatedMemory(0) {
  this->InitTLS();

  this->EasyConstructor = Napi::Persistent(Easy::Init(env, exports));
  this->MultiConstructor = Napi::Persistent(Multi::Init(env, exports));
  this->ShareConstructor = Napi::Persistent(Share::Init(env, exports));
  this->Http2PushFrameHeadersConstructor =
      Napi::Persistent(Http2PushFrameHeaders::Init(env, exports));
#if NODE_LIBCURL_VER_GE(7, 56, 0)
  this->CurlMimeConstructor = Napi::Persistent(CurlMime::Init(env, exports));
  this->CurlMimePartConstructor = Napi::Persistent(CurlMimePart::Init(env, exports));
#endif

  // This is setup on moduleSetup.ts
  this->CurlEasyErrorConstructor = Napi::Persistent(CurlError::InitCurlEasyError(env));
  this->CurlMultiErrorConstructor = Napi::Persistent(CurlError::InitCurlMultiError(env));
  this->CurlSharedErrorConstructor = Napi::Persistent(CurlError::InitCurlSharedError(env));

  CurlVersionInfo::Init(env, exports);
}

Curl::~Curl() {
  // Destructor implementation - cleanup handled by N-API automatically
}

void Curl::InitTLS() {
  // This is setup on moduleSetup.ts
  Napi::Value maybeTls = env.Global().Get("__libcurlTls");

  if (!(maybeTls.IsObject())) {
    return;
  }

  Napi::Object tls = maybeTls.ToObject();

  // get CA certificates from Node.js's tls module and set them on the easy handle
  // See: https://nodejs.org/api/tls.html#tlsgetcacertificatestype
  Napi::Function getCACertificates = tls.Get("getCACertificates").As<Napi::Function>();
  Napi::Array caCertificates =
      getCACertificates.Call({Napi::String::New(env, "default")}).As<Napi::Array>();

  std::vector<std::string> certs;
  for (uint32_t i = 0; i < caCertificates.Length(); i++) {
    Napi::Value cert = caCertificates[i];
    if (cert.IsString()) {
      certs.push_back(cert.As<Napi::String>().Utf8Value());
    }
  }

  // Join all certificates with newline
  if (!certs.empty()) {
    for (size_t i = 0; i < certs.size(); ++i) {
      if (i > 0) {
        this->caCertificatesData += "\n";
      }
      this->caCertificatesData += certs[i];
    }

    // Set up the curl_blob structure with CURL_BLOB_NOCOPY flag
    // We use NOCOPY because the data is stored in this->caCertificatesData which persists
    // for the lifetime of the Curl instance
    this->caCertificatesBlob.data = const_cast<char*>(this->caCertificatesData.c_str());
    this->caCertificatesBlob.len = this->caCertificatesData.length();
    this->caCertificatesBlob.flags = CURL_BLOB_NOCOPY;
  }
}

void Curl::AdjustHandleMemory(CurlHandleType handleType, int delta) {
  auto size = handleMemoryMap[handleType];
  auto usage = size * delta;
  this->addonAllocatedMemory += usage;
  Napi::MemoryManagement::AdjustExternalMemory(this->env, usage);

  this->activeHandleCount[handleType] += delta;

  // we used to have checks against v8 not running, as this was based on libxml:
  // https://github.com/libxmljs/libxmljs/blob/master/src/libxmljs.cc
  // We do not have that anymore.
}

void Curl::CleanupData(Napi::Env env, Curl* data) {
  delete data;
  curl_global_cleanup();
}

// Initialize function
Napi::Object Curl::Init(Napi::Env env, Napi::Object exports) {
  // We used to use curl_global_init_mem, as we would use it to adjust memory usage of the addon
  // however when running with multiple environments, this would not make a lot of sense, as we
  // would be unable to track which environment is responsible for the memory usage.
  CURLcode code = curl_global_init(static_cast<long>(CURL_GLOBAL_ALL));

  if (code != CURLE_OK) {
    throw Napi::Error::New(
        env, "Failed to initialize libcurl: " + std::string(curl_easy_strerror(code)));
  }

  Curl* curl = new Curl(env, exports);

  // env.SetInstanceData(data, CleanupData);  can be used to save data for future usage
  // which can be retrieved using Napi::Env::GetInstanceData
  // We may need to use that instead of this static reference, as otherwise this may not be thread
  // safe see https://github.com/nodejs/node-addon-api/issues/550#issuecomment-3243637102
  env.SetInstanceData<Curl, Curl::CleanupData>(curl);

  // Create Curl object to hold constants and methods
  Napi::Object curlJs = Napi::Object::New(env);

  auto getVersion = Napi::PropertyDescriptor::Function(
      "getVersion", Curl::GetVersion, static_cast<napi_property_attributes>(napi_enumerable));

  auto getCount = Napi::PropertyDescriptor::Function(
      "getCount", Curl::GetCount, static_cast<napi_property_attributes>(napi_enumerable));

  auto versionNum = Napi::PropertyDescriptor::Accessor(
      "VERSION_NUM", Curl::GetVersionNum,
      static_cast<napi_property_attributes>(napi_enumerable | napi_configurable));

  auto threadId = Napi::PropertyDescriptor::Accessor(
      "THREAD_ID", Curl::GetThreadId,
      static_cast<napi_property_attributes>(napi_enumerable | napi_configurable));

  curlJs.DefineProperties({getVersion, getCount, versionNum, threadId});

  // Create option object
  Napi::Object curlOption = Napi::Object::New(env);
  AddConstants(curlOption, curlOptionNotImplemented);
  AddConstants(curlOption, curlOptionHttpPost);
  AddConstants(curlOption, curlOptionBlob);
  AddConstants(curlOption, curlOptionFunction);
  AddConstants(curlOption, curlOptionInteger);
  AddConstants(curlOption, curlOptionLinkedList);
  AddConstants(curlOption, curlOptionSpecific);
  AddConstants(curlOption, curlOptionString);
  curlJs.Set("option", curlOption);

  // Create info object
  Napi::Object curlInfo = Napi::Object::New(env);
  AddConstants(curlInfo, curlInfoNotImplemented);
  AddConstants(curlInfo, curlInfoDouble);
  AddConstants(curlInfo, curlInfoInteger);
  AddConstants(curlInfo, curlInfoLinkedList);
  AddConstants(curlInfo, curlInfoOffT);
  AddConstants(curlInfo, curlInfoSocket);
  AddConstants(curlInfo, curlInfoString);
  curlJs.Set("info", curlInfo);

  // Create multi option object
  Napi::Object curlMultiOption = Napi::Object::New(env);
  AddConstants(curlMultiOption, curlMultiOptionFunction);
  AddConstants(curlMultiOption, curlMultiOptionInteger);
  AddConstants(curlMultiOption, curlMultiOptionStringArray);
  curlJs.Set("multi", curlMultiOption);

  // Add other curl constants (codes, etc.)
  Napi::Object curlCode = Napi::Object::New(env);
  curlCode.Set("CURLE_OK", Napi::Number::New(env, CURLE_OK));
  curlJs.Set("code", curlCode);

  // Export Curl object
  exports.Set("Curl", curlJs);

  return exports;
}

Napi::Value Curl::GetVersion(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Thread-safe lazy initialization of curl version string
  // curl_version() uses a static buffer and is not thread-safe
  static std::once_flag versionInitFlag;
  static std::string cachedVersion;

  std::call_once(versionInitFlag, []() { cachedVersion = curl_version(); });

  return Napi::String::New(env, cachedVersion);
}

Napi::Value Curl::GetCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  auto curl = info.Env().GetInstanceData<Curl>();
  return Napi::Number::New(env, curl->activeHandleCount[CURL_HANDLE_TYPE_EASY]);
}

Napi::Value Curl::GetVersionNum(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, LIBCURL_VERSION_NUM);
}

Napi::Value Curl::GetThreadId(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::ostringstream oss;
  oss << std::this_thread::get_id();
  return Napi::String::New(env, oss.str());
}

// Helper methods implementation

static std::once_flag curlConstantMapsInitFlag;

void InitializeCurlConstantMaps() {
  std::call_once(curlConstantMapsInitFlag, []() {
    const std::vector<CurlConstant>* allConstantVectors[] = {
        &curlOptionBlob,
        &curlOptionFunction,
        &curlOptionHttpPost,
        &curlOptionInteger,
        &curlOptionLinkedList,
        &curlOptionNotImplemented,
        &curlOptionSpecific,
        &curlOptionString,
        &curlInfoDouble,
        &curlInfoInteger,
        &curlInfoLinkedList,
        &curlInfoNotImplemented,
        &curlInfoOffT,
        &curlInfoSocket,
        &curlInfoString,
        &curlMultiOptionFunction,
        &curlMultiOptionInteger,
        &curlMultiOptionNotImplemented,
        &curlMultiOptionStringArray,
    };

    curlConstantsByName.reserve(500);
    curlConstantsByValue.reserve(500);

    for (const auto* vec : allConstantVectors) {
      for (const auto& constant : *vec) {
        int32_t value = static_cast<int32_t>(constant.value);

        // Push entries to support duplicate names across different contexts
        curlConstantsByName[constant.name].push_back({value, vec});
        curlConstantsByValue[constant.value].push_back({value, vec});
      }
    }
  });
}

int32_t IsInsideCurlConstantStruct(const std::vector<CurlConstant>& curlConstants,
                                   const Napi::Value& searchFor) {
  int32_t ret = 0;  // Return 0 (falsy) when no match found

  if (searchFor.IsString()) {
    std::string optionName = searchFor.As<Napi::String>().Utf8Value();
    std::transform(optionName.begin(), optionName.end(), optionName.begin(), ::toupper);

    auto it = curlConstantsByName.find(optionName);
    if (it != curlConstantsByName.end()) {
      // Iterate through all entries with this name to find one matching the target vector
      // This handles duplicate names across different contexts (e.g., CERTINFO as option and info)
      for (const auto& lookup : it->second) {
        if (lookup.sourceVector == &curlConstants) {
          ret = lookup.value;
          break;
        }
      }
    }
  } else if (searchFor.IsNumber()) {
    int64_t searchForNumber = searchFor.As<Napi::Number>().Int64Value();

    auto it = curlConstantsByValue.find(searchForNumber);
    if (it != curlConstantsByValue.end()) {
      // Iterate through all entries with this value to find one matching the target vector
      for (const auto& lookup : it->second) {
        if (lookup.sourceVector == &curlConstants) {
          ret = lookup.value;
          break;
        }
      }
    }
  }

  return ret;
}

}  // namespace NodeLibcurl
