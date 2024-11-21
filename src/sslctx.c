// OpenSSL declarations, to avoid needing to muck with the include path.
#ifndef SSL_OP_LEGACY_SERVER_CONNECT
#define SSL_OP_LEGACY_SERVER_CONNECT 0x00000004U
#endif
#ifndef SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION
#define SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION 0x00040000U
#endif
#ifndef SSL_OP_IGNORE_UNEXPECTED_EOF
#define SSL_OP_IGNORE_UNEXPECTED_EOF 0x00000080U
#endif
typedef struct ssl_ctx_st SSL_CTX;
unsigned long SSL_CTX_set_options(SSL_CTX* ctx, unsigned long op);

void node_libcurl_ssl_ctx_set_legacy_opts(void* sslctx) {
  SSL_CTX_set_options(sslctx, SSL_OP_LEGACY_SERVER_CONNECT);
  SSL_CTX_set_options(sslctx, SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION);
  // potential fix for https://github.com/Kong/insomnia/issues/6554
  SSL_CTX_set_options(sslctx, SSL_OP_IGNORE_UNEXPECTED_EOF);
}
