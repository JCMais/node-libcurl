with import <nixpkgs> { };

mkShell {
  nativeBuildInputs = [
    nodejs_20
    electron_31
    stdenv.cc.cc.lib
    cmake
    wget
    coreutils-prefixed
    python3
    zlib
    groff
  ];
  LD_LIBRARY_PATH = "${stdenv.cc.cc.lib}/lib64:$LD_LIBRARY_PATH";
  ELECTRON_OVERRIDE_DIST_PATH = "${electron_31}/bin/";
  ELECTRON_PATH = "${electron_31}/bin/electron";
  ELECTRON_SKIP_BINARY_DOWNLOAD = 1;
}
# RUN_TESTS=true RUN_PREGYP_CLEAN=true PUBLISH_BINARY=false ./scripts/ci/build.sh
