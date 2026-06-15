#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: prepare-wasm-build.sh BUILD_DIR SETUP_LOCAL" >&2
  exit 2
fi

build_dir="$1"
setup_local="$2"
src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pnpm exec dylink-libpython "$build_dir" >"$build_dir/Programs/libpython.c"
cp "$src_dir/cowasm_signal.c" "$build_dir/Programs/cowasm_signal.c"
ln -sf "$src_dir/rebuild" "$build_dir/rebuild"
cp "$src_dir/config.site" "$build_dir"
cp "$setup_local" "$build_dir/Modules/Setup.local"
cp "$src_dir/sitecustomize.py" "$build_dir/Lib"
cp "$src_dir/cowasm_bundler.py" "$build_dir/Lib"
cp "$src_dir/cowasm_importer.py" "$build_dir/Lib"
mkdir "$build_dir/sys"
echo '#include "posix-wasm.h"' >"$build_dir/sys/wait.h"

patches=(
  01-main.patch
  02-pydoc.patch
  03-wasm-assets.patch
  04-enable-subprocess-tests.patch
  05-st_mode.patch
  06-platform.patch
  07-subprocess.patch
  08-os-spawn-subprocess.patch
  09-set-inheritable.patch
  11-ceval-wasi-emscripten.patch
  12-timemodule-clang15.patch
  13-socket-unmodified-headers.patch
  19-noninteractive-script-files.patch
  20-noninteractive-stdin-main.patch
  21-ssl-purpose-txt2obj.patch
  22-regrtest-stty-enotty.patch
  23-regrtest-no-sysconfig-env.patch
  24-wasip1-multiarch-alias.patch
)

for patch_name in "${patches[@]}"; do
  patch -d "$build_dir" -p1 <"$src_dir/patches/$patch_name"
done
