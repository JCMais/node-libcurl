var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    cookiesParser = require( 'cookie-parser' ),
    http = require( 'http' );

var app = express(),
    server = http.createServer( app );

app.use( bodyParser() )
    .use( cookiesParser() );

module.exports = {
    server : server,
    app    : app
};
