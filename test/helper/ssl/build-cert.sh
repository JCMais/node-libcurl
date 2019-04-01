pdir=$(dirname "$0")

openssl req -x509 -nodes \
  -days 365 \
  -newkey rsa:2048 \
  -keyout $pdir/cert.key \
  -out $pdir/cert.pem \
  -config $pdir/req.cnf \
  -sha256
