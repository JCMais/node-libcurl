{
  # Those variables can be overwritten when installing the package, like:
  #  npm install --curl-extra_link_args=true
  # or if using yarn:
  #  npm_config_curl_extra_link_args=true yarn install
  # 
  'variables': {
    # Comma separated list
    'curl_include_dirs%': '',
    'curl_libraries%': '',
    'curl_static_build%': 'false',
    'curl_config_bin%': 'node <(module_root_dir)/tools/curl-config.js',
    'node_libcurl_no_setlocale%': 'false',
  },
  'targets': [
    {
      'target_name': '<(module_name)',
      'type': 'loadable_module',
      'sources': [
        'src/node_libcurl.cc',
        'src/Easy.cc',
        'src/Share.cc',
        'src/Multi.cc',
        'src/Curl.cc',
        'src/CurlHttpPost.cc',
        'src/CurlVersionInfo.cc',
      ],
      'include_dirs' : [
        "<!(node -e \"require('nan')\")",
      ],
      'conditions': [
        ['node_libcurl_no_setlocale=="true"', {
          'defines' : [
            'NODE_LIBCURL_NO_SETLOCALE'
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
              # 4996 -> Declared wrongly Nan::Callback::Call
              'DisableSpecificWarnings': ['4244', '4506', '4838', '4996']
            },
            'VCLinkerTool': {
              'GenerateDebugInformation': 'true',
            },
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
            # Use level 2 optimizations
          'cflags' : [
            '-O2',
          ],
          'cflags_cc' : [
            '-O2',
            '-std=c++11',
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
              'include_dirs' : [
                # '<!@(node "<(module_root_dir)/tools/curl-config.js" --cflags | sed "s/-D.* //g" | sed s/-I//g)'
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
          'conditions': [
            ['curl_static_build=="true"', {
              # pretty sure cflags adds that
              'defines': [
                  'CURL_STATICLIB',
              ],
              'libraries': [
                '<!@(<(curl_config_bin) --static-libs)',
              ],
              'xcode_settings': {
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
            }]
          ],
          'xcode_settings': {
            'conditions': [
              ['curl_include_dirs==""', {
                'OTHER_CPLUSPLUSFLAGS' : [
                  '<!(<(curl_config_bin) --prefix)/include',
                ],
                'OTHER_CFLAGS':[
                  '<!(<(curl_config_bin) --prefix)/include',
                ],
              }],
            ],
            'OTHER_CPLUSPLUSFLAGS':[
              '-std=c++11','-stdlib=libc++',
            ],
            'OTHER_LDFLAGS':[
              '-Wl,-bind_at_load',
              '-stdlib=libc++'
            ],
            'GCC_ENABLE_CPP_RTTI': 'YES',
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'MACOSX_DEPLOYMENT_TARGET':'10.12',
            'CLANG_CXX_LIBRARY': 'libc++',
            'CLANG_CXX_LANGUAGE_STANDARD':'c++11',
            'OTHER_LDFLAGS': ['-stdlib=libc++'],
            'WARNING_CFLAGS':[
              '-Wno-c++11-narrowing',
              '-Wno-constant-conversion'
            ],
          },
        }],
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
      'conditions': [['OS=="mac" and curl_static_build!="true"', {
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
