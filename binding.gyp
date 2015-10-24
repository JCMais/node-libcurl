{
    'targets': [
        {
            'target_name': '<(module_name)',
            'sources': [
                'src/node_libcurl.cc',
                'src/Easy.cc',
                'src/Share.cc',
                'src/Multi.cc',
                'src/Curl.cc',
                'src/CurlHttpPost.cc',
                'src/string_format.cc',
                'src/strndup.cc'
            ],
            'include_dirs' : [
                "<!(node -e \"require('nan')\")"
            ],
            'msvs_settings': {
                'VCCLCompilerTool': {
                    'DisableSpecificWarnings': ['4506', '4838'] #warning about v8 inline function and narrowing
                }
            },
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
            'cflags' : ['-std=c++11', '-O2', '-Wno-narrowing'],
            'cflags!': [ '-fno-exceptions', '-O3' ], # enable exceptions, remove level 3 optimization
            'xcode_settings': {
                'OTHER_CPLUSPLUSFLAGS' : ['-std=c++11','-stdlib=libc++'],
                'OTHER_LDFLAGS': ['-stdlib=libc++'],
                'MACOSX_DEPLOYMENT_TARGET': '10.8',
                'WARNING_CFLAGS':[
                    '-Wno-c++11-narrowing',
                    '-Wno-constant-conversion'
                ]
            },
            'conditions': [
                ['OS=="win"', {
                    'dependencies': [
                        '<!@(node "<(module_root_dir)/tools/retrieve-win-deps.js")'
                    ],
                    'defines' : [
                        'CURL_STATICLIB'
                    ]
                }, { # OS != "win"
                    'libraries': [
                        '<!@(node "<(module_root_dir)/tools/curl-config.js")'
                    ],
                    'sources!': [
                        'src/strndup.c' #remove strndup function declaration on non-windows systems.
                    ]
                }]
            ]
        },
        {
            'target_name': 'action_after_build',
            'type': 'none',
            'dependencies': [ '<(module_name)' ],
            'copies': [
                {
                    'files': [ '<(PRODUCT_DIR)/<(module_name).node' ],
                    'destination': '<(module_path)'
                }
            ]
        }
    ]
}
