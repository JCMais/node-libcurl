
#include <openssl/opensslconf.h>
#include <openssl/ssl.h>

void node_libcurl_ssl_ctx_set_legacy_opts(void* sslctx) {
  SSL_CTX_set_options(sslctx, SSL_OP_LEGACY_SERVER_CONNECT);
  SSL_CTX_set_options(sslctx, SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION);
}
