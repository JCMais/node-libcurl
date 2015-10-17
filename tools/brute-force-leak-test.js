var Easy = require( '../lib/Easy' ),
    readline = require( 'readline' );

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var instances = [],
    amount = 1e3,
    iteration = 0,
    handle;

var postData = [{
    name     : 'file',
    file     : 'test.img',
    type     : 'image/png'
}];

function createOrCloseCurlHandles() {

    var i = amount,
        shouldClose = iteration++ % 2;

    if ( shouldClose ) {

        console.log( 'Closing handles.' );

    } else {

        console.log( 'Opening handles.' );
    }

    while ( i-- ) {

        if ( shouldClose ) {

            instances[i].close();
            instances[i] = null;

        } else {

            handle = new Easy();
            handle.setOpt( 'HTTPPOST', postData );
            instances[i] = handle;
        }
    }

    if ( global.gc && shouldClose ) {
        
        console.log( 'Calling garbage collector.' );
        global.gc();
    }

    handle = null;
}

function loop() {

    rl.question( 'Type anything to go to the next iteration: ', function() {

        createOrCloseCurlHandles();

        process.nextTick( loop );
    });
}


loop();
