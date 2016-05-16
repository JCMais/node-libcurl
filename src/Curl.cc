/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
#include "Curl.h"

#include <iostream>
#include <stdlib.h>
#include <string.h>

#include "Easy.h"
#include "string_format.h"


//@TODO CHANGE LIBCURL_VERSION_NUM TO NODE_LIBCURL_VER_GE
namespace NodeLibcurl {

    const std::vector<CurlConstant> curlConstAuth = {
        { "ANY", CURLAUTH_ANY },
        { "ANYSAFE", CURLAUTH_ANYSAFE },
        { "BASIC", CURLAUTH_BASIC },
        { "DIGEST", CURLAUTH_DIGEST },

    #if NODE_LIBCURL_VER_GE( 7, 19, 3 )
        { "DIGEST_IE", CURLAUTH_DIGEST_IE },
    #endif

        { "GSSNEGOTIATE", CURLAUTH_GSSNEGOTIATE },

    #if NODE_LIBCURL_VER_GE( 7, 38, 0 )
        { "NEGOTIATE", CURLAUTH_NEGOTIATE },
    #endif

        { "NONE", CURLAUTH_NONE },
        { "NTLM", CURLAUTH_NTLM },

    #if NODE_LIBCURL_VER_GE( 7, 22, 0 )
        { "NTLM_WB", CURLAUTH_NTLM_WB },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 21, 3 )
        { "ONLY", CURLAUTH_ONLY },
    #endif
    };

#if NODE_LIBCURL_VER_GE( 7, 19, 4 )
    const std::vector<CurlConstant> curlConstProtocol = {
        { "ALL", CURLPROTO_ALL },
        { "DICT", CURLPROTO_DICT },
        { "FTP", CURLPROTO_FTP },
        { "FTPS", CURLPROTO_FTPS },

    #if NODE_LIBCURL_VER_GE( 7, 21, 2 )
        { "GOPHER", CURLPROTO_GOPHER },
    #endif

        { "HTTP", CURLPROTO_HTTP },
        { "HTTPS", CURLPROTO_HTTPS },

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "IMAP", CURLPROTO_IMAP },
        { "IMAPS", CURLPROTO_IMAPS },
    #endif

        { "LDAP", CURLPROTO_LDAP },
        { "LDAPS", CURLPROTO_LDAPS },

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "POP3", CURLPROTO_POP3 },
        { "POP3S", CURLPROTO_POP3S },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "RTMP", CURLPROTO_RTMP },
        { "RTMPE", CURLPROTO_RTMPE },
        { "RTMPS", CURLPROTO_RTMPS },
        { "RTMPT", CURLPROTO_RTMPT },
        { "RTMPTE", CURLPROTO_RTMPTE },
        { "RTMPTS", CURLPROTO_RTMPTS },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "RTSP", CURLPROTO_RTSP },
    #endif

        { "SCP", CURLPROTO_SCP },
        { "SFTP", CURLPROTO_SFTP },

    #if NODE_LIBCURL_VER_GE( 7, 40, 0 )
        { "SMB", CURLPROTO_SMB },
        { "SMBS", CURLPROTO_SMBS },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "SMTP", CURLPROTO_SMTP },
        { "SMTPS", CURLPROTO_SMTPS },
    #endif

        { "TELNET", CURLPROTO_TELNET },
        { "TFTP", CURLPROTO_TFTP },
    };
#endif

    const std::vector<CurlConstant> curlConstPause = {
        { "ALL", CURLPAUSE_ALL },
        { "CONT", CURLPAUSE_CONT },
        { "RECV", CURLPAUSE_RECV },
        { "RECV_CONT", CURLPAUSE_RECV_CONT },
        { "SEND", CURLPAUSE_SEND },
        { "SEND_CONT", CURLPAUSE_SEND_CONT },
    };

    const std::vector<CurlConstant> curlConstHttp = {
        { "VERSION_1_0", CURL_HTTP_VERSION_1_0 },
        { "VERSION_1_1", CURL_HTTP_VERSION_1_1 },

    #if NODE_LIBCURL_VER_GE( 7, 33, 0 )
        { "VERSION_2_0", CURL_HTTP_VERSION_2_0 },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 43, 0 )
        { "VERSION_2", CURL_HTTP_VERSION_2 },
    #endif

        { "VERSION_NONE", CURL_HTTP_VERSION_NONE },
    };

#if NODE_LIBCURL_VER_GE( 7, 37, 0 )
    const std::vector<CurlConstant> curlConstHeader = {
        { "UNIFIED", CURLHEADER_UNIFIED },
        { "SEPARATE", CURLHEADER_SEPARATE },
    };
