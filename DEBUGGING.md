# Debugging

This guide provides information on how to debug the addon using LLDB (and potentially llnode).

## Quick Start

### 1. Build Debug Version

The first step, is building a debug version of the addon. If you are building from static libraries, you can provide the same flags here.
```bash
pnpm pregyp rebuild --debug
# You can also enable extra debug logging
pnpm pregyp rebuild --debug --node_libcurl_debug=true
# Or build with AddressSanitizer for memory error detection
pnpm pregyp rebuild --debug --node_libcurl_asan_debug=true
```

### 2. Create a Test File
Create a file named `debug-test.hidden.js` with the following content:

```js
#!/usr/bin/env node
const path = require('path')

const nodeLibcurl = require(
  path.join(__dirname, '..', 'lib', 'binding', 'node_libcurl.node'),
)

const log = (message) => {
  console.log(
    `[nodejs main] [thread: ${nodeLibcurl.Curl.THREAD_ID}] ${message}`,
  )
}

async function main() {
  try {
    log('🚀 Starting Debug Test\n')

    const easy = new nodeLibcurl.Easy()
    const multi = new nodeLibcurl.Multi()
    easy.setOpt('URL', 'https://httpbin.org/get')
    multi.addHandle(easy)

    let resolve
    const promise = new Promise((res) => {
      resolve = res
    })

    multi.onMessage((...args) => {
      console.log('Message callback called', args)
      resolve()
    })

    easy.perform()

    await promise

    console.log('\n✅ Test completed successfully!')
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

main()
```

### 3. Run Under LLDB
```bash
lldb -- node debug-test.hidden.js
```

### 4. Debug
```lldb
run
```

## Building Node.js from Source

This assumes MacOS, but similar commands will work elsewhere.

```sh
NODE_VERSION=20.18.1
git clone --depth 1 --branch v${NODEVERSION} https://github.com/nodejs/node
./configure --prefix ~/node-from-source/${NODEVERSION} --v8-non-optimized-debug --v8-with-dchecks --debug --debug-node
make -j$(sysctl -n hw.logicalcpu)
make install
```

After building, you can rebuild the addon so it uses that version of Node.js:
```bash
pnpm pregyp rebuild --debug --nodedir=~/node-from-source/$NODEVERSION
```
