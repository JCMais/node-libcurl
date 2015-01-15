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
                            'Optimization': 2,                  # /O2 safe optimization
                            'FavorSizeOrSpeed': 1,              # /Ot, favour speed over size 
                            'InlineFunctionExpansion': 2,       # /Ob2, inline anything eligible
                            'WholeProgramOptimization': 'true', # /GL, whole program optimization, needed for LTCG
                            'OmitFramePointers': 'true',
                            'EnableFunctionLevelLinking': 'true',
                            'EnableIntrinsicFunctions': 'true',
                            'WarnAsError': 'true'
                        }
                    }
                },
                'Debug': {
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                            'WarnAsError': 'false'
                        }
                    }
                }
            },
            'msvs_settings': {
                'VCCLCompilerTool': {
                    'DisableSpecificWarnings': ['4506'] #warning about v8 inline function
                }
            },
            'cflags' : ['-std=c++11', '-O2'],
            'cflags!': [ '-fno-exceptions' ], # enable exceptions
            "xcode_settings": {
                'OTHER_CPLUSPLUSFLAGS' : ['-std=c++11','-stdlib=libc++'],
                'OTHER_LDFLAGS': ['-stdlib=libc++'],
                'MACOSX_DEPLOYMENT_TARGET': '10.7',
                'WARNING_CFLAGS':[
                    '-Wno-c++11-narrowing',
                    '-Wno-constant-conversion'
                ]
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
                        'src/strndup.cc' #remove strndup function declaration on non-windows systems.
                    ]
                }]
            ]
        }
    ]
}
