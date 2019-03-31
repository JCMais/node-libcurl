{
  # Those variables can be overwritten when installing the package, like:
  #  npm install --curl-extra_link_args=true
  # or if using yarn:
  #  npm_config_curl_extra_link_args=true yarn install
  # 
  'variables': {
    # Comma separated list
    'curl_link_flags%': 'false',
    'curl_static_build%': 'false',
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
        'src/CurlHttpPost.cc'
      ],
      'include_dirs' : [
        "<!(node -e \"require('nan')\")"
      ],
      'conditions': [
        # Windows is only build statically
        # In the future we can add support for other build types 
        ['OS=="win"', {
          'msvs_settings': {
            'VCCLCompilerTool': {
              # 4506 and 4838 -> about v8 inline function and narrowing
              # 4996 -> Declared wrongly Nan::Callback::Call
              'DisableSpecificWarnings': ['4506', '4838', '4996']
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
          'conditions': [
            ['curl_link_flags!="false"', {
              'libraries+': ['<(curl_link_flags)']
            }]
          ],
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
          'include_dirs' : [
            '<!@(node "<(module_root_dir)/tools/curl-config.js" --cflags | sed s/-I//g)'
          ],
        }],
        ['OS=="linux"', {
          'conditions': [
            ['curl_static_build=="true"', {
              # pretty sure cflags adds that
              'defines': [
                  'CURL_STATICLIB',
              ],
              'libraries': [
                '<!@(node "<(module_root_dir)/tools/curl-config.js" --static-libs)',
              ],
            }, { # do not use static linking - default
              'libraries': [
                '-Wl,-rpath <!(node "<(module_root_dir)/tools/curl-config.js" --prefix)/lib',
                '<!@(node "<(module_root_dir)/tools/curl-config.js" --libs)',
              ],
            }]
          ],
        }],
        ['OS=="mac"', {
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
            # if building statically do we need to add all other folders here too (for openssl, libssh2, etc)?
            #  we could use the following for example:
            # <!@(node "<(module_root_dir)/tools/curl-config.js" --static-libs | node -e "console.log(require('fs').readFileSync(0, 'utf-8').split(' ').filter(i => i.startsWith('-L')).join(' ').replace(/-L/g, ''))")
            'LD_RUNPATH_SEARCH_PATHS': [
              '<!(node "<(module_root_dir)/tools/curl-config.js" --prefix)/lib',
              '/opt/local/lib',
              '/usr/local/opt/curl/lib',
              '/usr/local/lib',
              '/usr/lib'
            ],
          },
          'libraries': [
            '-L <!@(node "<(module_root_dir)/tools/curl-config.js" --prefix)/lib -lcurl'
          ]
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
