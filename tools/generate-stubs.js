var fs = require( 'fs' ),
    path = require( 'path' ),
    util = require( 'util' );

var files = [
    process.env.NODE_CURL_INCLUDE_PATH ? path.join( process.env.NODE_CURL_INCLUDE_PATH, 'curl', 'curl.h' ) : '',
    '/usr/local/include/curl/curl.h',
    '/usr/include/curl/curl.h',
    '/usr/include/curl/curl.h'
];

var optionsToIgnore = [
    //Options that are too complicated / unnecessary to expose from js.
    //From js, there is no need for options related to pass data around between function calls.
    'PROGRESSDATA',
    'XFERINFODATA',
    'DEBUGDATA',
    'PRIVATE',
    'WRITEFUNCTION', 'FILE', //WRITEDATA
    'READFUNCTION', 'INFILE', //READDATA
    'IOCTLFUNCTION', 'IOCTLDATA',
    'SEEKFUNCTION', 'SEEKDATA',
    'SOCKOPTFUNCTION', 'SOCKOPTDATA',
    'OPENSOCKETFUNCTION', 'OPENSOCKETDATA',
    'CLOSESOCKETFUNCTION', 'CLOSESOCKETDATA',
    'HEADERFUNCTION', 'WRITEHEADER', //HEADERDATA
    'SSL_CTX_FUNCTION', 'SSL_CTX_DATA',
    'CONV_TO_NETWORK_FUNCTION', 'CONV_FROM_NETWORK_FUNCTION', 'CONV_FROM_UTF8_FUNCTION',
    'INTERLEAVEFUNCTION', 'INTERLEAVEDATA',
    'CHUNK_DATA',
    'FNMATCH_DATA',
    'ERRORBUFFER',
    'STDERR',
    'COPYPOSTFIELDS',
    'SHARE', //Share interface is not implemented, and is probably not going to be.
    'SSH_KEYFUNCTION', 'SSH_KEYDATA',
    //Options that are probably going to be implemented, sometime, later.
    //FTP OPTIONS
    'FTPSSLAUTH', //@TODO add missing CURLFTPAUTH constants
    'FTP_SSL_CCC', //@TODO add missing CURLFTPSSL constants
    'FTP_FILEMETHOD', //@TODO add missing CURLFTPMETHOD constants
    //RTSP OPTIONS
    'RTSP_REQUEST', //@TODO add missing CURL_RTSPREQ constants
    //CONNECTION OPTIONS
    'IPRESOLVE', //@TODO add missing CURL_IPRESOLVE constants
    'USE_SSL', //@TODO add missing CURLUSESSL constants
    //SSL and SECURITY OPTIONS
    'SSLVERSION', //@TODO add missing CURL_SSLVERSION constants
    'SSL_OPTIONS', //@TODO add missing CURLSSLOPT constants
    'GSSAPI_DELEGATION', //@TODO add missing CURLGSSAPI_DELEGATION_FLAG constant
    //SSH OPTIONS
    'SSH_AUTH_TYPES', //@TODO add missing CURLSSH_AUTH constants
    'CHUNK_BGN_FUNCTION', 'CHUNK_END_FUNCTION',
    'FNMATCH_FUNCTION'
];

//add path to deps only on Windows
if ( process.platform == 'win32' ) {

    files.push( path.resolve(
        __dirname, '..', 'deps', 'curl-for-windows', 'curl', 'include', 'curl', 'curl.h'
    ) );
}

var curlHeaderFile = '',
    EOL = ( process.platform === 'win32' ? '\r\n' : '\n' );

files.every(function ( file ) {

    if ( fs.existsSync( file ) ) {

        curlHeaderFile = file;
        return false;
    }

    return true;
});

if ( !curlHeaderFile ) {

    console.error( "Cannot find curl's header file." );
    process.exit(1);
}

var currentDate = new Date();

currentDate = currentDate.getDate() + "/"
    + (currentDate.getMonth()+1)  + "/"
    + currentDate.getFullYear() + " @ "
    + currentDate.getHours() + ":"
    + currentDate.getMinutes() + ":"
    + currentDate.getSeconds();

