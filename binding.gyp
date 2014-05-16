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
            'configurations' : {
                'Release': {
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                            'ExceptionHandling': '1',
                        }
                    }
                }
            },
            'msvs_settings': {
                'VCCLCompilerTool': {
                    'WarnAsError': 'true',
                    'DisableSpecificWarnings': ['4506'], #warning about v8 inline function
                }
            },
            'cflags' : ['-std=c++11', '-O3'],
            'cflags!': [ '-fno-exceptions' ], # enable exceptions
            'cflags_cc!': [ '-fno-exceptions' ],
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
