{
  # Those variables can be overwritten when installing the package, like:
  #  npm install --curl-extra_link_args=true
  # or if using pnpm:
  #  npm_config_curl_extra_link_args=true pnpm install
  # 
  'variables': {
    # Comma separated list
    'curl_include_dirs%': '',
    'curl_libraries%': '',
    'curl_static_build%': 'false',
    'curl_config_bin%': 'node <(module_root_dir)/scripts/curl-config.js',
    'node_libcurl_no_setlocale%': 'false',
    'node_libcurl_debug%': 'false',
    'node_libcurl_asan_debug%': 'false',
    'node_libcurl_cpp_std%': 'c++20',
    'macos_universal_build%': 'false',
    'napi_build_version%': '10',
  },
  'targets': [
    {
      'target_name': '<(module_name)',
      'type': 'loadable_module',
      'dependencies': [
        # https://github.com/nodejs/node-addon-api/blob/main/doc/setup.md
        # using exceptions (instead of maybe, like we used to have on nan)
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
      ],
      'sources': [
        'src/node_libcurl.cc',
        'src/Easy.cc',
        'src/Share.cc',
        'src/Multi.cc',
        'src/CurlHttpPost.cc',
        'src/Curl.cc',
        'src/CurlVersionInfo.cc',
        'src/Http2PushFrameHeaders.cc',
      ],
      'include_dirs': [
        '<!@(node -p "require(\'node-addon-api\').include")',
      ],
      'defines': [
        'NAPI_VERSION=10',
        # 'NAPI_VERSION=<(napi_build_version)',
      ],
      'conditions': [
        ['node_libcurl_no_setlocale=="true"', {
          'defines': [
            'NODE_LIBCURL_NO_SETLOCALE'
          ]
        }],
        ['node_libcurl_debug=="true"', {
          'defines': [
            'NODE_LIBCURL_DEBUG'
          ]
        }],
        ['curl_include_dirs!=""', {
          'include_dirs': ['<@(curl_include_dirs)']
        }],
        ['curl_libraries!=""', {
          'libraries': ['<@(curl_libraries)']
        }],
        # Windows is only build statically
        # In the future we can add support for other build types 
        ['OS=="win"', {
          'msvs_settings': {
            'VCCLCompilerTool': {
              # 4244 -> nan_new.h(208): warning C4244: curl_off_t to double loss of data
              # 4506 and 4838 -> about v8 inline function and narrowing
              # 4068 -> Unknown pragma (mostly GCC pragmas being used)
              # 4996 -> Declared wrongly Nan::Callback::Call
              # 4309 -> 'static_cast': truncation of constant value on v8 header
              # 28251 -> Inconsistent annotation for 'NTSTATUS': this instance has no annotations. This is coming from libuv headers.
              'DisableSpecificWarnings': ['4244', '4506', '4068', '4838', '4996', '4309', '28251'],
              'AdditionalOptions': [
                '/std:<(node_libcurl_cpp_std)',
                '/MP', #compile across multiple CPUs
              ],
              "ExceptionHandling": 1, 
            },
            'VCLinkerTool': {
              'GenerateDebugInformation': 'true',
              'AdditionalOptions': [
                '/FORCE:MULTIPLE',
                # Symbol already defined. Impossible to avoid given Node.js exposes OpenSSL symbols from their own build.
                '/IGNORE:4006'
              ],
            },
          },
          'configurations': {
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
                  'WarnAsError': 'true',
                  'RuntimeLibrary': 2,
                }
              }
            },
            'Debug': {
              'msvs_settings': {
                'VCCLCompilerTool': {
                  'WarnAsError': 'false',
                  'RuntimeLibrary': 3,
                }
              }
            }
          },
          'dependencies': [
            '<!@(node "<(module_root_dir)/scripts/openssl-disable.js")'
          ],
          'defines': [
            'CURL_STATICLIB'
          ],
          'conditions': [
            ['curl_include_dirs==""', {
              'include_dirs': [
                '<!@(node "<(module_root_dir)/scripts/vcpkg-get-info.js" --include-dir)'
              ],
              'libraries': [
                '<!@(node "<(module_root_dir)/scripts/vcpkg-get-info.js" --libs)'
              ]
            }],
            ['curl_include_dirs!=""', {
              'include_dirs': ['<@(curl_include_dirs)'],
              'libraries': ['<@(curl_libraries)']
            }]
          ]
        }, { # OS != "win"
            # Use level 2 optimizations
          'cflags': [
            '-O2',
          ],
          'cflags_cc': [
            '-O2',
            '-std=<(node_libcurl_cpp_std)',
            '-Wno-narrowing',
          ],
            # Allow C++ exceptions
            # Disable level 3 optimizations
          'cflags!': [
            '-fno-exceptions',
            '-O3'
          ],
          'cflags_cc!': [
            '-fno-exceptions',
            '-O3'
          ],
          'conditions': [
            ['curl_include_dirs==""', {
              'include_dirs': [
                # '<!@(node "<(module_root_dir)/scripts/curl-config.js" --cflags | sed "s/-D.* //g" | sed s/-I//g)'
                '<!(<(curl_config_bin) --prefix)/include'
              ],
            }],
          ],
        }],
        ['OS=="linux"', {
          'conditions': [
            ['curl_static_build=="true"', {
              # pretty sure cflags adds that
              'defines': [
                'CURL_STATICLIB',
              ],
              'conditions': [
                ['curl_libraries==""', {
                  'libraries': [
                    '<!@(<(curl_config_bin) --static-libs)',
                  ],
                }]
              ],
            }, { # do not use static linking - default
              'conditions': [
                ['curl_libraries==""', {
                  'libraries': [
                    '-Wl,-rpath <!(<(curl_config_bin) --prefix)/lib',
                    '<!@(<(curl_config_bin) --libs)',
                  ],
                }]
              ],
            }]
          ],
        }],
        ['OS=="mac"', {
          'cflags+': ['-fvisibility=hidden'],
          'configurations': {
            'Debug': {
              'xcode_settings': {
                'GCC_GENERATE_DEBUGGING_SYMBOLS': 'YES',
                'GCC_OPTIMIZATION_LEVEL': '0',
                'DEAD_CODE_STRIPPING': 'NO',
                'GCC_INLINES_ARE_PRIVATE_EXTERN': 'NO',
                'GCC_SYMBOLS_PRIVATE_EXTERN': 'NO'
              },
              'cflags_cc': ['-g', '-O0', '-fno-omit-frame-pointer'],
              'cflags': ['-g', '-O0', '-fno-omit-frame-pointer'],
              'defines': ['NODE_LIBCURL_DEBUG_BUILD']
            },
            'Release': {
              'xcode_settings': {
                'GCC_OPTIMIZATION_LEVEL': 's',
                'DEAD_CODE_STRIPPING': 'YES'
              }
            }
          },
          'conditions': [
            ['curl_static_build=="true"', {
              # pretty sure cflags adds that
              'defines': [
                  'CURL_STATICLIB',
              ],
              'xcode_settings': {
                'OTHER_LDFLAGS': [
                  # HACK: -framework CoreFoundation appears twice, but CoreFoundation is a singleton
                  # because it doesn't start with a -. We need to remove one of the instances of
                  # -framework CoreFoundation or GYP will break our args.
                  # This seems to be required starting with xcode 12
                  # original workaround from https://github.com/JCMais/node-libcurl/pull/312
                  '-static',
                  '<!@(<(curl_config_bin) --static-libs | sed "s/-framework CoreFoundation//")',
                ],

                'LD_RUNPATH_SEARCH_PATHS': [
                  '<!@(<(curl_config_bin) --static-libs | node -e "console.log(require(\'fs\').readFileSync(0, \'utf-8\').split(\' \').filter(i => i.startsWith(\'-L\')).join(\' \').replace(/-L/g, \'\'))")'
                ],
              }
            }, { # do not use static linking - default
              'libraries': [
                '-L <!@(<(curl_config_bin) --prefix)/lib -lcurl'
              ],
              'xcode_settings': {
                'LD_RUNPATH_SEARCH_PATHS': [
                  '<!(<(curl_config_bin) --prefix)/lib',
                  '/opt/local/lib',
                  '/usr/local/opt/curl/lib',
                  '/usr/local/lib',
                  '/usr/lib'
                ],
              }
            }],
            ['macos_universal_build=="true"', {
              'xcode_settings': {
                'OTHER_CPLUSPLUSFLAGS': [
                  '-arch x86_64',
                  '-arch arm64'
                ],
                'OTHER_CFLAGS': [
                  '-arch x86_64',
                  '-arch arm64'
                ],
                'OTHER_LDFLAGS': [
                  '-arch x86_64',
                  '-arch arm64'
                ]
              }
            }]
          ],
          'xcode_settings': {
            'conditions': [
              ['curl_include_dirs==""', {
                'OTHER_CPLUSPLUSFLAGS': [
                  '<!(<(curl_config_bin) --prefix)/include',
                ],
                'OTHER_CFLAGS': [
                  '<!(<(curl_config_bin) --prefix)/include',
                ],
              }],
            ],
            'OTHER_CPLUSPLUSFLAGS': [
              '-std=<(node_libcurl_cpp_std)', '-stdlib=libc++',
            ],
            'OTHER_LDFLAGS': [
              '-Wl,-bind_at_load',
              '-stdlib=libc++'
            ],
            'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES', # -fvisibility=hidden
            'GCC_ENABLE_CPP_RTTI': 'YES',
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '11.6',
            'CLANG_CXX_LIBRARY': 'libc++',
            'CLANG_CXX_LANGUAGE_STANDARD': '<(node_libcurl_cpp_std)',
            'WARNING_CFLAGS': [
              '-Wno-c++11-narrowing',
              '-Wno-constant-conversion'
            ],
          },
        }],
        ['node_libcurl_asan_debug=="true" and (OS=="mac" or OS=="linux")', {
          'cflags_cc': ['-fsanitize=address', '-fsanitize=undefined', '-fno-sanitize-recover=all'],
          'cflags': ['-fsanitize=address', '-fsanitize=undefined', '-fno-sanitize-recover=all'],
          'ldflags': ['-fsanitize=address', '-fsanitize=undefined'],
          'defines': ['NODE_LIBCURL_DEBUG_BUILD', 'NODE_LIBCURL_ASAN_BUILD']
        }],
      ]
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': ['<(module_name)'],
      'copies': [
        {
          'files': ['<(PRODUCT_DIR)/<(module_name).node'],
          'destination': '<(module_path)'
        }
      ],
      'conditions': [['OS=="mac" and curl_static_build!="true"', {
        'postbuilds': [
          {
            'postbuild_name': '@rpath for libcurl',
            'action': [
              '<(module_root_dir)/scripts/gyp-macos-postbuild.sh',
              '<(module_path)/<(module_name).node'
            ],
          },
        ]
      }]]
    }
  ]
}
