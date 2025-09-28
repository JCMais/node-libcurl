# Windows Build Script for node-libcurl
# This script is based on the AppVeyor configuration and is designed to run in GitHub Actions

param(
    [string]$GitCommit = $env:GIT_COMMIT,
    [string]$GitRefName = $env:GIT_REF_NAME,
    [string]$ElectronVersion = $env:ELECTRON_VERSION
)

# Set error action preference
$ErrorActionPreference = "Stop"
$PSNativeCommandErrorActionPreference = "Stop"

# Set up environment variables
$env:DEBUG = 'node-libcurl'
$env:NODE_LIBCURL_POSTINSTALL_SKIP_CLEANUP = 'true'

# Get system information
$Architecture = (Get-WmiObject Win32_Processor).Architecture
# Convert architecture code to readable format
switch ($Architecture) {
    0 { $Architecture = "x86" }
    1 { $Architecture = "MIPS" }
    2 { $Architecture = "Alpha" }
    3 { $Architecture = "PowerPC" }
    5 { $Architecture = "ARM" }
    6 { $Architecture = "ia64" }
    9 { $Architecture = "x64" }
    12 { $Architecture = "ARM64" }
    default { $Architecture = "Unknown" }
}

Write-Host "=== Node-libcurl Windows Build Script ===" -ForegroundColor Green
Write-Host "Electron Version: $ElectronVersion" -ForegroundColor Yellow
Write-Host "Architecture: $Architecture" -ForegroundColor Yellow
Write-Host "Git Commit: $GitCommit" -ForegroundColor Yellow
Write-Host "Git Ref Name: $GitRefName" -ForegroundColor Yellow

# Add localhost entries to hosts file (needed for c-ares DNS resolution)
Write-Host "Adding localhost entries to hosts file..." -ForegroundColor Blue
try {
    Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "127.0.0.1       localhost" -Force
    Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "::1             localhost" -Force
} catch {
    Write-Warning "Failed to update hosts file: $($_.Exception.Message)"
}

# Install NASM (needed for OpenSSL compilation)
Write-Host "Installing NASM..." -ForegroundColor Blue
try {
    choco install nasm -y --no-progress
    $env:PATH = "$env:PROGRAMFILES\NASM;$env:PATH"
} catch {
    Write-Error "Failed to install NASM: $($_.Exception.Message)"
}

# Display system information
Write-Host "=== System Information ===" -ForegroundColor Green
Write-Host "Node version:" -ForegroundColor Blue
node --version
Write-Host "NPM version:" -ForegroundColor Blue
npm --version
Write-Host "PNPM version:" -ForegroundColor Blue
pnpm --version

# Check if we need to publish the package
Write-Host "Checking if binary should be published..." -ForegroundColor Blue

