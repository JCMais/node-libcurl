const fs = require('fs')
const path = require('path')

const { triplet, moduleRoot } = require('./vcpkg-common')

// Exit if not Windows
if (process.platform !== 'win32') {
  process.exit(0)
}

const args = process.argv.slice(2)

const installedRoot = path.join(moduleRoot, 'vcpkg_installed', triplet)

// Collect all .lib files
const libDir = path.join(installedRoot, 'lib')
const debugLibDir = path.join(installedRoot, 'debug', 'lib')

const libs = fs
  .readdirSync(libDir)
  .filter((f) => f.endsWith('.lib'))
  .map((f) => path.join(libDir, f))

const debugLibs = fs.existsSync(debugLibDir)
  ? fs
      .readdirSync(debugLibDir)
      .filter((f) => f.endsWith('.lib'))
      .map((f) => path.join(debugLibDir, f))
  : []

// System libraries
const systemLibs = [
  'Ws2_32.lib',
  // crypto / openssl
  'Crypt32.lib',
  // ldap
  'Wldap32.lib',
  // idn
  'Normaliz.lib',
  // sspi / schannel
  'Secur32.lib',
  'Advapi32.lib',
  'Bcrypt.lib',
  'Iphlpapi.lib',
]
// -lwldap32 -lnormaliz -lbcrypt -ladvapi32 -lcrypt32 -lsecur32 -lws2_32 -liphlpapi --lws2_32 -lntdll -lbcrypt
function normalizePath(pathStr) {
  return pathStr.split(path.sep).join('/')
}

// Write config for binding.gyp
const config = {
  triplet,
  installedPath: normalizePath(installedRoot),
  includeDir: normalizePath(path.join(installedRoot, 'include')),
  libDir: normalizePath(libDir),
  debugLibDir: normalizePath(debugLibDir),
  libraries: [...libs, ...systemLibs].map(normalizePath),
  debugLibraries: [...debugLibs, ...systemLibs].map(normalizePath),
}

if (args.includes('--include-dir')) {
  console.log(config.includeDir)
} else if (args.includes('--libs')) {
  console.log(config.libraries.join(' '))
} else {
  console.log(config)
}

// here -> we need to use openssl, and pick the same version as nodejs :|
