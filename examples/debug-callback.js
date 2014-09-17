var Curl = require( '../lib/Curl' );

var curl = new Curl(),
    url = process.argv[2] || 'http://www.google.com',
    infoTypes = Curl.info.debug,
    EOL = ( process.platform === 'win32' ? '\r\n' : '\n' );

var debugCallback = function( infoType, content ) {

    var text = '';

    switch ( infoType ) {

        case infoTypes.TEXT:
            text = content;
            break;
        case infoTypes.DATA_IN:
            text = '-- RECEIVING DATA: ' + EOL + content;
            break;
        case infoTypes.DATA_OUT:
            text = '-- SENDING DATA: ' + EOL + content;
            break;
        case infoTypes.HEADER_IN:
            text = '-- RECEIVING HEADER: ' + EOL + content;
            break;
        case infoTypes.HEADER_OUT:
            text = '-- SENDING HEADER: ' + EOL + content;
            break;
        case infoTypes.SSL_DATA_IN:
            text = '-- RECEIVING SSL DATA: ' + EOL + content;
            break;
        case infoTypes.SSL_DATA_OUT:
            text = '-- SENDING SSL DATA: ' + EOL + content;
            break;
    }

    console.log( text );

    return 0;
};

curl.setOpt( 'URL', url );
curl.setOpt( 'VERBOSE', true );
curl.setOpt( 'DEBUGFUNCTION', debugCallback );

curl.on( 'end', curl.close.bind( curl ) );
curl.on( 'error', curl.close.bind( curl ) );

curl.perform();
