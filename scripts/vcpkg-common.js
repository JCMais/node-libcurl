const path = require('path')

// Exit if not Windows
if (process.platform !== 'win32') {
  process.exit(0)
}

const moduleRoot = path.resolve(__dirname, '..')
const vcpkgRoot = process.env.VCPKG_ROOT || path.join(moduleRoot, 'vcpkg')

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
  moduleRoot,
  arch,
}
