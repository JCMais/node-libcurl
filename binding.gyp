{
    'targets': [
        {
            'target_name': 'node-libcurl',
            'sources': [
                'src/node-libcurl.cc',
                'src/Curl.cc',
                'src/CurlHttpPost.cc',
                'src/strndup.cc',
                'src/psnprintf.cc'
            ],
            'cflags!': [ '-O3' ],
            'cflags': [ '-O1' ],
            'msvs_settings': {
                'VCCLCompilerTool': {
                    'Optimization': 1, # /Ox, full optimization
                    'InlineFunctionExpansion': 0 # /Obx, inline anything eligible
                }
            },
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
