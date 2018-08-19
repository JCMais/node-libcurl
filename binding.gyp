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
                'src/CurlHttpPost.cc'
            ],
            'include_dirs' : [
                "<!(node -e \"require('nan')\")"
            ],
            'conditions': [
                ['OS=="win"', {
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                            # 4506 and 4838 -> about v8 inline function and narrowing
                            # 4996 -> Declared wrongly Nan::Callback::Call
                            'DisableSpecificWarnings': ['4506', '4838', '4996']
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
                    'dependencies': [
                        '<!@(node "<(module_root_dir)/tools/retrieve-win-deps.js")'
                    ],
                    'defines' : [
                        'CURL_STATICLIB'
                    ]
                }, { # OS != "win"
                    'cflags_cc' : [
                        '-std=c++11',
                        '-O2',
                        '-Wno-narrowing',
                        '<!@(node "<(module_root_dir)/tools/curl-config.js" --cflags)',
                    ],
                    # enable exceptions, remove level 3 optimization
                    'cflags_cc!': [
                        '-fno-exceptions',
                        '-O3'
                    ],
                    'xcode_settings': {
                        'OTHER_CPLUSPLUSFLAGS':[
                            '-std=c++11','-stdlib=libc++',
                            '<!@(node "<(module_root_dir)/tools/curl-config.js" --cflags)',
                        ],
                        'OTHER_CFLAGS':[
                            '<!@(node "<(module_root_dir)/tools/curl-config.js" --cflags)'
                        ],
                        'OTHER_LDFLAGS':[
                            '-Wl,-bind_at_load',
                            '-stdlib=libc++'
                        ],
                        'GCC_ENABLE_CPP_RTTI': 'YES',
                        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                        'MACOSX_DEPLOYMENT_TARGET':'10.8',
                        'CLANG_CXX_LIBRARY': 'libc++',
                        'CLANG_CXX_LANGUAGE_STANDARD':'c++11',
                        'OTHER_LDFLAGS': ['-stdlib=libc++'],
                        'WARNING_CFLAGS':[
                            '-Wno-c++11-narrowing',
                            '-Wno-constant-conversion'
                        ],
                        'LD_RUNPATH_SEARCH_PATHS': [
                          '/opt/local/lib',
                          '/usr/local/lib',
                          '/usr/lib'
                        ]
                    },
                    'include_dirs' : [
                        '<!@(node "<(module_root_dir)/tools/curl-config.js" --cflags | sed s/-I//g)'
                    ],
                    'libraries': [
                        '-L <!@(node "<(module_root_dir)/tools/curl-config.js" --prefix)/lib -lcurl'
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
            ],
            'conditions': [['OS == "mac"', {
                'postbuilds': [
                    {
                      'postbuild_name': '@rpath for libcurl',
                      'action': [
                        'install_name_tool',
                        '-change',
                        '<!@(otool -D `curl-config --prefix`/lib/libcurl.dylib | sed -n 2p)',
                        '@rpath/libcurl.dylib',
                        '<(module_path)/<(module_name).node'
                      ],
                    },
                ]
            }]]
        }
    ]
}
