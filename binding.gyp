{
  'targets': [
    {
		'target_name': 'node-curl',
		'sources': [
            'src/node-curl.cc',
            'src/strndup.cc',
            'src/psnprintf.cc'
        ],
		'conditions': [
        	['OS=="win"', {
        		'include_dirs': [
        			'<!(cmd /E:on /c "if not defined NODE_CURL_INCLUDE_PATH ( echo C:\devel\include ) else ( echo %NODE_CURL_INCLUDE_PATH% )")',
        		],
        		'link_settings': {
        		    'library_dirs': [
                      '<!(cmd /E:on /c "if not defined NODE_CURL_LIB_PATH ( echo C:\devel\lib ) else ( echo %NODE_CURL_LIB_PATH% )")',
                    ]
        		},
        		'defines' : [
        			'CURL_STATICLIB'
        		],
                'libraries' : [
                    '-llibcurl.x86.lib',
                    '-llibssh2.x86.lib',
                    '-lopenssl.x86.lib',
                    '-lzlib.x86.lib',
                    '-lwsock32.lib',
                    '-lwldap32.lib',
                    '-lws2_32.lib'
                ],
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
