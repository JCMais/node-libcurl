{
  inputs = {
    node-20-16-nixpkgs.url = "github:nixos/nixpkgs/8a977702729f2d763adc3e214513d517dcb94d9b";
  };
  outputs = { self, nixpkgs, ... }@inputs:
    let
      forAllSystems = with nixpkgs.lib; f: foldAttrs mergeAttrs { }
        (map (s: { ${s} = f s; }) systems.flakeExposed);
    in
    {
      devShell = forAllSystems
        (system:
          let
            pkgs = nixpkgs.legacyPackages.${system};
          in
          pkgs.mkShell {
            buildInputs = [
              inputs.node-20-16-nixpkgs.legacyPackages.${system}.nodejs_20
            ];

            nativeBuildInputs = with pkgs; [
              stdenv.cc.cc.lib
              cmake
              wget
              coreutils-prefixed
              python3
              zlib
              groff
            ];

            packages = [

            ];
            ELECTRON_SKIP_BINARY_DOWNLOAD = 1;
            LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib64:$LD_LIBRARY_PATH";
          });
    };
}