# Set default to false if not already set, but allow override via environment variable
if (-not $env:PUBLISH_BINARY) {
    $env:PUBLISH_BINARY = "false"
    
    # Check commit message for [publish binary] or if we're on a tag
    $commitMessage = ""
    try {
        $commitMessage = git show -s --format=%B $GitCommit
        Write-Host "Commit message: $commitMessage" -ForegroundColor Cyan
    } catch {
        Write-Warning "Could not get commit message"
    }

    $gitLatestTag = ""
    try {
        $gitLatestTag = git describe --tags --always HEAD
        Write-Host "Git latest tag: $gitLatestTag" -ForegroundColor Cyan
    } catch {
        Write-Warning "Could not get git describe"
    }

    if ($commitMessage.ToLower().Contains('[publish binary]') -or $gitLatestTag -eq $GitRefName) {
        $env:PUBLISH_BINARY = "true"
        Write-Host "Binary will be published (auto-detected)" -ForegroundColor Green
    } else {
        Write-Host "Binary will not be published (auto-detected)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Binary publish setting overridden via environment variable: $env:PUBLISH_BINARY" -ForegroundColor Cyan
}

# Initialize git submodules for curl-for-windows dependencies
Write-Host "Initializing git submodules..." -ForegroundColor Blue
git submodule update --init --recursive

# Install Python dependencies
Write-Host "Setting up Python environment..." -ForegroundColor Blue
python -m pip install --upgrade pip
try {
    python -c "import distutils"
} catch {
    Write-Host "Installing setuptools..." -ForegroundColor Blue
    pip install setuptools
}

# Configure curl-for-windows dependencies
Write-Host "Configuring curl-for-windows dependencies..." -ForegroundColor Blue
python deps\curl-for-windows\configure.py

# Set up build environment variables
Write-Host "Setting up build environment..." -ForegroundColor Blue

$runtime = ""
$dist_url = ""
$target = ""

if ($ElectronVersion) {
    Write-Host "Building for Electron $ElectronVersion" -ForegroundColor Green
    $runtime = "electron"
    $dist_url = "https://electronjs.org/headers"
    $target = $ElectronVersion
    
    # Install Electron globally
    pnpm install -g electron@$ElectronVersion
} else {
    Write-Host "Building for Node.js" -ForegroundColor Green
    $runtime = ""
    $dist_url = ""
    $target = ""
}


# Get node-gyp version from package.json
$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$nodeGypVersion = $null

if ($packageJson.devDependencies -and $packageJson.devDependencies.'node-gyp') {
    $nodeGypVersion = $packageJson.devDependencies.'node-gyp'
} elseif ($packageJson.dependencies -and $packageJson.dependencies.'node-gyp') {
    $nodeGypVersion = $packageJson.dependencies.'node-gyp'
}

if ($nodeGypVersion) {
    Write-Host "node-gyp version from package.json: $nodeGypVersion" -ForegroundColor Cyan
} else {
    Write-Host "node-gyp version not found in package.json, using latest" -ForegroundColor Yellow
    $nodeGypVersion = "latest"
}

# https://github.com/nodejs/node-gyp/blob/main/docs/Force-npm-to-use-global-node-gyp.md
Write-Host "Installing node-gyp@$nodeGypVersion..." -ForegroundColor Blue
npm install --global node-gyp@$nodeGypVersion
$globalNodeGypPath = Join-Path (npm prefix -g) "node_modules\node-gyp\bin\node-gyp.js"
Write-Host "Set node-gyp path to ${globalNodeGypPath}"

# Remove 'v' prefix from target if present
$target = $target -replace '^v', ''

# Set npm config variables
$env:npm_config_msvs_version = "2022"
$env:npm_config_build_from_source = "true"
$env:npm_config_runtime = $runtime
$env:npm_config_dist_url = $dist_url
$env:npm_config_target = $target
$env:npm_config_node_gyp = $globalNodeGypPath

Write-Host "Build configuration:" -ForegroundColor Green
Write-Host "  npm_config_msvs_version: $env:npm_config_msvs_version" -ForegroundColor Cyan
Write-Host "  npm_config_build_from_source: $env:npm_config_build_from_source" -ForegroundColor Cyan
Write-Host "  npm_config_runtime: $env:npm_config_runtime" -ForegroundColor Cyan
Write-Host "  npm_config_dist_url: $env:npm_config_dist_url" -ForegroundColor Cyan
Write-Host "  npm_config_target: $env:npm_config_target" -ForegroundColor Cyan

# Install dependencies and build
Write-Host "Installing dependencies..." -ForegroundColor Blue
pnpm install --frozen-lockfile --fetch-timeout 300000

Write-Host "Build completed successfully!" -ForegroundColor Green

# List build directory contents
Write-Host "Build directory contents:" -ForegroundColor Blue
Get-ChildItem -Path . -Force | Format-Table Name, Length, LastWriteTime

# Run tests (skip for Electron builds)
Write-Host "Running tests..." -ForegroundColor Blue
if ($ElectronVersion) {
    Write-Host "Skipping tests for Electron build" -ForegroundColor Yellow
} else {
    try {
        # Test basic functionality
        pnpm exec ts-node -e "console.log(require('./lib').Curl.getVersionInfoString())"
        
        # Run full test suite
        pnpm test
        Write-Host "Tests passed!" -ForegroundColor Green
    } catch {
        Write-Error "Tests failed: $($_.Exception.Message)"
        throw
    }
}

# Package and publish if needed
if ($env:PUBLISH_BINARY -eq "true") {
    Write-Host "Packaging and publishing binary..." -ForegroundColor Blue
    
    try {
        # Package the binary
        pnpm pregyp package testpackage --verbose
        
        # Get the staged tarball path and publish it
        $stagedTarball = pnpm --silent pregyp reveal staged_tarball --silent
        Write-Host "Publishing: $stagedTarball" -ForegroundColor Cyan
        node scripts\module-packaging.js --publish $stagedTarball
        
        Write-Host "Binary published successfully!" -ForegroundColor Green
    } catch {
        Write-Error "Failed to publish binary: $($_.Exception.Message)"
        throw
    }
}

# Verify installation if binary was published
if ($env:PUBLISH_BINARY -eq "true") {
    Write-Host "Verifying published binary..." -ForegroundColor Blue
    
    $installResult = 0
    try {
        $env:npm_config_fallback_to_build = "false"
        pnpm install --frozen-lockfile --fetch-timeout 300000
        Write-Host "Binary installation verification passed!" -ForegroundColor Green
    } catch {
        $installResult = 1
        Write-Error "Binary installation verification failed!"
        
        # Unpublish the binary if verification fails
        try {
            $hostedTarball = pnpm --silent pregyp reveal hosted_tarball --silent
            Write-Host "Unpublishing: $hostedTarball" -ForegroundColor Yellow
            node scripts\module-packaging.js --unpublish $hostedTarball
            Write-Host "Binary unpublished due to verification failure" -ForegroundColor Yellow
        } catch {
            Write-Warning "Failed to unpublish binary: $($_.Exception.Message)"
        }
        
        throw "Binary verification failed"
    }
}

Write-Host "=== Build script completed successfully! ===" -ForegroundColor Green