var curlHeaderContent = fs.readFileSync( curlHeaderFile, 'utf8' ),
    jsFilesData = {};

generateFiles( curlHeaderContent, 'curlOptionsInteger', /CINIT\((\w+).*LONG/g, 'OPT', 'option' );
generateFiles( curlHeaderContent, 'curlOptionsString', /CINIT\((\w+).*OBJECT/g, 'OPT', 'option' );
generateFiles( curlHeaderContent, 'curlOptionsFunction', /CINIT\((\w+).*FUNCTION/g, 'OPT', 'option' );

generateFiles( curlHeaderContent, 'curlInfosInteger', /CURLINFO_(\w+).*LONG/g, 'INFO', 'info' );
generateFiles( curlHeaderContent, 'curlInfosString', /CURLINFO_(\w+).*STRING/g, 'INFO', 'info' );
generateFiles( curlHeaderContent, 'curlInfosDouble', /CURLINFO_(\w+).*DOUBLE/g, 'INFO', 'info' );

generateFiles( curlHeaderContent, 'curlProtocols', /CURLPROTO_(\w+)/g, 'PROTO', 'protocol' );
generateFiles( curlHeaderContent, 'curlPause', /CURLPAUSE_(\w+)/g, 'PAUSE', 'pause' );
generateFiles( curlHeaderContent, 'curlAuth', /CURLAUTH_(\w+)/g, 'AUTH', 'auth' );
generateFiles( curlHeaderContent, 'curlHeader', /CURLHEADER_(\w+)/g, 'HEADER', 'header' );
generateFiles( curlHeaderContent, 'curlHttp', /CURL_HTTP_((?!VERSION_LAST)(\w+)),/g, '_HTTP', 'http' );

generateSingleJavascriptFileForEachType();

function generateFiles( scope, fileName, pattern, prefix, jsObject ) {

    var matches = [],
        match;

    while ( match = pattern.exec( scope ) ) {

        if ( optionsToIgnore.indexOf( match[1] ) === -1 )
            matches.push( match[1] );
    }

    matches.sort();

    //filter duplicate values out
    matches = matches.reduce(function( prev, curr ) {

        if ( prev.indexOf( curr ) === -1 )
            prev.push( curr );

        return prev;

    }, [] );

    generateHeaderFile( fileName + '.h', prefix, matches );
    prepareDataForJavascriptFile( jsObject, matches );
}

function generateHeaderFile( fileName, prefix, regexMatches ) {

    var headerSafe = fileName.toUpperCase().replace( '.', '_' ),
        file = path.resolve( __dirname, '..', 'src', 'generated-stubs', fileName ),
        content = [],
        toWrite;

    regexMatches.forEach( function ( item ) {
        content.push( '\t{"' + item + '", CURL' + prefix + '_' + item + '},' );
    });

    toWrite = [
        '// generated by ' + __filename + ' at ' + currentDate,
        '#ifndef ' + headerSafe,
        '#define ' + headerSafe,
        'Curl::CurlOption ' + fileName.split( '.' )[0] + '[] = {',
        content.join( EOL ).slice( 0, -1 ), //remove last comma
        '};',
        '#endif'
    ];

    fs.writeFileSync( file, toWrite.join( EOL ) );

}

function prepareDataForJavascriptFile( jsObject, regexMatches ) {

    if ( !jsFilesData[jsObject] )
        jsFilesData[jsObject] = {};

    regexMatches.forEach( function ( item ) {
        jsFilesData[jsObject][item] = 0;
    });
}

//js files are generated just for code completion.
function generateSingleJavascriptFileForEachType() {

    for ( var fileName in jsFilesData ) {

        var file = path.resolve( __dirname, '..', 'lib', 'generated-stubs', fileName + '.js' ),
            toWrite;

        toWrite = [
            '// generated by ' + __filename + ' at ' + currentDate + EOL,
            'Curl.' + fileName + ' = ' + JSON.stringify( jsFilesData[fileName] ) + ';'
        ];

        fs.writeFileSync( file, toWrite.join( '' ) );
    }

}
