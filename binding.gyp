{
    'targets': [
        {
            'target_name': 'node-curl',
            'sources': [
                'src/node-curl.cc',
                'src/strndup.cc',
                'src/psnprintf.cc'
            ],
            'conditions': [
                ['OS=="win"', {
                    'dependencies': [
                         'deps/curl-for-windows/curl.gyp:libcurl'
                    ],
                    'defines' : [
                        'CURL_STATICLIB'
                    ]
                }, { # OS != "win"
                    'libraries': ['-lcurl'],
                    'sources!': [
                        'src/strndup.cc', #remove strndup function declaration on non-windows systems.
                        'src/psnprintf.cc'
                    ]
                }]
            ]
        }
    ]
}
