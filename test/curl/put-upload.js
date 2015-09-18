var serverObj = require( './../helper/server' ),
    Curl   = require( '../../lib/Curl' ),
    path = require( 'path' ),
    fs   = require( 'fs' ),
    crypto = require( 'crypto' );

var server = serverObj.server,
    app    = serverObj.app,
    curl   = new Curl(),
    fileSize = 1 * 1024 * 1024, //1MB
    fileName = path.resolve( __dirname, 'upload.test' ),
    fileHash = '',
    uploadLocation = '',
    url = '',
    fd = -1;

function hashOfFile( file, cb ) {

    var fd = fs.createReadStream( file ),
        hash = crypto.createHash( 'sha1' );

    hash.setEncoding( 'hex' );

    fd.on( 'end', function() {

        hash.end();

        cb( hash.read() );
    });

    fd.pipe( hash );
}

beforeEach( function( done ) {

    curl = new Curl();
    curl.setOpt( Curl.option.URL, url + "/upload/upload-result.test" );
    curl.setOpt( Curl.option.HTTPHEADER, ['Content-Type: application/node-libcurl.raw']);

    //write random bytes to a file, this will be our test file.
    fs.writeFileSync( fileName, crypto.randomBytes( fileSize ) );

    //get a hash of given file so we can assert later
    // that the file sent is equals to the one we created.
    hashOfFile( fileName, function( hash ) {

        fileHash = hash;

        fd = fs.openSync( fileName, 'r+' );
        done();
    });
});

afterEach( function() {

    curl.close();

    fs.closeSync( fd );
    fs.unlinkSync( fileName );
    if ( fs.existsSync( uploadLocation ) ) {
        fs.unlinkSync( uploadLocation );
    }
});

before( function( done ) {

    server.listen( serverObj.port, serverObj.host, function() {

        url = server.address().address + ':' + server.address().port;

        done();
    });

    app.put( '/upload/:filename', function( req, res ) {

        uploadLocation = path.resolve( __dirname, req.params['filename'] );

        fs.open( uploadLocation, 'w+', function( err, fd ) {

            fs.write( fd, req.body, 0, req.body.length, 0, function( err, written, buffer ) {

                fs.close( fd, function() {

                    hashOfFile( uploadLocation, function( hash ) {

                        res.send( hash );
                    });
                });
            });

        });
    });

    app.use( function( err, req, res, next ) {
        //do nothing
    });
});

after( function() {

    server.close();

    app._router.stack.pop();
    app._router.stack.pop();
});

it( 'should upload data correctly using put', function ( done ) {

    curl.setOpt( Curl.option.UPLOAD, 1 );
    curl.setOpt( Curl.option.READDATA, fd );

    curl.on( 'end', function( statusCode, body ) {

        statusCode.should.be.equal( 200 );
        body.should.be.equal( fileHash );

        done();
    });

    curl.on( 'error', function( err ) {

        done( err );
    });

    curl.perform();

});

it( 'should abort upload with invalid fd', function ( done ) {

    curl.setOpt( Curl.option.UPLOAD, 1 );
    curl.setOpt( Curl.option.READDATA, -1 );

    curl.on( 'end', function( statusCode, body ) {

        done( new Error( 'Invalid file descriptor specified but upload was performed correctly.' ) );
    });

    curl.on( 'error', function( err, errCode ) {

        //[Error: Operation was aborted by an application callback]
        errCode.should.be.equal( 42 );

        done();
    });

    curl.perform();

});
