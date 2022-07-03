/*
Compatibility for things that assume they are building against emscripten,
e.g., Python.
*/

#pragma once

#define EM_IMPORT(NAME)

#define _EM_JS(ret, c_name, js_name, params, code)                          \
  ret c_name params EM_IMPORT(js_name);                                     \
  EMSCRIPTEN_KEEPALIVE                                                      \
  __attribute__((section("em_js"), aligned(1))) char __em_js__##js_name[] = \
      #params "<::>" code;                                                  \

#define EM_JS(ret, name, params, ...) \
  _EM_JS(ret, name, name, params, #__VA_ARGS__)

#define EMSCRIPTEN_KEEPALIVE
