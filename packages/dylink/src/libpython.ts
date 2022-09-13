/*
Code that exports function pointers for everything in the Python C API.
The resulting .c code should be included in your main wasm binary so that
dynamic libraries that are Python extension modules can actually work.

**This is important:** It makes function calls from extension modules
to the Python/C API thousands of times faster, and actually work in
general, rather than randomly segfaulting.

Regarding coverage, we ensure that all functions in the stable ABI are
available by reading from Doc/data/stable_abi.dat in the CPython build.
We also add a number of additional non-public internal functions that
were specifically needed for extension modules that are part of the core
Python distribution, partly because we built those as dynamic modules in
many cases to minimize the core python.wasm web assembly bundle.

*/

import spawnAsync from "await-spawn";
import wasmExport, { alias } from "./wasm-export";
import { readFileSync } from "fs";

const PATH = "../cpython/dist/wasm/include/python3.11";

const STABLE_ABI_DATA = "../cpython/build/wasm/Doc/data/stable_abi.dat";

// I tediously made this list.
let omit =
  "Py_UTF PyOS_CheckStack PyObject_AsCharBuffer PyThread_get_thread_native_id PyUnicode_AsMBCSString PyUnicode_DecodeCodePageStateful PyUnicode_DecodeMBCS PyUnicode_DecodeMBCSStateful PyUnicode_EncodeCodePage _PyAST_Compile _PyAccu_Accumulate _PyAccu_Destroy _PyAccu_Finish _PyAccu_FinishAsList _PyAccu_Init _PyArena_AddPyObject _PyArena_Free _PyArena_Malloc _PyArena_New _PyArgv_AsWstrList _PyCode_New _PyCode_Validate _PyConfig_AsDict _PyConfig_FromDict _PyConfig_InitCompatConfig _PyDict_CheckConsistency _PyErr_ChainStackItem _PyErr_CheckSignalsTstate _PyErr_Clear _PyErr_Display _PyErr_ExceptionMatches _PyErr_Fetch _PyErr_Format _PyErr_FormatFromCauseTstate _PyErr_NoMemory _PyErr_NormalizeException _PyErr_Print _PyErr_Restore _PyErr_SetNone _PyErr_SetObject _PyErr_SetString _PyErr_StackItemToExcInfoTuple _PyErr_WriteUnraisableDefaultHook _PyEval_AddPendingCall _PyEval_SignalAsyncExc _PyEval_SignalReceived _PyExc_CreateExceptionGroup _PyExc_PrepReraiseStar _PyFloat_DebugMallocStats _PyFloat_FormatAdvancedWriter _PyFrame_IsEntryFrame _PyGC_DumpShutdownStats _PyInterpreterID_LookUp _PyInterpreterID_New _PyInterpreterState_Enable _PyInterpreterState_GetIDObject _PyInterpreterState_IDDecref _PyInterpreterState_IDIncref _PyInterpreterState_IDInitref _PyInterpreterState_LookUpID _PyLong_FormatAdvancedWriter _PyLong_FormatBytesWriter _PyLong_FormatWriter _PyMem_GetAllocatorName _PyMem_SetDefaultAllocator _PyMem_SetupAllocators _PyOS_InterruptOccurred _PyOS_SigintEvent _PyObject_Call _PyObject_Call_Prepend _PyObject_DebugMallocStats _PyObject_FastCallDictTstate _PyPathConfig_ClearGlobal _PyPreConfig_InitCompatConfig _PyRuntimeState_Fini _PyRuntimeState_Init _PyRuntime_Finalize _PyRuntime_Initialize _PyState_AddModule _PyStructSequence_InitType _PyStructSequence_NewType _PySys_Audit _PySys_SetAttr _PyThreadState_DeleteCurrent _PyThreadState_DeleteExcept _PyThreadState_Init _PyThreadState_SetCurrent _PyThreadState_Swap _PyTime_As100Nanoseconds _PyTraceBack_FromFrame _PyTraceBack_Print_Indented _PyType_CheckConsistency _PyWarnings_Init _PyWideStringList_AsList _PyWideStringList_CheckConsistency _PyWideStringList_Clear _PyWideStringList_Copy _PyWideStringList_Extend _Py_CheckRecursiveCall _Py_ClearArgcArgv _Py_ClearStandardStreamEncoding _Py_DecodeLocaleEx _Py_DecodeUTF8Ex _Py_DecodeUTF8_surrogateescape _Py_DumpASCII _Py_DumpDecimal _Py_DumpExtensionModules _Py_DumpHexadecimal _Py_DumpTraceback _Py_DumpTracebackThreads _Py_EncodeLocaleEx _Py_EncodeLocaleRaw _Py_EncodeUTF8Ex _Py_ForgetReference _Py_GetAllocatedBlocks _Py_GetConfigsAsDict _Py_GetEnv _Py_GetErrorHandler _Py_GetForceASCII _Py_GetLocaleEncoding _Py_GetLocaleEncodingObject _Py_GetLocaleconvNumeric _Py_GetRefTotal _Py_GetSpecializationStats _Py_GetStdlibDir _Py_Get_Getpath_CodeObject _Py_HandleSystemExit _Py_IsLocaleCoercionTarget _Py_NegativeRefcount _Py_PreInitializeFromConfig _Py_PreInitializeFromPyArgv _Py_ResetForceASCII _Py_UTF8_Edit_Cost _Py_WriteIndent _Py_WriteIndentedMargin _Py_closerange _Py_device_encoding _Py_dg_dtoa _Py_dg_freedtoa _Py_dg_infinity _Py_dg_stdnan _Py_dg_strtod _Py_get_blocking _Py_get_env_flag _Py_get_inheritable _Py_get_osfhandle _Py_get_osfhandle_noraise _Py_get_xoption _Py_hashtable_clear _Py_hashtable_compare_direct _Py_hashtable_destroy _Py_hashtable_foreach _Py_hashtable_get _Py_hashtable_hash_ptr _Py_hashtable_new _Py_hashtable_new_full _Py_hashtable_set _Py_hashtable_size _Py_hashtable_steal _Py_normpath _Py_open _Py_open_noraise _Py_open_osfhandle _Py_open_osfhandle_noraise _Py_read _Py_set_blocking _Py_set_inheritable _Py_set_inheritable_async_safe _Py_stat _Py_str_to_int _Py_strhex _Py_strhex_bytes _Py_strhex_bytes_with_sep _Py_strhex_with_sep _Py_wfopen _Py_wgetcwd _Py_wreadlink _Py_wrealpath _Py_write  _Py_write_noraise _PyCodec_Forget _PyObject_LookupSpecial  _PyInterpreterID_Type _PyNamespace_Type _PyRuntime _PyTraceMalloc_Config _Py_HasFileSystemDefaultEncodeErrors _Py_HashSecret_Initialized _Py_RefTotal _Py_UnhandledKeyboardInterrupt _inittab PyObject_AsCharBuffer PyObject_AsReadBuffer PyObject_AsWriteBuffer PySlice_GetIndicesEx  PyStructSequence_UnnamedField Py_Version _PyImport_FrozenBootstrap _PyImport_FrozenStdlib _PyImport_FrozenTest _PyLong_DigitValue _PyParser_TokenNames _Py_tracemalloc_config";

