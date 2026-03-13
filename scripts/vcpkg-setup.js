// this should not use any third party dependencies! Only native Node.js modules!
const { execSync: exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const { triplet, moduleRoot, vcpkgRoot } = require('./vcpkg-common')

const modulePackageJson = require('../package.json')

async function setupVcpkg() {
  try {
    let vcpkgExe

    // Check for global vcpkg
    if (process.env.VCPKG_ROOT) {
      vcpkgExe = path.join(process.env.VCPKG_ROOT, 'vcpkg.exe')
      if (!fs.existsSync(vcpkgExe)) {
        console.error('VCPKG_ROOT set but vcpkg.exe not found')
        process.exit(1)
      }
      console.log(`Using global vcpkg at ${process.env.VCPKG_ROOT}`)
    } else {
      // Bootstrap local vcpkg
      if (!fs.existsSync(vcpkgRoot)) {
        console.log('Cloning vcpkg locally...')
        exec(
          `git clone https://github.com/microsoft/vcpkg.git "${vcpkgRoot}"`,
          {
            cwd: path.dirname(vcpkgRoot),
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'inherit',
          },
        )
      } else {
        console.log(`Using local vcpkg at ${vcpkgRoot}`)
      }

      vcpkgExe = path.join(vcpkgRoot, 'vcpkg.exe')
      if (!fs.existsSync(vcpkgExe)) {
        console.log('Bootstrapping vcpkg...')
        exec(`"${path.join(vcpkgRoot, 'bootstrap-vcpkg.bat')}"`, {
          cwd: vcpkgRoot,
          maxBuffer: 10 * 1024 * 1024,
          stdio: 'inherit',
        })
      }
    }

    await createVcpkgJson()

    // Install dependencies
    console.log(`Installing curl with ${triplet}...`)
    const installCmd = `"${vcpkgExe}" install --triplet ${triplet}`
    exec(installCmd, {
      cwd: moduleRoot,
      maxBuffer: 20 * 1024 * 1024,
      stdio: 'inherit',
    })

    const installedRoot = path.join(moduleRoot, 'vcpkg_installed', triplet)

    console.log(`✓ vcpkg setup complete`)
    console.log(`  Installed to: ${installedRoot}`)
  } catch (error) {
    console.error('vcpkg setup failed:', error.message)
    if (error.stdout) console.error('stdout:', error.stdout)
    if (error.stderr) console.error('stderr:', error.stderr)
    process.exit(1)
  }
}

async function createVcpkgJson() {
  const vcpkgJsonTemplate = fs.readFileSync(
    path.join(moduleRoot, 'vcpkg.template.json'),
    'utf8',
  )
  const nodeOpenSSLVersion = process.versions.openssl.replace('+quic', '')
  const vcpkgJson = vcpkgJsonTemplate
    .replace('$$OPENSSL_VERSION$$', nodeOpenSSLVersion)
    .replace('$$NODE_LIBCURL_VERSION$$', modulePackageJson.version)

  fs.writeFileSync(path.join(moduleRoot, 'vcpkg.json'), vcpkgJson)
}

setupVcpkg()
