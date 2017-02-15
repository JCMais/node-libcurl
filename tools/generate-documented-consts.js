var Curl = require( '../lib/Curl' ),
    fs   = require( 'fs' ),
    path = require( 'path' ),
    targetDir = path.resolve( __dirname, '..', 'lib' ),
    fileName = '_generated-docs-conts.js',
    options = Curl.option,
    infos   = Curl.info,
    indentSize = 4,
    indentStr = ' ',
    data = [], optionsArr = [], infosArr = [], result = '';

//http://stackoverflow.com/a/1482209/710693
function isObjLiteral( obj ) {
    var test  = obj;
    return (  typeof obj !== 'object' || obj === null ?
            false :
            (
                ( function () {
                    while ( !false ) {
                        if (  Object.getPrototypeOf( test = Object.getPrototypeOf( test )  ) === null ) {
                            break;
                        }
                    }
                    return Object.getPrototypeOf( obj ) === test;
                })()
            )
    );
}

function objectKeyValueToString( obj, indentation ) {

    var arr = [], item,
        indent = indentStr.repeat( indentation * indentSize );

    for ( item in obj ) {

        if ( obj.hasOwnProperty( item ) ) {

            if ( isObjLiteral( obj[item] ) ) {

                //console.log( objectKeyValueToString( obj[item], indentation+1 ).join( ',\n' ) );
                var objLiteralArr = [];

                objLiteralArr.push( indent + '"' + item + '" : {' );
                objLiteralArr.push( objectKeyValueToString( obj[item], indentation + 1 ).join( ',\n' ) );
                objLiteralArr.push( indent + '}' );

                arr.push( objLiteralArr.join( '\n' ) );

            } else {

                arr.push( indentStr.repeat( indentation * indentSize ) + '"' + item + '" : ' + obj[item] );
            }
        }
    }

    return arr;

}

// options object
data.push( '/**\n * @memberof module:node-libcurl.Curl\n * @enum {Number}\n * @static\n * @readonly\n*/\nvar option = {\n' );
optionsArr = objectKeyValueToString( options, 1 );
data.push( optionsArr.join( ',\n' ) );
data.push( '\n}\n' );

// info object
data.push( '/**\n * @memberof module:node-libcurl.Curl\n * @enum {Number}\n * @static\n * @readonly\n*/\nvar info = {\n' );
infosArr = objectKeyValueToString( infos, 1 );
data.push( infosArr.join( ',\n' ) );
data.push( '\n}' );

result = data.join( '' );

fs.writeFileSync( path.join( targetDir, fileName ), result );

