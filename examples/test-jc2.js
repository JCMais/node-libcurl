function test() {

    var Curl = require('bindings')( 'node-libcurl1' ).Curl,
        util = require( 'util' );

    var curls = {}, id = 0;

    var _close = Curl.prototype.close;
    Curl.prototype.close = function() {

        delete curls[this._id];
        return _close.apply( this );
    };

    var _perform = Curl.prototype.perform;
    Curl.prototype.perform = function() {

        this._id = ++id;
        curls[this._id] = this;

        _perform.apply( this );
        Curl.process();

        return this;
    };

    var _process = Curl.process;
    Curl.process = function() {

        var once;

        if ( Curl.isInProcess ) {
            return;
        }

        return ( once = function() {

            var transfered, w;

            transfered = _process();

            if ( transfered > 0 ) {

                Curl.isInProcess = true;

                //Control the allocated memory, it should not be more than 4096*2
                if ( transfered > 8192 && processExecutions < 10 ) {

                    ++processExecutions;
                    return process.nextTick( once );

                } else {

                    processExecutions = 0;
                    w = ( 8192 - transfered ) * 80 / 8192 >> 0;

                    if ( w < 0 ) {
                        w = 0;
                    }
                    return setTimeout( once, w );
                }

            } else {

                return Curl.isInProcess = false;
            }
        })();
    };

    var next = function () {

        console.info( "Curl instances:", Curl.getCount() );

        setTimeout( next, 100 );

    };

    next();

    var j = 0,
        i = 0,
        instances = 10;

    function doRequest( ) {

        for ( i = 0; i < instances; i++ ) {

            var curl = new Curl();

            curl.setOpt( Curl.OPTION_URL, 'http://www.google.com.br' );

            curl.onEnd = onEnd;
            curl.onError = onError;
            curl.perform();

        }
    }

    function onError( err ) {

        this.close();
    }

    function onEnd() {

        this.close();

        if ( j > 500 )
            return;

        ++j;
        doRequest();

        if ( j % 100 === 0 ) {

            console.info( j );

        }
    }

    doRequest();
}

process.stdin.resume();

process.stdin.once( 'data', function () {

    process.stdin.pause();

    test();
});
