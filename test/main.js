function importTest( name, path, only, skip ) {

    if ( typeof only == 'undefined' )
        only = false;

    if ( typeof skip == 'undefined' )
        skip = false;

    only = !!only;
    skip = !!skip;

    if ( only ) {

        describe.only( name, function () {
            require( path );
        });

    } else if ( skip ) {

        describe.skip( name, function () {
            require( path );
        });

    } else {

        describe( name, function () {
            require( path );
        });
    }
}

describe( 'Curl', function () {
    importTest( 'Connection timeout', './curl/connection-timeout' );
    importTest( 'setOpt()', './curl/setopt' );
    importTest( 'getInfo()', './curl/getinfo' );
    importTest( 'reset()', './curl/reset' );
    importTest( 'feature()', './curl/feature' );
    importTest( 'events', './curl/events' );
    importTest( 'Post Fields', './curl/postfields' );
    importTest( 'HTTP Auth', './curl/httpauth' );
    importTest( 'HTTP Post', './curl/httppost' );
    importTest( 'Binary Data', './curl/binary-data' );
});
