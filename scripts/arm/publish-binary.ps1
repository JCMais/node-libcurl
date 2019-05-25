param (
  [ValidateSet('armv7')][string]$arch = "armv7",
  [string]$libcurl = "7.64.1",
  [string]$token = $env:GITHUB_RELEASE_TOKEN,
  [string]$node = "10"
)

$currentDir = Get-Location
$imageName = "node-libcurl-$arch"

Write-Host $arch
Write-Host $token
Write-Host $currentDir
Write-Host $imageName

docker build -t $imageName -f "${currentDir}/scripts/arm/${arch}.dockerfile" .

docker run --rm --name $imageName -it `
  -v "${currentDir}:/home/circleci/node-libcurl/" `
  -v "/home/circleci/node-libcurl/node_modules/" `
  -v "/home/circleci/node-libcurl/debug/" `
  -v "${currentDir}/cache/image-deps-${arch}:/home/circleci/deps/" `
  -e PUBLISH_BINARY=true `
  -e TARGET_ARCH=$arch `
  -e LIBCURL_RELEASE=$libcurl `
  -e LATEST_LIBCURL_RELEASE=$libcurl `
  --entrypoint "/bin/bash" `
  $imageName `
  -c "source ~/.bashrc && nvm use $node && ~/node-libcurl/scripts/arm/publish-binary.sh"
