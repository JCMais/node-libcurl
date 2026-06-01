const path = require('path')
const os = require('os')
const crypto = require('crypto')

// Exit if not Windows
if (process.platform !== 'win32') {
  process.exit(0)
}

const moduleRoot = path.resolve(__dirname, '..')

// Choose a vcpkg clone location that stays well under Windows MAX_PATH.
// vcpkg.exe itself doesn't carry the long-path app manifest, so its
// CreateProcessW calls (e.g. for the downloaded pwsh.exe at
// vcpkg/downloads/tools/powershell-core-<ver>-windows/pwsh.exe) silently
// fail with error 206 once the absolute path passes 260 chars. When this
// package is installed as a dependency in a deep pnpm path it's trivial
// to start well past that just from node_modules/.pnpm/... — so we keep
// vcpkg outside the module root.
//
// Honour an explicit VCPKG_ROOT first (Windows CI sets one), fall back to
// a stable short path under the user cache that's keyed by the module
// root so multiple installs don't clobber each other.
const moduleRootHash = crypto
  .createHash('sha1')
  .update(moduleRoot)
  .digest('hex')
  .slice(0, 8)
const defaultVcpkgRoot = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  'node-libcurl-vcpkg',
  moduleRootHash,
)
const vcpkgRoot = process.env.VCPKG_ROOT || defaultVcpkgRoot

// vcpkg_installed has the same MAX_PATH problem as the clone — pkg-config
// from msys2 (used during dependency builds like libssh2 -> zlib/libcrypto)
// silently fails to find .pc files once the absolute path passes ~260 chars.
// Keep it out of the module root for the same reasons.
const defaultVcpkgInstalledRoot = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  'node-libcurl-vcpkg',
  `${moduleRootHash}-installed`,
)
const vcpkgInstalledRoot =
  process.env.NODE_LIBCURL_VCPKG_INSTALLED_ROOT || defaultVcpkgInstalledRoot

// Triplet mapping
const arch = process.arch
const tripletMap = {
  x64: 'x64-windows-static-md',
  arm64: 'arm64-windows-static-md',
  // x64: 'x64-windows-static',
  // arm64: 'arm64-windows-static',
}
const triplet = tripletMap[arch]

if (!triplet) {
  console.error(`Unsupported architecture: ${arch}`)
  process.exit(1)
}

module.exports = {
  triplet,
  vcpkgRoot,
  vcpkgInstalledRoot,
  moduleRoot,
  arch,
}
