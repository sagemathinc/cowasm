#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: test-wasi-sdk-core-compile.sh BUILD_DIR" >&2
  exit 2
fi

build_dir="$1"
make_cmd="${MAKE:-make}"

cd "$build_dir"

mapfile -t object_targets < <("$make_cmd" -s -f Makefile -f - print-cowasm-core-objects <<'EOF'
print-cowasm-core-objects:
	@printf '%s\n' Programs/python.o $(PARSER_OBJS) $(OBJECT_OBJS) $(PYTHON_OBJS) $(MODULE_OBJS) Modules/_posixsubprocess.o
EOF
)

"$make_cmd" "${object_targets[@]}"