// These are critically needed, but somehow don't get detected below.  I found these
// because extension modules were visibly slow without them, etc.
// TODO: this is caused because in some cases PyAPI appears in a different
// line from the function.  **MUST FIX**

const extra =
  "_PyUnicodeWriter_WriteChar _PyUnicodeWriter_Init _PyUnicodeWriter_Finish _PyUnicodeWriter_Dealloc _PyUnicodeWriter_WriteStr PyCode_NewEmpty PyFrame_New _PyObject_GenericGetAttrWithDict _Py_FatalErrorFunc _PyUnicodeWriter_PrepareInternal _PyBytes_ReverseFind _PyBytes_Find _Py_dup";

const headers =
  "Python.h pyframe.h marshal.h frameobject.h structmember.h internal/pycore_unicodeobject.h internal/pycore_namespace.h internal/pycore_bytesobject.h internal/pycore_symtable.h token.h";

const aliases = {
  Py_INCREF: "Py_IncRef",
  Py_DECREF: "Py_DecRef",
  _PyArg_ParseTupleAndKeywords_SizeT: "PyArg_ParseTupleAndKeywords",
  _PyArg_Parse_SizeT: "PyArg_Parse",
  _PyObject_LookupSpecial: "_PyObject_LookupSpecialId",
  _PyArg_ParseTuple_SizeT: "PyArg_ParseTuple",
};

