{
    'targets': [
        {
            'target_name': 'node-libcurl',
            'sources': [
                'src/node-libcurl.cc',
                'src/Curl.cc',
                'src/CurlHttpPost.cc',
                'src/strndup.cc',
                'src/string_format.cc'
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
                        'src/strndup.cc' #remove strndup function declaration on non-windows systems.
                    ]
                }]
            ]
        }
    ]
}
