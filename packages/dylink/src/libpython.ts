/*
Code that exports function pointers for everything in the Python C API.
The resulting .c code should be included in your main wasm binary, for dynamic
libraries that are Python extension modules.  It makes things thousands
of times faster.
*/

import spawnAsync from "await-spawn";
import funcPointers from "./func-pointers";

const path = "../cpython/dist/wasm/include/python3.11";

const omit = "PyCFunction_Call PyFrame_FastToLocals PyFrame_FastToLocalsWithError PyFrame_LocalsToFast PyFrame_New PyMarshal_ReadLastObjectFromFile PyMarshal_ReadLongFromFile PyMarshal_ReadObjectFromFile PyMarshal_ReadObjectFromString PyMarshal_ReadShortFromFile PyMarshal_WriteLongToFile PyMarshal_WriteObjectToFile PyMarshal_WriteObjectToString PyMember_GetOne PyMember_SetOne PyOS_CheckStack PySymtable_Lookup PyThread_get_thread_native_id PyToken_OneChar PyToken_ThreeChars PyToken_TwoChars PyUnicode_AsMBCSString PyUnicode_DecodeCodePageStateful PyUnicode_DecodeMBCS PyUnicode_DecodeMBCSStateful PyUnicode_EncodeCodePage _PyAST_Compile _PyAccu_Accumulate _PyAccu_Destroy _PyAccu_Finish _PyAccu_FinishAsList _PyAccu_Init _PyArena_AddPyObject _PyArena_Free _PyArena_Malloc _PyArena_New _PyArgv_AsWstrList _PyCode_New _PyCode_Validate _PyConfig_AsDict _PyConfig_FromDict _PyConfig_InitCompatConfig _PyDict_CheckConsistency _PyErr_ChainStackItem _PyErr_CheckSignalsTstate _PyErr_Clear _PyErr_Display _PyErr_ExceptionMatches _PyErr_Fetch _PyErr_Format _PyErr_FormatFromCauseTstate _PyErr_NoMemory _PyErr_NormalizeException _PyErr_Print _PyErr_Restore _PyErr_SetNone _PyErr_SetObject _PyErr_SetString _PyErr_StackItemToExcInfoTuple _PyErr_WriteUnraisableDefaultHook _PyEval_AddPendingCall _PyEval_SignalAsyncExc _PyEval_SignalReceived _PyExc_CreateExceptionGroup _PyExc_PrepReraiseStar _PyFloat_DebugMallocStats _PyFloat_FormatAdvancedWriter _PyFrame_IsEntryFrame _PyGC_DumpShutdownStats _PyInterpreterID_LookUp _PyInterpreterID_New _PyInterpreterState_Enable _PyInterpreterState_GetIDObject _PyInterpreterState_IDDecref _PyInterpreterState_IDIncref _PyInterpreterState_IDInitref _PyInterpreterState_LookUpID _PyLong_FormatAdvancedWriter _PyLong_FormatBytesWriter _PyLong_FormatWriter _PyMem_GetAllocatorName _PyMem_SetDefaultAllocator _PyMem_SetupAllocators _PyNamespace_New _PyOS_InterruptOccurred _PyOS_SigintEvent _PyObject_Call _PyObject_Call_Prepend _PyObject_DebugMallocStats _PyObject_FastCallDictTstate _PyPathConfig_ClearGlobal _PyPreConfig_InitCompatConfig _PyRuntimeState_Fini _PyRuntimeState_Init _PyRuntime_Finalize _PyRuntime_Initialize _PyState_AddModule _PyStructSequence_InitType _PyStructSequence_NewType _PySys_Audit _PySys_SetAttr _PyThreadState_DeleteCurrent _PyThreadState_DeleteExcept _PyThreadState_Init _PyThreadState_SetCurrent _PyThreadState_Swap _PyTime_As100Nanoseconds _PyTraceBack_FromFrame _PyTraceBack_Print_Indented _PyType_CheckConsistency _PyWarnings_Init _PyWideStringList_AsList _PyWideStringList_CheckConsistency _PyWideStringList_Clear _PyWideStringList_Copy _PyWideStringList_Extend _Py_CheckRecursiveCall _Py_ClearArgcArgv _Py_ClearStandardStreamEncoding _Py_DecodeLocaleEx _Py_DecodeUTF8Ex _Py_DecodeUTF8_surrogateescape _Py_DumpASCII _Py_DumpDecimal _Py_DumpExtensionModules _Py_DumpHexadecimal _Py_DumpTraceback _Py_DumpTracebackThreads _Py_EncodeLocaleEx _Py_EncodeLocaleRaw _Py_EncodeUTF8Ex _Py_ForgetReference _Py_GetAllocatedBlocks _Py_GetConfigsAsDict _Py_GetEnv _Py_GetErrorHandler _Py_GetForceASCII _Py_GetLocaleEncoding _Py_GetLocaleEncodingObject _Py_GetLocaleconvNumeric _Py_GetRefTotal _Py_GetSpecializationStats _Py_GetStdlibDir _Py_Get_Getpath_CodeObject _Py_HandleSystemExit _Py_IsLocaleCoercionTarget _Py_NegativeRefcount _Py_PreInitializeFromConfig _Py_PreInitializeFromPyArgv _Py_ResetForceASCII _Py_UTF8_Edit_Cost _Py_WriteIndent _Py_WriteIndentedMargin _Py_closerange _Py_device_encoding _Py_dg_dtoa _Py_dg_freedtoa _Py_dg_infinity _Py_dg_stdnan _Py_dg_strtod _Py_dup _Py_fstat _Py_fstat_noraise _Py_get_blocking _Py_get_env_flag _Py_get_inheritable _Py_get_osfhandle _Py_get_osfhandle_noraise _Py_get_xoption _Py_hashtable_clear _Py_hashtable_compare_direct _Py_hashtable_destroy _Py_hashtable_foreach _Py_hashtable_get _Py_hashtable_hash_ptr _Py_hashtable_new _Py_hashtable_new_full _Py_hashtable_set _Py_hashtable_size _Py_hashtable_steal _Py_normpath _Py_open _Py_open_noraise _Py_open_osfhandle _Py_open_osfhandle_noraise _Py_read _Py_set_blocking _Py_set_inheritable _Py_set_inheritable_async_safe _Py_stat _Py_str_to_int _Py_strhex _Py_strhex_bytes _Py_strhex_bytes_with_sep _Py_strhex_with_sep _Py_wfopen _Py_wgetcwd _Py_wreadlink _Py_wrealpath _Py_write  _Py_write_noraise";

async function main() {
  const exclude = new Set(omit.split(" "));
  const names: string[] = [];
  const output = (
    await spawnAsync("grep", ["PyAPI_FUNC", "-r", path])
  ).toString();
  for (let line of output.split("\n")) {
    if (line.includes("DEPRECATED")) continue;
    const l = line;
    const k = line.lastIndexOf("PyAPI_FUNC");
    if (k == -1) continue;
    line = line.slice(k).split(") ")[1];
    if (line == null) continue;
    const j = line.indexOf("(");
    const name = line.slice(0, j);
    if (name.includes("Windows") || name.includes(" ") || exclude.has(name))
      continue;
    if (!name) {
      console.log({ l });
    }
    names.push(name);
  }
  console.log("#include <Python.h>");
  console.log(funcPointers(names));
}

main();

export {};
