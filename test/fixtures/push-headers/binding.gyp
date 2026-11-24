{
  'targets': [
    {
      'target_name': 'push_headers_fixture',
      'sources': ['fixture.cc', '../../../src/Http2PushFrameHeaders.cc'],
      'include_dirs': [
        '<!@(node -p "require(\'node-addon-api\').include")',
        'include',
      ],
      'defines': ['NAPI_CPP_EXCEPTIONS'],
      'cflags_cc!': ['-fno-exceptions'],
      'xcode_settings': {'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'},
      'msvs_settings': {'VCCLCompilerTool': {'ExceptionHandling': 1}},
    },
  ],
}