#endif

    const std::vector<CurlConstant> curlOptionNotImplemented = {
        // Options that are complex to add support for.
        { "SSL_CTX_FUNCTION", CURLOPT_SSL_CTX_FUNCTION },
        { "OPENSOCKETFUNCTION", CURLOPT_OPENSOCKETFUNCTION },
    #if NODE_LIBCURL_VER_GE( 7, 21, 7 )
        { "CLOSESOCKETFUNCTION", CURLOPT_CLOSESOCKETFUNCTION },
    #endif
        { "SOCKOPTFUNCTION", CURLOPT_SOCKOPTFUNCTION },
        { "CONV_FROM_UTF8_FUNCTION", CURLOPT_CONV_FROM_UTF8_FUNCTION },
        { "CONV_TO_NETWORK_FUNCTION", CURLOPT_CONV_TO_NETWORK_FUNCTION },
        { "CONV_FROM_NETWORK_FUNCTION", CURLOPT_CONV_FROM_NETWORK_FUNCTION },

        // Options that are used internally.
        { "WRITEDATA", CURLOPT_WRITEDATA },
        { "HEADERDATA", CURLOPT_HEADERDATA },

        // Options that are not necessary because javascript nature.
        { "PRIVATE", CURLOPT_PRIVATE },
        { "PROGRESSDATA", CURLOPT_PROGRESSDATA },
    #if NODE_LIBCURL_VER_GE( 7, 32, 0 )
          { "XFERINFODATA", CURLOPT_XFERINFODATA },
    #endif
        { "DEBUGDATA", CURLOPT_DEBUGDATA },
        { "SEEKDATA", CURLOPT_SEEKDATA },
        { "IOCTLDATA", CURLOPT_IOCTLDATA },
        { "SOCKOPTDATA", CURLOPT_SOCKOPTDATA },
        { "OPENSOCKETDATA", CURLOPT_OPENSOCKETDATA },
    #if NODE_LIBCURL_VER_GE( 7, 21, 7 )
        { "CLOSESOCKETDATA", CURLOPT_CLOSESOCKETDATA },
    #endif
        { "SSL_CTX_DATA", CURLOPT_SSL_CTX_DATA },
    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "INTERLEAVEDATA", CURLOPT_INTERLEAVEDATA },
    #endif
    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "CHUNK_DATA", CURLOPT_CHUNK_DATA },
        { "FNMATCH_DATA", CURLOPT_FNMATCH_DATA },
    #endif
        { "ERRORBUFFER", CURLOPT_ERRORBUFFER },
        { "COPYPOSTFIELDS", CURLOPT_COPYPOSTFIELDS },
    #if NODE_LIBCURL_VER_GE( 7, 19, 6 )
        { "SSH_KEYDATA", CURLOPT_SSH_KEYDATA },
    #endif

        // Maybe?
    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "INTERLEAVEFUNCTION", CURLOPT_INTERLEAVEFUNCTION },
    #endif
    #if NODE_LIBCURL_VER_GE( 7, 19, 6 )
        { "SSH_KEYFUNCTION", CURLOPT_SSH_KEYFUNCTION },
    #endif
        { "SEEKFUNCTION", CURLOPT_SEEKFUNCTION },
        { "STDERR", CURLOPT_STDERR },
    #if NODE_LIBCURL_VER_GE( 7, 46, 0 )
        { "STREAM_DEPENDS", CURLOPT_STREAM_DEPENDS },
        { "STREAM_DEPENDS_E", CURLOPT_STREAM_DEPENDS_E },
        { "STREAM_WEIGHT", CURLOPT_STREAM_WEIGHT },
    #endif

        // Missing constants.
    #if NODE_LIBCURL_VER_GE( 7, 25, 0 )
        { "SSL_OPTIONS", CURLOPT_SSL_OPTIONS },
    #endif
    #if NODE_LIBCURL_VER_GE( 7, 22, 0 )
        { "GSSAPI_DELEGATION", CURLOPT_GSSAPI_DELEGATION },
    #endif
    };

    const std::vector<CurlConstant> curlOptionInteger = {
    #if NODE_LIBCURL_VER_GE( 7, 24, 0 )
        { "ACCEPTTIMEOUT_MS", CURLOPT_ACCEPTTIMEOUT_MS },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "ADDRESS_SCOPE", CURLOPT_ADDRESS_SCOPE },
    #endif

        { "APPEND", CURLOPT_APPEND },
        { "AUTOREFERER", CURLOPT_AUTOREFERER },
        { "BUFFERSIZE", CURLOPT_BUFFERSIZE },

    #if NODE_LIBCURL_VER_GE( 7, 19, 1 )
        { "CERTINFO", CURLOPT_CERTINFO },
    #endif

        { "CONNECTTIMEOUT", CURLOPT_CONNECTTIMEOUT },
        { "CONNECTTIMEOUT_MS", CURLOPT_CONNECTTIMEOUT_MS },
        { "CONNECT_ONLY", CURLOPT_CONNECT_ONLY },
        { "COOKIESESSION", CURLOPT_COOKIESESSION },
        { "CRLF", CURLOPT_CRLF },
        { "DIRLISTONLY", CURLOPT_DIRLISTONLY },
        { "DNS_CACHE_TIMEOUT", CURLOPT_DNS_CACHE_TIMEOUT },
        { "DNS_USE_GLOBAL_CACHE", CURLOPT_DNS_USE_GLOBAL_CACHE },

    #if NODE_LIBCURL_VER_GE( 7, 36, 0 )
        { "EXPECT_100_TIMEOUT_MS", CURLOPT_EXPECT_100_TIMEOUT_MS },
    #endif

        { "FAILONERROR", CURLOPT_FAILONERROR },
        { "FILETIME", CURLOPT_FILETIME },
        { "FOLLOWLOCATION", CURLOPT_FOLLOWLOCATION },
        { "FORBID_REUSE", CURLOPT_FORBID_REUSE },
        { "FRESH_CONNECT", CURLOPT_FRESH_CONNECT },
        { "FTP_CREATE_MISSING_DIRS", CURLOPT_FTP_CREATE_MISSING_DIRS },
        { "FTP_RESPONSE_TIMEOUT", CURLOPT_FTP_RESPONSE_TIMEOUT },
        { "FTP_SKIP_PASV_IP", CURLOPT_FTP_SKIP_PASV_IP },
        { "FTP_USE_EPRT", CURLOPT_FTP_USE_EPRT },
        { "FTP_USE_EPSV", CURLOPT_FTP_USE_EPSV },

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "FTP_USE_PRET", CURLOPT_FTP_USE_PRET },
    #endif

        { "HEADER", CURLOPT_HEADER },

    #if NODE_LIBCURL_VER_GE( 7, 37, 0 )
        { "HEADEROPT", CURLOPT_HEADEROPT },
    #endif

        { "HTTPAUTH", CURLOPT_HTTPAUTH },
        { "HTTPGET", CURLOPT_HTTPGET },
        { "HTTPPROXYTUNNEL", CURLOPT_HTTPPROXYTUNNEL },
        { "HTTP_CONTENT_DECODING", CURLOPT_HTTP_CONTENT_DECODING },
        { "HTTP_TRANSFER_DECODING", CURLOPT_HTTP_TRANSFER_DECODING },
        { "HTTP_VERSION", CURLOPT_HTTP_VERSION },
        { "IGNORE_CONTENT_LENGTH", CURLOPT_IGNORE_CONTENT_LENGTH },
        { "INFILESIZE", CURLOPT_INFILESIZE },
        { "IPRESOLVE", CURLOPT_IPRESOLVE },
        { "LOCALPORT", CURLOPT_LOCALPORT },
        { "LOCALPORTRANGE", CURLOPT_LOCALPORTRANGE },
        { "LOW_SPEED_LIMIT", CURLOPT_LOW_SPEED_LIMIT },
        { "LOW_SPEED_TIME", CURLOPT_LOW_SPEED_TIME },
        { "MAXCONNECTS", CURLOPT_MAXCONNECTS },
        { "MAXFILESIZE", CURLOPT_MAXFILESIZE },
        { "MAXREDIRS", CURLOPT_MAXREDIRS },
        { "NETRC", CURLOPT_NETRC },
        { "NEW_DIRECTORY_PERMS", CURLOPT_NEW_DIRECTORY_PERMS },
        { "NEW_FILE_PERMS", CURLOPT_NEW_FILE_PERMS },
        { "NOBODY", CURLOPT_NOBODY },
        { "NOPROGRESS", CURLOPT_NOPROGRESS },
        { "NOSIGNAL", CURLOPT_NOSIGNAL },

    #if NODE_LIBCURL_VER_GE( 7, 42, 0 )
        { "PATH_AS_IS", CURLOPT_PATH_AS_IS },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 43, 0 )
        { "PIPEWAIT", CURLOPT_PIPEWAIT },
    #endif

        { "PORT", CURLOPT_PORT },
        { "POST", CURLOPT_POST },
        { "POSTFIELDSIZE", CURLOPT_POSTFIELDSIZE }, //@TODO ADD POSTFIELDSIZE_LARGE

    #if NODE_LIBCURL_VER_GE( 7, 19, 1 )
        { "POSTREDIR", CURLOPT_POSTREDIR },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "PROTOCOLS", CURLOPT_PROTOCOLS },
    #endif

        { "PROXYAUTH", CURLOPT_PROXYAUTH },
        { "PROXYPORT", CURLOPT_PROXYPORT },
        { "PROXYTYPE", CURLOPT_PROXYTYPE },
        { "PROXY_TRANSFER_MODE", CURLOPT_PROXY_TRANSFER_MODE },
        { "PUT", CURLOPT_PUT },
        { "READDATA", CURLOPT_READDATA },

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "REDIR_PROTOCOLS", CURLOPT_REDIR_PROTOCOLS },
    #endif

        { "RESUME_FROM", CURLOPT_RESUME_FROM }, //@TODO ADD RESUME_FROM_LARGE

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "RTSP_CLIENT_CSEQ", CURLOPT_RTSP_CLIENT_CSEQ },
        { "RTSP_SERVER_CSEQ", CURLOPT_RTSP_SERVER_CSEQ },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 31, 0 )
        { "SASL_IR", CURLOPT_SASL_IR },
    #endif

        { "SSH_AUTH_TYPES", CURLOPT_SSH_AUTH_TYPES },

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "SOCKS5_GSSAPI_NEC", CURLOPT_SOCKS5_GSSAPI_NEC },
    #endif

        { "SSLENGINE_DEFAULT", CURLOPT_SSLENGINE_DEFAULT },

    #if NODE_LIBCURL_VER_GE( 7, 36, 0 )
        { "SSL_ENABLE_ALPN", CURLOPT_SSL_ENABLE_ALPN },
        { "SSL_ENABLE_NPN", CURLOPT_SSL_ENABLE_NPN },
    #endif

        { "SSL_SESSIONID_CACHE", CURLOPT_SSL_SESSIONID_CACHE },
        { "SSL_VERIFYHOST", CURLOPT_SSL_VERIFYHOST },
        { "SSL_VERIFYPEER", CURLOPT_SSL_VERIFYPEER },

    #if NODE_LIBCURL_VER_GE( 7, 41, 0 )
        { "SSL_VERIFYSTATUS", CURLOPT_SSL_VERIFYSTATUS },
    #endif

        { "SSLVERSION", CURLOPT_SSLVERSION },

    #if NODE_LIBCURL_VER_GE( 7, 25, 0 )
        { "TCP_KEEPALIVE", CURLOPT_TCP_KEEPALIVE },
        { "TCP_KEEPIDLE", CURLOPT_TCP_KEEPIDLE },
        { "TCP_KEEPINTVL", CURLOPT_TCP_KEEPINTVL },
    #endif

        { "TCP_NODELAY", CURLOPT_TCP_NODELAY },

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "TFTP_BLKSIZE", CURLOPT_TFTP_BLKSIZE },
    #endif

        { "TIMECONDITION", CURLOPT_TIMECONDITION },
        { "TIMEOUT", CURLOPT_TIMEOUT },
        { "TIMEOUT_MS", CURLOPT_TIMEOUT_MS },
        { "TIMEVALUE", CURLOPT_TIMEVALUE },
        { "TRANSFERTEXT", CURLOPT_TRANSFERTEXT },

    #if NODE_LIBCURL_VER_GE( 7, 21, 6 )
        { "TRANSFER_ENCODING", CURLOPT_TRANSFER_ENCODING },
    #endif

        { "UNRESTRICTED_AUTH", CURLOPT_UNRESTRICTED_AUTH },
        { "UPLOAD", CURLOPT_UPLOAD },
        { "USE_SSL", CURLOPT_USE_SSL },
        { "VERBOSE", CURLOPT_VERBOSE },

    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "WILDCARDMATCH", CURLOPT_WILDCARDMATCH },
    #endif

        // _LARGE options
        { "INFILESIZE_LARGE", CURLOPT_INFILESIZE_LARGE },
        { "MAXFILESIZE_LARGE", CURLOPT_MAXFILESIZE_LARGE },
        { "MAX_RECV_SPEED_LARGE", CURLOPT_MAX_RECV_SPEED_LARGE },
        { "MAX_SEND_SPEED_LARGE", CURLOPT_MAX_SEND_SPEED_LARGE },
        { "POSTFIELDSIZE_LARGE", CURLOPT_POSTFIELDSIZE_LARGE },
        { "RESUME_FROM_LARGE", CURLOPT_RESUME_FROM_LARGE }
    };

    const std::vector<CurlConstant> curlOptionString = {
    #if NODE_LIBCURL_VER_GE( 7, 21, 6 )
        { "ACCEPT_ENCODING", CURLOPT_ACCEPT_ENCODING },
    #endif

        { "CAINFO", CURLOPT_CAINFO },
        { "CAPATH", CURLOPT_CAPATH },
        { "COOKIE", CURLOPT_COOKIE },
        { "COOKIEFILE", CURLOPT_COOKIEFILE },
        { "COOKIEJAR", CURLOPT_COOKIEJAR },
        { "COOKIELIST", CURLOPT_COOKIELIST },

    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "CRLFILE", CURLOPT_CRLFILE },
    #endif

        { "CUSTOMREQUEST", CURLOPT_CUSTOMREQUEST },

    #if NODE_LIBCURL_VER_GE( 7, 45, 0 )
        { "DEFAULT_PROTOCOL", CURLOPT_DEFAULT_PROTOCOL },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 33, 0 )
        { "DNS_INTERFACE", CURLOPT_DNS_INTERFACE },
        { "DNS_LOCAL_IP4", CURLOPT_DNS_LOCAL_IP4 },
        { "DNS_LOCAL_IP6", CURLOPT_DNS_LOCAL_IP6 },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 24, 0 )
        { "DNS_SERVERS", CURLOPT_DNS_SERVERS },
    #endif

        { "EGDSOCKET", CURLOPT_EGDSOCKET },
        { "ENCODING", CURLOPT_ENCODING }, //should use ACCEPT_ENCODING
        { "FTPPORT", CURLOPT_FTPPORT },
        { "FTP_ACCOUNT", CURLOPT_FTP_ACCOUNT },
        { "FTP_ALTERNATIVE_TO_USER", CURLOPT_FTP_ALTERNATIVE_TO_USER },
        { "HTTP200ALIASES", CURLOPT_HTTP200ALIASES },
        { "INTERFACE", CURLOPT_INTERFACE },

    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "ISSUERCERT", CURLOPT_ISSUERCERT },
    #endif

        { "KEYPASSWD", CURLOPT_KEYPASSWD },
        { "KRBLEVEL", CURLOPT_KRBLEVEL },

    #if NODE_LIBCURL_VER_GE( 7, 34, 0 )
        { "LOGIN_OPTIONS", CURLOPT_LOGIN_OPTIONS },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 25, 0 )
        { "MAIL_AUTH", CURLOPT_MAIL_AUTH },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "MAIL_FROM", CURLOPT_MAIL_FROM },
        { "MAIL_RCPT", CURLOPT_MAIL_RCPT },
    #endif

        { "NETRC_FILE", CURLOPT_NETRC_FILE },

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "NOPROXY", CURLOPT_NOPROXY },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 19, 1 )
        { "PASSWORD", CURLOPT_PASSWORD },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 39, 0 )
        { "PINNEDPUBLICKEY", CURLOPT_PINNEDPUBLICKEY },
    #endif

        { "POSTFIELDS", CURLOPT_POSTFIELDS },
        { "POSTQUOTE", CURLOPT_POSTQUOTE },
        { "PREQUOTE", CURLOPT_PREQUOTE },
        { "PROXY", CURLOPT_PROXY },

    #if NODE_LIBCURL_VER_GE( 7, 19, 1 )
        { "PROXYPASSWORD", CURLOPT_PROXYPASSWORD },
        { "PROXYUSERNAME", CURLOPT_PROXYUSERNAME },
    #endif

        { "PROXYUSERPWD", CURLOPT_PROXYUSERPWD },

    #if NODE_LIBCURL_VER_GE( 7, 43, 0 )
        { "PROXY_SERVICE_NAME", CURLOPT_PROXY_SERVICE_NAME },
    #endif

        { "QUOTE", CURLOPT_QUOTE },
        { "RANDOM_FILE", CURLOPT_RANDOM_FILE },
        { "RANGE", CURLOPT_RANGE },
        { "REFERER", CURLOPT_REFERER },

    #if NODE_LIBCURL_VER_GE( 7, 21, 3 )
        { "RESOLVE", CURLOPT_RESOLVE },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "RTSP_SESSION_ID", CURLOPT_RTSP_SESSION_ID },
        { "RTSP_STREAM_URI", CURLOPT_RTSP_STREAM_URI },
        { "RTSP_TRANSPORT", CURLOPT_RTSP_TRANSPORT },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 43, 0 )
        { "SERVICE_NAME", CURLOPT_SERVICE_NAME },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "SOCKS5_GSSAPI_SERVICE", CURLOPT_SOCKS5_GSSAPI_SERVICE },
    #endif

        { "SSH_HOST_PUBLIC_KEY_MD5", CURLOPT_SSH_HOST_PUBLIC_KEY_MD5 },

    #if NODE_LIBCURL_VER_GE( 7, 19, 6 )
        { "SSH_KNOWNHOSTS", CURLOPT_SSH_KNOWNHOSTS },
    #endif

        { "SSH_PRIVATE_KEYFILE", CURLOPT_SSH_PRIVATE_KEYFILE },
        { "SSH_PUBLIC_KEYFILE", CURLOPT_SSH_PUBLIC_KEYFILE },
        { "SSLCERT", CURLOPT_SSLCERT },
        { "SSLCERTTYPE", CURLOPT_SSLCERTTYPE },
        { "SSLENGINE", CURLOPT_SSLENGINE },
        { "SSLKEY", CURLOPT_SSLKEY },
        { "SSLKEYTYPE", CURLOPT_SSLKEYTYPE },
        { "SSL_CIPHER_LIST", CURLOPT_SSL_CIPHER_LIST },
        { "TELNETOPTIONS", CURLOPT_TELNETOPTIONS },

    #if NODE_LIBCURL_VER_GE( 7, 21, 4 )
        { "TLSAUTH_PASSWORD", CURLOPT_TLSAUTH_PASSWORD },
        { "TLSAUTH_TYPE", CURLOPT_TLSAUTH_TYPE },
        { "TLSAUTH_USERNAME", CURLOPT_TLSAUTH_USERNAME },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 40, 0 )
        { "UNIX_SOCKET_PATH", CURLOPT_UNIX_SOCKET_PATH },
    #endif

        { "URL", CURLOPT_URL },
        { "USERAGENT", CURLOPT_USERAGENT },

    #if NODE_LIBCURL_VER_GE( 7, 19, 1 )
        { "USERNAME", CURLOPT_USERNAME },
    #endif

        { "USERPWD", CURLOPT_USERPWD },

    #if NODE_LIBCURL_VER_GE( 7, 33, 0 )
        { "XOAUTH2_BEARER", CURLOPT_XOAUTH2_BEARER },
    #endif
    };

    const std::vector<CurlConstant> curlOptionFunction = {
    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "CHUNK_BGN_FUNCTION", CURLOPT_CHUNK_BGN_FUNCTION },
        { "CHUNK_END_FUNCTION", CURLOPT_CHUNK_END_FUNCTION },
        { "FNMATCH_FUNCTION", CURLOPT_FNMATCH_FUNCTION },
    #endif

        { "DEBUGFUNCTION", CURLOPT_DEBUGFUNCTION },
        { "HEADERFUNCTION", CURLOPT_HEADERFUNCTION },
        { "PROGRESSFUNCTION", CURLOPT_PROGRESSFUNCTION },
        { "READFUNCTION", CURLOPT_READFUNCTION },

    #if NODE_LIBCURL_VER_GE( 7, 32, 0 )
        { "XFERINFOFUNCTION", CURLOPT_XFERINFOFUNCTION },
    #endif

        { "WRITEFUNCTION", CURLOPT_WRITEFUNCTION },
    };

    const std::vector<CurlConstant> curlOptionLinkedList = {
        { "HTTP200ALIASES", CURLOPT_HTTP200ALIASES },
        { "HTTPHEADER", CURLOPT_HTTPHEADER },
        { "HTTPPOST", CURLOPT_HTTPPOST },

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "MAIL_RCPT", CURLOPT_MAIL_RCPT },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 37, 0 )
        { "PROXYHEADER", CURLOPT_PROXYHEADER },
    #endif

        { "POSTQUOTE", CURLOPT_POSTQUOTE },
        { "PREQUOTE", CURLOPT_PREQUOTE },
        { "QUOTE", CURLOPT_QUOTE },

    #if NODE_LIBCURL_VER_GE( 7, 21, 3 )
        { "RESOLVE", CURLOPT_RESOLVE },
    #endif

        { "TELNETOPTIONS", CURLOPT_TELNETOPTIONS },
    };

    const std::vector<CurlConstant> curlOptionHttpPost = {
        { "NAME", CurlHttpPost::NAME },
        { "FILE", CurlHttpPost::FILE },
        { "CONTENTS", CurlHttpPost::CONTENTS },
        { "TYPE", CurlHttpPost::TYPE },
        { "FILENAME", CurlHttpPost::FILENAME },
    };

    const std::vector<CurlConstant> curlOptionSpecific = {
        { "SHARE", CURLOPT_SHARE }
    };
    const std::vector<CurlConstant> curlMultiOptionNotImplemented = {
        // Used internally.
        { "SOCKETFUNCTION", CURLMOPT_SOCKETFUNCTION },
        { "SOCKETDATA", CURLMOPT_SOCKETDATA },
        { "TIMERFUNCTION", CURLMOPT_TIMERFUNCTION },
        { "TIMERDATA", CURLMOPT_TIMERDATA },

        // Maybe?
    #if NODE_LIBCURL_VER_GE( 7, 44, 0 )
        { "PUSHFUNCTION", CURLMOPT_PUSHFUNCTION },
        { "PUSHDATA", CURLMOPT_PUSHDATA },
    #endif
    };

    const std::vector<CurlConstant> curlMultiOptionInteger = {
    #if NODE_LIBCURL_VER_GE( 7, 30, 0 )
        { "CHUNK_LENGTH_PENALTY_SIZE", CURLMOPT_CHUNK_LENGTH_PENALTY_SIZE },
        { "CONTENT_LENGTH_PENALTY_SIZE", CURLMOPT_CONTENT_LENGTH_PENALTY_SIZE },
        { "MAX_HOST_CONNECTIONS", CURLMOPT_MAX_HOST_CONNECTIONS },
        { "MAX_PIPELINE_LENGTH", CURLMOPT_MAX_PIPELINE_LENGTH },
        { "MAX_TOTAL_CONNECTIONS", CURLMOPT_MAX_TOTAL_CONNECTIONS },
    #endif
        { "MAXCONNECTS", CURLMOPT_MAXCONNECTS },
        { "PIPELINING", CURLMOPT_PIPELINING }, //@todo add consts http://curl.haxx.se/libcurl/c/CURLMOPT_PIPELINING.html
    };

    const std::vector<CurlConstant> curlMultiOptionStringArray = {
    #if NODE_LIBCURL_VER_GE( 7, 30, 0 )
        { "PIPELINING_SERVER_BL", CURLMOPT_PIPELINING_SERVER_BL },
        { "PIPELINING_SITE_BL", CURLMOPT_PIPELINING_SITE_BL },
    #endif
    };

    const std::vector<CurlConstant> curlInfoNotImplemented = {
        // Complex.
    #if NODE_LIBCURL_VER_GE( 7, 34, 0 )
        { "TLS_SESSION", CURLINFO_TLS_SESSION },
    #endif
    #if NODE_LIBCURL_VER_GE( 7, 48, 0 )
        { "TLS_SSL_PTR", CURLINFO_TLS_SSL_PTR },
    #endif
        // Unecessary.
        { "PRIVATE", CURLINFO_PRIVATE },
        // Maybe
    #if NODE_LIBCURL_VER_GE( 7, 19, 1 )
        { "CERTINFO", CURLINFO_CERTINFO },
    #endif
    };

    const std::vector<CurlConstant> curlInfoString = {
        { "CONTENT_TYPE", CURLINFO_CONTENT_TYPE },
        { "EFFECTIVE_URL", CURLINFO_EFFECTIVE_URL },
        { "FTP_ENTRY_PATH", CURLINFO_FTP_ENTRY_PATH },

    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "LOCAL_IP", CURLINFO_LOCAL_IP },
    #endif

    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "PRIMARY_IP", CURLINFO_PRIMARY_IP },
    #endif

        { "REDIRECT_URL", CURLINFO_REDIRECT_URL },

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "RTSP_SESSION_ID", CURLINFO_RTSP_SESSION_ID },
    #endif
    };
    const std::vector<CurlConstant> curlInfoDouble = {
    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "APPCONNECT_TIME", CURLINFO_APPCONNECT_TIME },
    #endif
        { "CONNECT_TIME", CURLINFO_CONNECT_TIME },
        { "CONTENT_LENGTH_DOWNLOAD", CURLINFO_CONTENT_LENGTH_DOWNLOAD },
        { "CONTENT_LENGTH_UPLOAD", CURLINFO_CONTENT_LENGTH_UPLOAD },
        { "NAMELOOKUP_TIME", CURLINFO_NAMELOOKUP_TIME },
        { "PRETRANSFER_TIME", CURLINFO_PRETRANSFER_TIME },
        { "REDIRECT_TIME", CURLINFO_REDIRECT_TIME },
        { "SIZE_DOWNLOAD", CURLINFO_SIZE_DOWNLOAD },
        { "SIZE_UPLOAD", CURLINFO_SIZE_UPLOAD },
        { "SPEED_DOWNLOAD", CURLINFO_SPEED_DOWNLOAD },
        { "SPEED_UPLOAD", CURLINFO_SPEED_UPLOAD },
        { "STARTTRANSFER_TIME", CURLINFO_STARTTRANSFER_TIME },
        { "TOTAL_TIME", CURLINFO_TOTAL_TIME },
    };

    const std::vector<CurlConstant> curlInfoInteger = {

    #if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        { "CONDITION_UNMET", CURLINFO_CONDITION_UNMET },
    #endif

        { "FILETIME", CURLINFO_FILETIME },
        { "HEADER_SIZE", CURLINFO_HEADER_SIZE },
        { "HTTPAUTH_AVAIL", CURLINFO_HTTPAUTH_AVAIL },
        { "HTTP_CONNECTCODE", CURLINFO_HTTP_CONNECTCODE },
        { "LASTSOCKET", CURLINFO_LASTSOCKET }, //deprecated since 7.45.0

    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "LOCAL_PORT", CURLINFO_LOCAL_PORT },
    #endif

        { "NUM_CONNECTS", CURLINFO_NUM_CONNECTS },
        { "OS_ERRNO", CURLINFO_OS_ERRNO },

    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "PRIMARY_PORT", CURLINFO_PRIMARY_PORT },
    #endif

        { "PROXYAUTH_AVAIL", CURLINFO_PROXYAUTH_AVAIL },
        { "REDIRECT_COUNT", CURLINFO_REDIRECT_COUNT },
        { "REQUEST_SIZE", CURLINFO_REQUEST_SIZE },
        { "RESPONSE_CODE", CURLINFO_RESPONSE_CODE },

    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "RTSP_CLIENT_CSEQ", CURLINFO_RTSP_CLIENT_CSEQ },
        { "RTSP_CSEQ_RECV", CURLINFO_RTSP_CSEQ_RECV },
        { "RTSP_SERVER_CSEQ", CURLINFO_RTSP_SERVER_CSEQ },
    #endif

        { "SSL_VERIFYRESULT", CURLINFO_SSL_VERIFYRESULT },
    };

    const std::vector<CurlConstant> curlInfoSocket = {
    #if NODE_LIBCURL_VER_GE( 7, 45, 0 )
        { "ACTIVESOCKET", CURLINFO_ACTIVESOCKET },
    #endif
    };

    const std::vector<CurlConstant> curlInfoLinkedList = {
        { "SSL_ENGINES", CURLINFO_SSL_ENGINES },
        { "COOKIELIST", CURLINFO_COOKIELIST },
    };

    const std::vector<CurlConstant> curlCode = {
    #if NODE_LIBCURL_VER_GE( 7, 32, 1 )
        { "CURLM_ADDED_ALREADY", CURLM_ADDED_ALREADY },
    #endif
        { "CURLM_BAD_EASY_HANDLE", CURLM_BAD_EASY_HANDLE },
        { "CURLM_BAD_HANDLE", CURLM_BAD_HANDLE },
        { "CURLM_BAD_SOCKET", CURLM_BAD_SOCKET },
        { "CURLM_INTERNAL_ERROR", CURLM_INTERNAL_ERROR },
        { "CURLM_OK", CURLM_OK },
        { "CURLM_OUT_OF_MEMORY", CURLM_OUT_OF_MEMORY },
        { "CURLM_UNKNOWN_OPTION", CURLM_UNKNOWN_OPTION },
        { "CURLE_ABORTED_BY_CALLBACK", CURLE_ABORTED_BY_CALLBACK },
    #if NODE_LIBCURL_VER_GE( 7, 18, 2 )
        { "CURLE_AGAIN", CURLE_AGAIN },
    #endif
        { "CURLE_ALREADY_COMPLETE", CURLE_ALREADY_COMPLETE },
        { "CURLE_BAD_CALLING_ORDER", CURLE_BAD_CALLING_ORDER },
        { "CURLE_BAD_CONTENT_ENCODING", CURLE_BAD_CONTENT_ENCODING },
        { "CURLE_BAD_DOWNLOAD_RESUME", CURLE_BAD_DOWNLOAD_RESUME },
        { "CURLE_BAD_FUNCTION_ARGUMENT", CURLE_BAD_FUNCTION_ARGUMENT },
        { "CURLE_BAD_PASSWORD_ENTERED", CURLE_BAD_PASSWORD_ENTERED },
    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "CURLE_CHUNK_FAILED", CURLE_CHUNK_FAILED },
    #endif
        { "CURLE_CONV_FAILED", CURLE_CONV_FAILED },
        { "CURLE_CONV_REQD", CURLE_CONV_REQD },
        { "CURLE_COULDNT_CONNECT", CURLE_COULDNT_CONNECT },
        { "CURLE_COULDNT_RESOLVE_HOST", CURLE_COULDNT_RESOLVE_HOST },
        { "CURLE_COULDNT_RESOLVE_PROXY", CURLE_COULDNT_RESOLVE_PROXY },
        { "CURLE_FAILED_INIT", CURLE_FAILED_INIT },
        { "CURLE_FILESIZE_EXCEEDED", CURLE_FILESIZE_EXCEEDED },
        { "CURLE_FILE_COULDNT_READ_FILE", CURLE_FILE_COULDNT_READ_FILE },
    #if NODE_LIBCURL_VER_GE( 7, 24, 0 )
        { "CURLE_FTP_ACCEPT_FAILED", CURLE_FTP_ACCEPT_FAILED },
        { "CURLE_FTP_ACCEPT_TIMEOUT", CURLE_FTP_ACCEPT_TIMEOUT },
    #endif
        { "CURLE_FTP_ACCESS_DENIED", CURLE_FTP_ACCESS_DENIED },
        { "CURLE_FTP_BAD_DOWNLOAD_RESUME", CURLE_FTP_BAD_DOWNLOAD_RESUME },
    #if NODE_LIBCURL_VER_GE( 7, 21, 0 )
        { "CURLE_FTP_BAD_FILE_LIST", CURLE_FTP_BAD_FILE_LIST },
    #endif
        { "CURLE_FTP_CANT_GET_HOST", CURLE_FTP_CANT_GET_HOST },
        { "CURLE_FTP_CANT_RECONNECT", CURLE_FTP_CANT_RECONNECT },
        { "CURLE_FTP_COULDNT_GET_SIZE", CURLE_FTP_COULDNT_GET_SIZE },
        { "CURLE_FTP_COULDNT_RETR_FILE", CURLE_FTP_COULDNT_RETR_FILE },
        { "CURLE_FTP_COULDNT_SET_ASCII", CURLE_FTP_COULDNT_SET_ASCII },
        { "CURLE_FTP_COULDNT_SET_BINARY", CURLE_FTP_COULDNT_SET_BINARY },
        { "CURLE_FTP_COULDNT_SET_TYPE", CURLE_FTP_COULDNT_SET_TYPE },
        { "CURLE_FTP_COULDNT_STOR_FILE", CURLE_FTP_COULDNT_STOR_FILE },
        { "CURLE_FTP_COULDNT_USE_REST", CURLE_FTP_COULDNT_USE_REST },
        { "CURLE_FTP_PARTIAL_FILE", CURLE_FTP_PARTIAL_FILE },
        { "CURLE_FTP_PORT_FAILED", CURLE_FTP_PORT_FAILED },
    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "CURLE_FTP_PRET_FAILED", CURLE_FTP_PRET_FAILED },
    #endif
        { "CURLE_FTP_QUOTE_ERROR", CURLE_FTP_QUOTE_ERROR },
        { "CURLE_FTP_SSL_FAILED", CURLE_FTP_SSL_FAILED },
        { "CURLE_FTP_USER_PASSWORD_INCORRECT", CURLE_FTP_USER_PASSWORD_INCORRECT },
        { "CURLE_FTP_WEIRD_227_FORMAT", CURLE_FTP_WEIRD_227_FORMAT },
        { "CURLE_FTP_WEIRD_PASS_REPLY", CURLE_FTP_WEIRD_PASS_REPLY },
        { "CURLE_FTP_WEIRD_PASV_REPLY", CURLE_FTP_WEIRD_PASV_REPLY },
        { "CURLE_FTP_WEIRD_SERVER_REPLY", CURLE_FTP_WEIRD_SERVER_REPLY },
        { "CURLE_FTP_WEIRD_USER_REPLY", CURLE_FTP_WEIRD_USER_REPLY },
        { "CURLE_FTP_WRITE_ERROR", CURLE_FTP_WRITE_ERROR },
        { "CURLE_FUNCTION_NOT_FOUND", CURLE_FUNCTION_NOT_FOUND },
        { "CURLE_GOT_NOTHING", CURLE_GOT_NOTHING },
    #if NODE_LIBCURL_VER_GE( 7, 38, 0 )
        { "CURLE_HTTP2", CURLE_HTTP2 },
    #endif
        { "CURLE_HTTP_NOT_FOUND", CURLE_HTTP_NOT_FOUND },
        { "CURLE_HTTP_PORT_FAILED", CURLE_HTTP_PORT_FAILED },
        { "CURLE_HTTP_POST_ERROR", CURLE_HTTP_POST_ERROR },
        { "CURLE_HTTP_RANGE_ERROR", CURLE_HTTP_RANGE_ERROR },
        { "CURLE_HTTP_RETURNED_ERROR", CURLE_HTTP_RETURNED_ERROR },
        { "CURLE_INTERFACE_FAILED", CURLE_INTERFACE_FAILED },
        { "CURLE_LDAP_CANNOT_BIND", CURLE_LDAP_CANNOT_BIND },
        { "CURLE_LDAP_INVALID_URL", CURLE_LDAP_INVALID_URL },
        { "CURLE_LDAP_SEARCH_FAILED", CURLE_LDAP_SEARCH_FAILED },
        { "CURLE_LIBRARY_NOT_FOUND", CURLE_LIBRARY_NOT_FOUND },
        { "CURLE_LOGIN_DENIED", CURLE_LOGIN_DENIED },
        { "CURLE_MALFORMAT_USER", CURLE_MALFORMAT_USER },
    #if NODE_LIBCURL_VER_GE( 7, 21, 5 )
        { "CURLE_NOT_BUILT_IN", CURLE_NOT_BUILT_IN },
    #endif
    #if NODE_LIBCURL_VER_GE( 7, 30, 0 )
        { "CURLE_NO_CONNECTION_AVAILABLE", CURLE_NO_CONNECTION_AVAILABLE },
    #endif
        { "CURLE_OK", CURLE_OK },
        { "CURLE_OPERATION_TIMEDOUT", CURLE_OPERATION_TIMEDOUT },
        { "CURLE_OPERATION_TIMEOUTED", CURLE_OPERATION_TIMEOUTED },
        { "CURLE_OUT_OF_MEMORY", CURLE_OUT_OF_MEMORY },
        { "CURLE_PARTIAL_FILE", CURLE_PARTIAL_FILE },
        { "CURLE_PEER_FAILED_VERIFICATION", CURLE_PEER_FAILED_VERIFICATION },
        { "CURLE_QUOTE_ERROR", CURLE_QUOTE_ERROR },
        { "CURLE_RANGE_ERROR", CURLE_RANGE_ERROR },
        { "CURLE_READ_ERROR", CURLE_READ_ERROR },
        { "CURLE_RECV_ERROR", CURLE_RECV_ERROR },
        { "CURLE_REMOTE_ACCESS_DENIED", CURLE_REMOTE_ACCESS_DENIED },
        { "CURLE_REMOTE_DISK_FULL", CURLE_REMOTE_DISK_FULL },
        { "CURLE_REMOTE_FILE_EXISTS", CURLE_REMOTE_FILE_EXISTS },
        { "CURLE_REMOTE_FILE_NOT_FOUND", CURLE_REMOTE_FILE_NOT_FOUND },
    #if NODE_LIBCURL_VER_GE( 7, 20, 0 )
        { "CURLE_RTSP_CSEQ_ERROR", CURLE_RTSP_CSEQ_ERROR },
        { "CURLE_RTSP_SESSION_ERROR", CURLE_RTSP_SESSION_ERROR },
    #endif
        { "CURLE_SEND_ERROR", CURLE_SEND_ERROR },
        { "CURLE_SEND_FAIL_REWIND", CURLE_SEND_FAIL_REWIND },
        { "CURLE_SHARE_IN_USE", CURLE_SHARE_IN_USE },
        { "CURLE_SSH", CURLE_SSH },
        { "CURLE_SSL_CACERT", CURLE_SSL_CACERT },
        { "CURLE_SSL_CACERT_BADFILE", CURLE_SSL_CACERT_BADFILE },
        { "CURLE_SSL_CERTPROBLEM", CURLE_SSL_CERTPROBLEM },
        { "CURLE_SSL_CIPHER", CURLE_SSL_CIPHER },
        { "CURLE_SSL_CONNECT_ERROR", CURLE_SSL_CONNECT_ERROR },
    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "CURLE_SSL_CRL_BADFILE", CURLE_SSL_CRL_BADFILE },
    #endif
        { "CURLE_SSL_ENGINE_INITFAILED", CURLE_SSL_ENGINE_INITFAILED },
        { "CURLE_SSL_ENGINE_NOTFOUND", CURLE_SSL_ENGINE_NOTFOUND },
        { "CURLE_SSL_ENGINE_SETFAILED", CURLE_SSL_ENGINE_SETFAILED },
    #if NODE_LIBCURL_VER_GE( 7, 41, 0 )
        { "CURLE_SSL_INVALIDCERTSTATUS", CURLE_SSL_INVALIDCERTSTATUS },
    #endif
    #if NODE_LIBCURL_VER_GE( 7, 19, 0 )
        { "CURLE_SSL_ISSUER_ERROR", CURLE_SSL_ISSUER_ERROR },
    #endif
        { "CURLE_SSL_PEER_CERTIFICATE", CURLE_SSL_PEER_CERTIFICATE },

    #if NODE_LIBCURL_VER_GE( 7, 39, 0 )
        { "CURLE_SSL_PINNEDPUBKEYNOTMATCH", CURLE_SSL_PINNEDPUBKEYNOTMATCH },
    #endif

        { "CURLE_SSL_SHUTDOWN_FAILED", CURLE_SSL_SHUTDOWN_FAILED },
        { "CURLE_TELNET_OPTION_SYNTAX", CURLE_TELNET_OPTION_SYNTAX },
        { "CURLE_TFTP_DISKFULL", CURLE_TFTP_DISKFULL },
        { "CURLE_TFTP_EXISTS", CURLE_TFTP_EXISTS },
        { "CURLE_TFTP_ILLEGAL", CURLE_TFTP_ILLEGAL },
        { "CURLE_TFTP_NOSUCHUSER", CURLE_TFTP_NOSUCHUSER },
        { "CURLE_TFTP_NOTFOUND", CURLE_TFTP_NOTFOUND },
        { "CURLE_TFTP_PERM", CURLE_TFTP_PERM },
        { "CURLE_TFTP_UNKNOWNID", CURLE_TFTP_UNKNOWNID },
        { "CURLE_TOO_MANY_REDIRECTS", CURLE_TOO_MANY_REDIRECTS },

    #if NODE_LIBCURL_VER_GE( 7, 21, 5 )
        { "CURLE_UNKNOWN_OPTION", CURLE_UNKNOWN_OPTION },
    #endif

        { "CURLE_UNKNOWN_TELNET_OPTION", CURLE_UNKNOWN_TELNET_OPTION },
        { "CURLE_UNSUPPORTED_PROTOCOL", CURLE_UNSUPPORTED_PROTOCOL },
        { "CURLE_UPLOAD_FAILED", CURLE_UPLOAD_FAILED },
        { "CURLE_URL_MALFORMAT", CURLE_URL_MALFORMAT },
        { "CURLE_URL_MALFORMAT_USER", CURLE_URL_MALFORMAT_USER },
        { "CURLE_USE_SSL_FAILED", CURLE_USE_SSL_FAILED },
        { "CURLE_WRITE_ERROR", CURLE_WRITE_ERROR },
        { "CURLSHE_BAD_OPTION", CURLSHE_BAD_OPTION },
        { "CURLSHE_INVALID", CURLSHE_INVALID },
        { "CURLSHE_IN_USE", CURLSHE_IN_USE },
        { "CURLSHE_NOMEM", CURLSHE_NOMEM },
    #if NODE_LIBCURL_VER_GE( 7, 23, 0 )
        { "CURLSHE_NOT_BUILT_IN", CURLSHE_NOT_BUILT_IN },
    #endif
        { "CURLSHE_OK", CURLSHE_OK },
    };

    static void ExportConstants( v8::Local<v8::Object> obj, const std::vector<NodeLibcurl::CurlConstant> &optionGroup, v8::PropertyAttribute attributes )
    {
        Nan::HandleScope scope;

        for ( std::vector<NodeLibcurl::CurlConstant>::const_iterator it = optionGroup.begin(), end = optionGroup.end(); it != end; ++it ) {

            obj->ForceSet(
                Nan::New<v8::String>( it->name ).ToLocalChecked(),
                Nan::New<v8::Integer>( static_cast<int32_t>( it->value ) ),
                attributes
            );
        }
    }

    // Add Curl constructor to the module exports
    CURL_MODULE_INIT( Initialize )
    {
        Nan::HandleScope scope;

        v8::Local<v8::Object> obj = Nan::New<v8::Object>();

        v8::PropertyAttribute attributes = static_cast<v8::PropertyAttribute>( v8::ReadOnly | v8::DontDelete );
        v8::PropertyAttribute attributesDontEnum = static_cast<v8::PropertyAttribute>( v8::ReadOnly | v8::DontDelete | v8::DontEnum );

        // export options
        v8::Local<v8::Object> optionsObj = Nan::New<v8::Object>();
        ExportConstants( optionsObj, curlOptionNotImplemented, attributesDontEnum );
        ExportConstants( optionsObj, curlOptionString, attributes );
        ExportConstants( optionsObj, curlOptionInteger, attributes );
        ExportConstants( optionsObj, curlOptionFunction, attributes );
        ExportConstants( optionsObj, curlOptionLinkedList, attributes );
        ExportConstants( optionsObj, curlOptionSpecific, attributes );

        // export infos
        v8::Local<v8::Object> infosObj = Nan::New<v8::Object>();
        ExportConstants( infosObj, curlInfoNotImplemented, attributesDontEnum );
        ExportConstants( infosObj, curlInfoString, attributes );
        ExportConstants( infosObj, curlInfoInteger, attributes );
        ExportConstants( infosObj, curlInfoDouble, attributes );
        ExportConstants( infosObj, curlInfoSocket, attributes );
        ExportConstants( infosObj, curlInfoLinkedList, attributes );

        // export pause consts
        v8::Local<v8::Object> pauseObj = Nan::New<v8::Object>();
        ExportConstants( pauseObj, curlConstPause, attributes );

        // export auth consts
        v8::Local<v8::Object> authObj = Nan::New<v8::Object>();
        ExportConstants( authObj, curlConstAuth, attributes );

        // export HTTP consts
        v8::Local<v8::Object> httpObj = Nan::New<v8::Object>();
        ExportConstants( httpObj, curlConstHttp, attributes );

#if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        // export proto consts
        v8::Local<v8::Object> protocolsObj = Nan::New<v8::Object>();
        ExportConstants( protocolsObj, curlConstProtocol, attributes );
#endif

#if NODE_LIBCURL_VER_GE( 7, 37, 0 )
        //export header consts
        v8::Local<v8::Object> headerObj = Nan::New<v8::Object>();
        ExportConstants( headerObj, curlConstHeader, attributes );
#endif
        // export Curl codes
        v8::Local<v8::Object> multiObj = Nan::New<v8::Object>();
        ExportConstants( multiObj, curlMultiOptionNotImplemented, attributesDontEnum );
        ExportConstants( multiObj, curlMultiOptionInteger, attributes );
        ExportConstants( multiObj, curlMultiOptionStringArray, attributes );

        // export Curl codes
        v8::Local<v8::Object> codesObj = Nan::New<v8::Object>();
        ExportConstants( codesObj, curlCode, attributes );

        // static members
        Nan::ForceSet( obj, Nan::New<v8::String>( "option" ).ToLocalChecked(), optionsObj, attributes );
        Nan::ForceSet( obj, Nan::New<v8::String>( "info" ).ToLocalChecked(), infosObj, attributes );

        // add WRITEFUNC to the pause obj
        Nan::ForceSet( pauseObj, Nan::New<v8::String>( "WRITEFUNC" ).ToLocalChecked(), Nan::New<v8::Uint32>( CURL_WRITEFUNC_PAUSE ), attributes );
        Nan::ForceSet( obj, Nan::New<v8::String>( "pause" ).ToLocalChecked(), pauseObj, attributes );

        Nan::ForceSet( obj, Nan::New<v8::String>( "auth" ).ToLocalChecked(), authObj, attributes );
        Nan::ForceSet( obj, Nan::New<v8::String>( "http" ).ToLocalChecked(), httpObj, attributes );

#if NODE_LIBCURL_VER_GE( 7, 19, 4 )
        Nan::ForceSet( obj, Nan::New<v8::String>( "protocol" ).ToLocalChecked(), protocolsObj, attributes );
#endif

#if NODE_LIBCURL_VER_GE( 7, 37, 0 )
        Nan::ForceSet( obj, Nan::New<v8::String>( "header" ).ToLocalChecked(), headerObj, attributes );
#endif

        Nan::ForceSet( obj, Nan::New<v8::String>( "multi" ).ToLocalChecked(), multiObj, attributes );

        Nan::ForceSet( obj, Nan::New<v8::String>( "code" ).ToLocalChecked(), codesObj, attributes );

        Nan::SetMethod( obj, "getVersion", GetVersion );
        Nan::SetMethod( obj, "getCount",   GetCount );
        Nan::SetAccessor( obj, Nan::New( "VERSION_NUM" ).ToLocalChecked(), GetterVersionNum, 0, v8::Local<v8::Value>(), v8::DEFAULT, attributes );

        Nan::Set( exports, Nan::New( "Curl" ).ToLocalChecked(), obj );
    }

    int32_t IsInsideCurlConstantStruct( const std::vector<CurlConstant> &curlConstants, const v8::Local<v8::Value> &searchFor )
    {
        Nan::HandleScope scope;

        bool isString = searchFor->IsString();
        bool isInt = searchFor->IsInt32();

        std::string optionName = "";
        int32_t optionId = -1;

        if ( !isString && !isInt ) {
            return 0;
        }

        if ( isString ) {

            Nan::Utf8String optionNameV8( searchFor );

            optionName = std::string( *optionNameV8 );

            stringToUpper( optionName );

        }
        else { //int

            optionId = searchFor->ToInteger()->Int32Value();

        }

        for ( std::vector<CurlConstant>::const_iterator it = curlConstants.begin(), end = curlConstants.end(); it != end; ++it ) {

            if ( ( isString && it->name == optionName ) || ( isInt && it->value == optionId ) ) {
                return static_cast<int32_t>( it->value );
            }
        }

        return 0;
    }

    // Create an Exception with the given message and reason
    void ThrowError( const char *message, const char *reason )
    {
        const char *what = message;
        std::string msg;

        if ( reason ) {

            msg = string_format( "%s: %s", message, reason );
            what = msg.c_str();
        }

        Nan::ThrowError( what );
    }

    // Return human readable string with the version number of libcurl and some of its important components (like OpenSSL version).
    NAN_METHOD( GetVersion )
    {
        Nan::HandleScope scope;

        const char *version = curl_version();

        v8::Local<v8::Value> versionObj = Nan::New<v8::String>( version ).ToLocalChecked();

        info.GetReturnValue().Set( versionObj );
    }

    NAN_METHOD( GetCount )
    {
        Nan::HandleScope scope;

        info.GetReturnValue().Set( Easy::currentOpenedHandles );
    }

    // Return hexdecimal representation of the libcurl version.
    NAN_GETTER( GetterVersionNum )
    {
        Nan::HandleScope scope;

        v8::Local<v8::Int32> version = Nan::New( LIBCURL_VERSION_NUM );

        info.GetReturnValue().Set( version );
    }

}
