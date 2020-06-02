## Contributing with Issues

Before opening an issue try to search the existing ones for the same problem.

Make sure to include on your issue the following information:

* Node.js Version
* yarn / npm version
* Operational System (name and version)
* Package version
* Logs of the installation

## Contributing with Code

The package manager used on this project is [`yarn`](https://yarnpkg.com/)

The addon lib code is written in Typescript, while the addon itself is written in C++.

Folders [`./scripts`](./scripts) and [`./tools`](./tools) contain scripts in Javascript, those are used mostly during installation and on CI.

### C/C++
#### Code Style
C/C++ code is written following Google style guide (with some minor changes), and [`clang-format`](https://clang.llvm.org/docs/ClangFormat.html) can/should be used to automatically format the code. There is already a `.clang-format` on the repository.

#### Linting
`cpplint` is used to lint C/C++ code

### Typescript / Javascript
#### Code Style
TS/JS code should be formatted using prettier

#### Linting
`ts-lint` is used to lint TS code, while JS code is using `eslint`.

### Setup

If on Windows, first you will need to grab the deps:
```sh
$ node tools/update-deps.js
```

Install the dependencies, this will also build the addon:
```sh
$ yarn install
```

If you made some change to the C++ code, you can just build the addon again:
```sh
$ yarn pregyp build
```

In case you need to rebuild:
```sh
$ yarn pregyp rebuild
```

If you have any issues with the build process, please refer to a [readme build troubleshooting section](https://github.com/JCMais/node-libcurl#important-notes-on-prebuilt-binaries--direct-installation).

### Adding New libcurl Options

If you want to include a new libcurl option on the addon, those are the basic steps:

1. Add the option to their correct category on [`Curl.cc`](./src/Curl.cc)
   There are different vectors there for the expected type of the option's value, like `curlOptionInteger`, `curlOptionString`, etc.
   Make sure to use a `#if` directive to include this option only if building against a libcurl version that supports it, otherwise there will be an compilation error on older versions.
2. In case the option expects a value of type other than `number | string | boolean`, you must also add it to their respective key on the object `optionKindMap` inside [`./scripts/data/options.js`](./scripts/data/options.js). In case you add it to the `other` key, which means this option has a specific value, you must also add the option expected value type to the object `optionKindValueMap` right below, on that same file.
3. Run `node ./scripts/build-constants.js`, this will generate an updated list of options on [`./lib/generated/`](./lib/generated), and also update the files [`./lib/Curl.ts`] and [`./lib/EasyNativeBinding.ts`] with overloads for the `setOpt` method. Make sure the options added are correct.

### Changing libcurl Version Used on Prebuilt Binaries for Windows

You will need to open a PR against the repository [`JCMais/curl-for-windows`](https://github.com/JCMais/curl-for-windows/) upgrading libcurl there.

After that a new tag will be created on this repo, which we can them use on the file [`LIBCURL_VERSION_WIN_DEPS`](./LIBCURL_VERSION_WIN_DEPS).

### Debugging with lldb
1. Install lldb
On Debian based linux:
```
sudo apt-get install lldb
```

2. Install Node.js lldb plugin:
```
npm i -g llnode
```

3. Run script that causes core dump
```
llnode -- /path/to/bin/node --abort_on_uncaught_exception script.js
```

4. Profit


More information go to https://github.com/nodejs/llnode

### Publishing New Releases

We are using [`np`](https://github.com/sindresorhus/np) for releases.

#### Semver Major / Minor / Patch

1. Checkout `master`
2. Merge changes from `develop`
3. Update docs by running `yarn docs` and commit the changes.
4. Create version
5. Publish

So basically:
```bash
git checkout master
git merge develop
```
And then:
```bash
npx np [major|minor|patch]
```

or if you are having trouble with `np`:
```bash
yarn publish
```

or even if you are having trouble with `yarn`:
```bash
npm version [major|minor|patch]
npm publish
```

And finally
```bash
git push --follow-tags
git checkout develop
git merge master
git push
```

#### Prereleases

For prereleases, use something like this from the `develop` branch:
```shell
$ yarn np prerelease --any-branch --tag next
```

If for some reason np fails to run with Yarn, you can use this command to skip cleaning up and use npm to publish:
```shell
$ yarn np prerelease --no-yarn --no-cleanup --any-branch --tag next
```