/*
The stable api data file looks like this:
~/python-wasm/packages/cpython/build/wasm/Doc/data$ more stable_abi.dat
role,name,added,ifdef_note,struct_abi_kind
function,PyAIter_Check,3.10,,
function,PyArg_ValidateKeywordArguments,3.2,,
var,PyBaseObject_Type,3.2,,
...
*/
function stableABI() {
  const names: string[] = [];
  for (const v of readFileSync(STABLE_ABI_DATA).toString().split("\n")) {
    const w = v.split(",");
    if (w.length > 0) {
      if (w[0] == "function" && w[3] != "on Windows" && w[3] != "on platforms with native thread IDs" && w[3] != "on platforms with USE_STACKCHECK") {
        names.push(w[1]);
      }
    }
  }
  return names;
}

async function main() {
  const exclude = new Set(omit.split(/\s+/));
  let names: string[] = [];
  const output = (
    await spawnAsync("grep", ["--no-filename", "PyAPI", "-r", PATH])
  ).toString();
  for (let line of output.split("\n")) {
    line = line.trim();
    if (line.includes("DEPRECATED") || line.includes("Windows")) {
      continue;
    }
    if (line.startsWith("PyAPI_FUNC")) {
      const k = line.lastIndexOf("PyAPI_FUNC");
      if (k == -1) continue;
      line = line.slice(k).split(") ")[1];
      if (line == null) continue;
      const j = line.indexOf("(");
      const name = line.slice(0, j);
      if (name.includes(" ") || exclude.has(name)) continue;
      names.push(name);
    } else if (line.startsWith("PyAPI_DATA")) {
      // EXAMPLES
      // cpython/pythonrun.h:PyAPI_DATA(char) *(*PyOS_ReadlineFunctionPointer)(FILE *, FILE *, const char *);
      // PyAPI_DATA(const char *) Py_FileSystemDefaultEncoding;
      // cpython/unicodeobject.h:PyAPI_DATA(const unsigned char) _Py_ascii_whitespace[];
      // find first ')' space:
      const k = line.indexOf(") ");
      if (k == -1) continue;
      // find first identifier after that space
      const name = line.slice(k + 2).match(/([a-zA-Z_$][a-zA-Z\\d_$]*)/)[0];
      if (name.includes(" ") || exclude.has(name)) continue;
      names.push(name);
    }
  }
  console.log("#define Py_BUILD_CORE");
  console.log("#define PY_SSIZE_T_CLEAN");
  console.log("#undef Py_LIMITED_API");
  for (const name of new Set(headers.split(/\s+/))) {
    console.log(`#include <${name}>`);
  }
  names = names.filter((name) => {
    if (name.startsWith("pthread_")) {
      // python has some conflicting pthread stubs
      return false;
    }
    return true;
  });
  names = names.concat(extra.split(/\s+/));
  // In addition to the above "heuristics", it's critical that we
  // include the entire stable abi, which we get below:
  names = names.concat(stableABI());
  console.log(wasmExport(names));
  for (const name in aliases) {
    console.log(alias(name, aliases[name]));
  }
}

main();

export {};
