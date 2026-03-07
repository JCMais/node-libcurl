// Returns include/lib paths for libcurl-impersonate (Windows only)
// Used by binding.gyp when curl_impersonate=true
const path = require('path')

if (process.platform !== 'win32') {
  process.exit(0)
}

const moduleRoot = path.resolve(__dirname, '..')
const impersonateRoot = path.join(moduleRoot, 'deps', 'libcurl-impersonate')

function normalizePath(p) {
  return p.split(path.sep).join('/')
}

const args = process.argv.slice(2)

const systemLibs = [
  'Ws2_32.lib',
  'Crypt32.lib',
  'Wldap32.lib',
  'Normaliz.lib',
  'Secur32.lib',
  'Advapi32.lib',
  'Bcrypt.lib',
  'Iphlpapi.lib',
]

if (args.includes('--include-dir')) {
  console.log(normalizePath(path.join(impersonateRoot, 'include')))
} else if (args.includes('--libs')) {
  const libs = [
    normalizePath(
      path.join(impersonateRoot, 'lib', 'libcurl-impersonate_imp.lib'),
    ),
    ...systemLibs,
  ]
  console.log(libs.join(' '))
}
