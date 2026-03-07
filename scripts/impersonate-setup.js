// Downloads prebuilt libcurl-impersonate binaries for Windows.
// Only runs when building with curl_impersonate=true on Windows.
// No third-party dependencies - only native Node.js modules.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const https = require('https')

const REPO = 'lexiforest/curl-impersonate'
const VERSION = '1.5.1'
const ARCH_MAP = { x64: 'x86_64', ia32: 'i686', arm64: 'arm64' }

const moduleRoot = path.resolve(__dirname, '..')
const depsDir = path.join(moduleRoot, 'deps', 'libcurl-impersonate')

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get = (u) => {
      https
        .get(u, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            file.close()
            get(res.headers.location)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`))
            return
          }
          res.pipe(file)
          file.on('finish', () => file.close(resolve))
          file.on('error', reject)
        })
        .on('error', reject)
    }
    get(url)
  })
}

async function setupImpersonate() {
  const force = process.argv.includes('--force')
  if (!force && process.env.npm_config_curl_impersonate !== 'true') {
    return
  }

  if (process.platform !== 'win32') {
    console.log('impersonate-setup: skipping (not Windows)')
    return
  }

  const arch = ARCH_MAP[process.arch]
  if (!arch) {
    console.error(`impersonate-setup: unsupported arch ${process.arch}`)
    process.exit(1)
  }

  if (fs.existsSync(path.join(depsDir, 'lib', 'libcurl-impersonate_imp.lib'))) {
    console.log(`Using cached libcurl-impersonate v${VERSION} at ${depsDir}`)
    return
  }

  fs.mkdirSync(depsDir, { recursive: true })

  const tarballName = `libcurl-impersonate-v${VERSION}.${arch}-win32.tar.gz`
  const tarballPath = path.join(depsDir, tarballName)
  const url = `https://github.com/${REPO}/releases/download/v${VERSION}/${tarballName}`

  console.log(`Downloading libcurl-impersonate v${VERSION} (${arch})...`)
  console.log(`  from: ${url}`)

  await downloadFile(url, tarballPath)

  console.log('Extracting...')
  execSync(`tar -xzf "${tarballPath}"`, { cwd: depsDir })
  fs.unlinkSync(tarballPath)

  console.log(`✓ libcurl-impersonate v${VERSION} ready at ${depsDir}`)
}

setupImpersonate().catch((err) => {
  console.error('impersonate-setup failed:', err.message)
  process.exit(1)
})
