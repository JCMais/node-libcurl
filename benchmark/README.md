## Benchmarks
> Disclaimer: Those benchmarks are probably far from real world usage scenarios and should not be taken too seriously before doing tests with your use-case in mind first.

If you feel any of the code available is wrong, please open a PR with a suggested fix.

The idea is just to hit some webpage  doing a GET request to `/` and receiving the result body back.

For libraries that do not return the data as string, code to do that should be added, as is the case with Node.js `http.request`, `node-fetch` and `node-libcurl.Easy`.

A local server can be started with `yarn start-server`.

Benchmark can be started with `yarn start`.

### Results
#### Win64 i7-7700HQ 3.4GHz
##### local server
```
node.js http.request - GET x 395 ops/sec ±3.92% (68 runs sampled)
axios - GET x 328 ops/sec ±5.84% (64 runs sampled)
superagent - GET x 410 ops/sec ±2.31% (75 runs sampled)
request - GET x 405 ops/sec ±2.85% (75 runs sampled)
fetch - GET x 392 ops/sec ±3.66% (70 runs sampled)
node-libcurl curly - GET x 657 ops/sec ±1.78% (77 runs sampled)
node-libcurl Curl - GET x 696 ops/sec ±1.66% (79 runs sampled)
node-libcurl Curl - reusing instance - GET x 673 ops/sec ±2.17% (78 runs sampled)
node-libcurl Easy - GET x 173 ops/sec ±12.30% (55 runs sampled)
node-libcurl Easy - reusing instance - GET x 532 ops/sec ±5.42% (63 runs sampled)
Fastest is node-libcurl Curl - GET
Done in 61.27s
```
##### example.com
```
node.js http.request - GET x 3.62 ops/sec ±1.87% (22 runs sampled)
axios - GET x 3.65 ops/sec ±2.60% (22 runs sampled)
superagent - GET x 3.68 ops/sec ±1.20% (22 runs sampled)
request - GET x 3.64 ops/sec ±1.73% (22 runs sampled)
fetch - GET x 3.67 ops/sec ±1.26% (22 runs sampled)
node-libcurl curly - GET x 7.16 ops/sec ±5.35% (39 runs sampled)
node-libcurl Curl - GET x 7.30 ops/sec ±1.51% (39 runs sampled)
node-libcurl Curl - reusing instance - GET x 7.25 ops/sec ±2.16% (38 runs sampled)
node-libcurl Easy - GET x 3.60 ops/sec ±2.50% (13 runs sampled)
node-libcurl Easy - reusing instance - GET x 3.62 ops/sec ±1.25% (22 runs sampled)
Fastest is node-libcurl Curl - GET,node-libcurl Curl - reusing instance - GET,node-libcurl curly - GET
Done in 64.24s.
```
#### macOS i7-7820HQ 2.9GHz
##### local server
```
node.js http.request - GET x 851 ops/sec ±6.15% (64 runs sampled)
axios - GET x 709 ops/sec ±17.13% (66 runs sampled)
superagent - GET x 687 ops/sec ±37.44% (66 runs sampled)
request - GET x 814 ops/sec ±5.18% (71 runs sampled)
fetch - GET x 31.91 ops/sec ±206.96% (14 runs sampled)
node-libcurl curly - GET x 956 ops/sec ±14.76% (60 runs sampled)
node-libcurl Curl - GET x 1,155 ops/sec ±10.47% (67 runs sampled)
node-libcurl Curl - reusing instance - GET x 1,178 ops/sec ±5.78% (74 runs sampled)
node-libcurl Easy - GET x 875 ops/sec ±6.66% (77 runs sampled)
node-libcurl Easy - reusing instance - GET x 1,333 ops/sec ±3.19% (76 runs sampled)
Fastest is node-libcurl Easy - reusing instance - GET
✨  Done in 77.74s
```
##### example.com
```
node.js http.request - GET x 3.55 ops/sec ±6.69% (22 runs sampled)
axios - GET x 3.69 ops/sec ±1.05% (22 runs sampled)
superagent - GET x 3.62 ops/sec ±1.79% (22 runs sampled)
request - GET x 3.65 ops/sec ±1.92% (22 runs sampled)
fetch - GET x 3.60 ops/sec ±1.74% (22 runs sampled)
node-libcurl curly - GET x 6.79 ops/sec ±7.51% (38 runs sampled)
node-libcurl Curl - GET x 5.90 ops/sec ±11.24% (34 runs sampled)
node-libcurl Curl - reusing instance - GET x 7.22 ops/sec ±1.61% (38 runs sampled)
node-libcurl Easy - GET x 3.66 ops/sec ±1.65% (14 runs sampled)
node-libcurl Easy - reusing instance - GET x 3.62 ops/sec ±3.02% (22 runs sampled)
Fastest is node-libcurl Curl - reusing instance - GET,node-libcurl curly - GET
✨  Done in 67.36s.
```

#### Ubuntu 19.10 i7-5500U 2.4GHz - Linux 5.3.0-42 - Node v12.16.2
##### local server
node.js http.request - GET x 720 ops/sec ±2.65% (74 runs sampled)
axios - GET x 611 ops/sec ±2.14% (78 runs sampled)
superagent - GET x 681 ops/sec ±1.80% (77 runs sampled)
request - GET x 671 ops/sec ±2.14% (76 runs sampled)
fetch - GET x 686 ops/sec ±2.17% (77 runs sampled)
node-libcurl curly - GET x 857 ops/sec ±1.95% (76 runs sampled)
node-libcurl Curl - GET x 885 ops/sec ±2.00% (78 runs sampled)
node-libcurl Curl - reusing instance - GET x 887 ops/sec ±2.36% (77 runs sampled)
node-libcurl Easy - GET x 887 ops/sec ±1.61% (81 runs sampled)
node-libcurl Easy - reusing instance - GET x 1,007 ops/sec ±1.62% (78 runs sampled)
Fastest is node-libcurl Easy - reusing instance - GET

real	0m59,502s
user	0m19,020s
sys	0m3,756s

##### example.com
node.js http.request - GET x 3.42 ops/sec ±0.95% (21 runs sampled)
axios - GET x 3.44 ops/sec ±1.16% (21 runs sampled)
superagent - GET x 3.41 ops/sec ±1.31% (21 runs sampled)
request - GET x 3.43 ops/sec ±1.37% (21 runs sampled)
fetch - GET x 3.38 ops/sec ±0.83% (21 runs sampled)
node-libcurl curly - GET x 6.61 ops/sec ±5.47% (36 runs sampled)
node-libcurl Curl - GET x 6.82 ops/sec ±0.09% (36 runs sampled)
node-libcurl Curl - reusing instance - GET x 6.80 ops/sec ±0.10% (36 runs sampled)
node-libcurl Easy - GET x 3.46 ops/sec ±1.18% (13 runs sampled)
node-libcurl Easy - reusing instance - GET x 3.44 ops/sec ±1.02% (21 runs sampled)
Fastest is node-libcurl Curl - GET

real	1m5,417s
user	0m3,469s
sys	0m0,229s
