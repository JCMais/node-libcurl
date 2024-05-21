with import <nixpkgs> { };

mkShell {
  nativeBuildInputs = [
    nodejs_20
    electron_29
    stdenv.cc.cc.lib
  ];
  LD_LIBRARY_PATH = "${stdenv.cc.cc.lib}/lib64:$LD_LIBRARY_PATH";
  ELECTRON_OVERRIDE_DIST_PATH = "${electron_29}/bin/";
  ELECTRON_PATH = "${electron_29}/bin/electron";
  ELECTRON_SKIP_BINARY_DOWNLOAD = 1;
}
