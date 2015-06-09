var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    cookiesParser = require( 'cookie-parser' ),
    http = require( 'http' );

var app = express(),
    server = http.createServer( app );

app.use( bodyParser.urlencoded({ extended: true }) )
    .use( bodyParser.raw({ type: 'application/node-libcurl.raw' }) )
    .use( cookiesParser() );

app.disable( 'etag' );

module.exports = {
    server : server,
    app    : app,
    port   : 3000,
    host   : 'localhost'
};
