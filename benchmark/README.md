# Benchmarks

> Disclaimer: Those benchmarks are probably far from real world usage scenarios and should not be taken too seriously before doing tests with your use-case in mind first.

If you feel any of the code available is wrong, please open a PR with a suggested fix.

The idea is just to hit some webpage doing a GET request to `/` and receiving the result body back.

For libraries that do not return the data as string, code to do that should be added, as is the case with Node.js `http.request`, `node-fetch` and `node-libcurl.Easy`.

## Setup

```bash
pnpm --ignore-workspace install
```

## Start

For the local server, you can use any HTTP server, such as [`simple-http-server`](https://crates.io/crates/simple-http-server):
```bash
cargo install simple-http-server
```
then:
```bash
simple-http-server -p 8080 .
```

The results below were obtained using the [`server.js`](./server.js) Node.js server, which can be started with `pnpm start-server`.

The benchmark can be started with `pnpm start`.

### Results

> Format is:
> ```
> #### <OS> - <CPU>
> ##### <http server implementation>
> (results)
> ```

#### Ubuntu WSL 22.04 - AMD Ryzen 7 5700X3D 16 vCPUs
##### node server.js
```bash
libcurl/8.16.0 OpenSSL/3.5.2 zlib/1.3.1 brotli/1.1.0 zstd/1.5.7 libidn2/2.1.1 libssh2/1.10.0 nghttp2/1.66.0 ngtcp2/1.17.0 nghttp3/1.12.0 OpenLDAP/2.6.9
Node.js version: v24.8.0
Platform: linux x64
CPU Cores: 16 vCPUs | 47.0GB Mem

node.js http.request - GET                    | ██████████████████████─── | 4,852 ops/sec | 21 samples 
axios - GET                                   | █████████████──────────── | 2,928 ops/sec | 20 samples 
superagent - GET                              | █████████████▌─────────── | 2,995 ops/sec | 21 samples 
request - GET                                 | ███████████████▌───────── | 3,499 ops/sec | 21 samples 
fetch - GET                                   | █████████████████──────── | 3,744 ops/sec | 21 samples 
got - GET                                     | █████████████▌─────────── | 2,979 ops/sec | 20 samples 
ky - GET                                      | ████████████████───────── | 3,541 ops/sec | 21 samples 
node-libcurl curly - GET                      | █████████████████▌─────── | 3,924 ops/sec | 19 samples 
node-libcurl curly with object pool - GET     | ██████████████████▌────── | 4,147 ops/sec | 20 samples 
node-libcurl Curl - GET                       | ██████████████████─────── | 3,987 ops/sec | 18 samples 
node-libcurl Curl - reusing instance - GET    | ████████████████████▌──── | 4,512 ops/sec | 21 samples 
node-libcurl Easy - GET                       | ████████████████───────── | 3,594 ops/sec | 19 samples 
node-libcurl Easy - reusing instance - GET    | █████████████████████████ | 5,470 ops/sec | 21 samples 
```
```bash
libcurl/8.17.0 OpenSSL/3.5.2 zlib/1.3.1 brotli/1.1.0 zstd/1.5.7 libidn2/2.1.1 libssh2/1.10.0 nghttp2/1.66.0 ngtcp2/1.17.0 nghttp3/1.12.0 OpenLDAP/2.6.9
Node.js version: v24.8.0
Platform: linux x64
CPU Cores: 16 vCPUs | 47.0GB Mem

node.js http.request - GET                    | █████████████████──────── | 4,418 ops/sec | 19 samples 
axios - GET                                   | ███████████────────────── | 2,867 ops/sec | 21 samples 
superagent - GET                              | ███████████────────────── | 2,960 ops/sec | 21 samples 
request - GET                                 | ████████████▌──────────── | 3,232 ops/sec | 19 samples 
fetch - GET                                   | ███████████████▌───────── | 4,022 ops/sec | 21 samples 
got - GET                                     | ███████████────────────── | 2,877 ops/sec | 21 samples 
ky - GET                                      | ████████████▌──────────── | 3,326 ops/sec | 21 samples 
node-libcurl curly - GET                      | █████████████████▌─────── | 4,592 ops/sec | 19 samples 
node-libcurl curly with object pool - GET     | ███████████████████▌───── | 5,079 ops/sec | 20 samples 
node-libcurl Curl - GET                       | ██████████████████─────── | 4,729 ops/sec | 20 samples 
node-libcurl Curl - reusing instance - GET    | █████████████████████──── | 5,530 ops/sec | 19 samples 
node-libcurl Easy - GET                       | ███████████████────────── | 3,985 ops/sec | 20 samples 
node-libcurl Easy - reusing instance - GET    | █████████████████████████ | 6,444 ops/sec | 20 samples 
```

#### Windows 11 - AMD Ryzen 7 5700X3D 16 vCPUs
##### node server.js
```bash
libcurl/8.16.0-DEV OpenSSL/3.5.3 zlib/1.3.1 brotli/1.1.0 zstd/1.5.7 c-ares/1.34.5 WinIDN libssh2/1.11.1_DEV nghttp2/1.67.1 ngtcp2/1.16.0 nghttp3/1.12.0 libgsasl/2.2.2
Node.js version: v24.9.0
Platform: win32 x64
CPU Cores: 16 vCPUs | 127.9GB Mem

node.js http.request - GET                    | ██████████████████─────── | 5,820 ops/sec | 21 samples
axios - GET                                   | █████████──────────────── | 2,987 ops/sec | 19 samples
superagent - GET                              | ██████─────────────────── | 1,960 ops/sec | 21 samples
request - GET                                 | ███████████▌───────────── | 3,729 ops/sec | 21 samples
fetch - GET                                   | ███████████████────────── | 4,853 ops/sec | 20 samples
got - GET                                     | ███████████▌───────────── | 3,696 ops/sec | 21 samples
ky - GET                                      | █████████████──────────── | 4,249 ops/sec | 20 samples
node-libcurl curly - GET                      | █████████████████──────── | 5,510 ops/sec | 19 samples
node-libcurl curly with object pool - GET     | ██████████████████▌────── | 5,950 ops/sec | 19 samples
node-libcurl Curl - GET                       | ██████████████████─────── | 5,759 ops/sec | 21 samples
node-libcurl Curl - reusing instance - GET    | █████████████████████──── | 6,688 ops/sec | 21 samples
node-libcurl Easy - GET                       | ███████────────────────── | 2,267 ops/sec | 20 samples
node-libcurl Easy - reusing instance - GET    | █████████████████████████ | 7,961 ops/sec | 20 samples
```
```bash
libcurl/8.17.0-DEV OpenSSL/3.5.3 zlib/1.3.1 brotli/1.1.0 zstd/1.5.7 c-ares/1.34.5 WinIDN libssh2/1.11.1_DEV nghttp2/1.67.1 ngtcp2/1.16.0 nghttp3/1.12.0 libgsasl/2.2.2
Node.js version: v24.9.0
Platform: win32 x64
CPU Cores: 16 vCPUs | 127.9GB Mem

node.js http.request - GET                    | ███████████████████▌───── | 5,271 ops/sec | 20 samples
axios - GET                                   | ██████████▌────────────── | 2,807 ops/sec | 21 samples
superagent - GET                              | ███████────────────────── | 1,880 ops/sec | 20 samples
request - GET                                 | █████████████──────────── | 3,506 ops/sec | 21 samples
fetch - GET                                   | ████████████████▌──────── | 4,430 ops/sec | 21 samples
got - GET                                     | ████████████▌──────────── | 3,401 ops/sec | 19 samples
ky - GET                                      | ███████████████────────── | 4,109 ops/sec | 21 samples
node-libcurl curly - GET                      | ████████████████████▌──── | 5,514 ops/sec | 20 samples
node-libcurl curly with object pool - GET     | ██████████████████████─── | 5,870 ops/sec | 20 samples
node-libcurl Curl - GET                       | █████████████████████──── | 5,626 ops/sec | 20 samples
node-libcurl Curl - reusing instance - GET    | █████████████████████████ | 6,662 ops/sec | 21 samples
node-libcurl Easy - GET                       | ████████───────────────── | 2,213 ops/sec | 20 samples
node-libcurl Easy - reusing instance - GET    | ███████████████████────── | 5,116 ops/sec | 19 samples
```
#### macOS 16 - m1
##### node server.js
```bash
libcurl/8.16.0 OpenSSL/3.5.2 zlib/1.2.12 brotli/1.1.0 zstd/1.4.9 libidn2/2.1.1 libssh2/1.10.0 nghttp2/1.66.0 ngtcp2/1.17.0 nghttp3/1.12.0 OpenLDAP/2.6.9
Node.js version: v24.8.0
Platform: darwin arm64
CPU Cores: 10 vCPUs | 32.0GB Mem

node.js http.request - GET                    | ███████████████████████▌─ | 11,678 ops/sec | 20 samples 
axios - GET                                   | ███████████────────────── | 5,577 ops/sec | 20 samples 
superagent - GET                              | ███████████────────────── | 5,506 ops/sec | 21 samples 
request - GET                                 | ████████████████───────── | 7,906 ops/sec | 21 samples 
fetch - GET                                   | ██████████████████▌────── | 9,210 ops/sec | 20 samples 
got - GET                                     | █████████████▌─────────── | 6,847 ops/sec | 21 samples 
ky - GET                                      | ████████████████▌──────── | 8,184 ops/sec | 21 samples 
node-libcurl curly - GET                      | ████████████████████▌──── | 10,262 ops/sec | 21 samples 
node-libcurl curly with object pool - GET     | ████████████████████▌──── | 10,068 ops/sec | 21 samples 
node-libcurl Curl - GET                       | ██████████████████████▌── | 11,141 ops/sec | 21 samples 
node-libcurl Curl - reusing instance - GET    | ████████████████████████▌ | 12,124 ops/sec | 20 samples 
node-libcurl Easy - GET                       | ██████████▌────────────── | 5,300 ops/sec | 19 samples 
node-libcurl Easy - reusing instance - GET    | █████████████████████████ | 12,250 ops/sec | 20 samples 
```
```bash
libcurl/8.17.0 OpenSSL/3.5.2 zlib/1.2.12 brotli/1.1.0 zstd/1.4.9 libidn2/2.1.1 libssh2/1.10.0 nghttp2/1.66.0 ngtcp2/1.17.0 nghttp3/1.12.0 OpenLDAP/2.6.9
Node.js version: v24.8.0
Platform: darwin arm64
CPU Cores: 10 vCPUs | 32.0GB Mem

node.js http.request - GET                    | █████████████████████████ | 14,874 ops/sec | 20 samples 
axios - GET                                   | ████████████▌──────────── | 7,552 ops/sec | 21 samples 
superagent - GET                              | ██████████▌────────────── | 6,442 ops/sec | 20 samples 
request - GET                                 | ███████████████────────── | 8,953 ops/sec | 20 samples 
fetch - GET                                   | ███████████████────────── | 9,158 ops/sec | 21 samples 
got - GET                                     | ████████████▌──────────── | 7,654 ops/sec | 20 samples 
ky - GET                                      | █████████████──────────── | 7,781 ops/sec | 21 samples 
node-libcurl curly - GET                      | ██████████████████─────── | 10,822 ops/sec | 21 samples 
node-libcurl curly with object pool - GET     | ███████████████████▌───── | 11,896 ops/sec | 20 samples 
node-libcurl Curl - GET                       | ███████████████████────── | 11,466 ops/sec | 20 samples 
node-libcurl Curl - reusing instance - GET    | █████████████████████──── | 12,758 ops/sec | 20 samples 
node-libcurl Easy - GET                       | ████████▌──────────────── | 5,269 ops/sec | 19 samples 
node-libcurl Easy - reusing instance - GET    | ████████████████████───── | 12,171 ops/sec | 20 samples  
```
