/*
This is "Hello World" for CoWasm.

To build and run under WaCalc:

   make run-hello.wasm

The resulting program is VERY SMALL (235 bytes):

~/cowasm/packages/kernel$ ls -l build/test/hello.wasm
-rwxr-xr-x  1 wstein  staff  235 Oct 30 08:02 build/test/hello.wasm

~/cowasm/packages/kernel$ wasm2wat build/test/hello.wasm
(module
  (type (;0;) (func (param i32) (result i32)))
  (type (;1;) (func))
  (type (;2;) (func (param i32 i32) (result i32)))
  (import "env" "memory" (memory (;0;) 1))
  (import "env" "__memory_base" (global (;0;) i32))
  (import "env" "__table_base" (global (;1;) i32))
  (import "env" "puts" (func (;0;) (type 0)))
  (func (;1;) (type 1))
  (func (;2;) (type 1))
  (func (;3;) (type 2) (param i32 i32) (result i32)
    global.get 0
    i32.const 0
    i32.add
    call 0
    drop
    i32.const 0)
  (export "__wasm_call_ctors" (func 1))
  (export "__wasm_apply_data_relocs" (func 2))
  (export "__main_argc_argv" (func 3))
  (data (;0;) (global.get 0) "Hello from CoWasm!\00"))

*/

#include <stdio.h>

int main(int argc, char** argv) {
  printf("Hello from CoWasm!\n");
  return 0;
}
