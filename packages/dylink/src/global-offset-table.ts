import FunctionTable from "./function-table";
import debug from "debug";

const log = debug("dylink:global-offset-table");

// Global Offset Table
export default class GlobalOffsetTable {
  private GOT: { [key: string]: WebAssembly.Global } = {};

  public readonly memMap: { [key: string]: WebAssembly.Global } = {};
  public readonly funcMap: {
    [key: string]: { index: number; set: (f: Function) => void };
  } = {};
  public readonly mem: { [key: string]: WebAssembly.Global };
  public readonly func: { [key: string]: WebAssembly.Global };
  private getMainInstanceExports: () => { [key: string]: any };
  private functionTable: FunctionTable;

  constructor(
    getMainInstanceExports: () => { [key: string]: any },
    functionTable: FunctionTable
  ) {
    this.mem = new Proxy(this.GOT, { get: this.GOTMemHandler.bind(this) });
    this.func = new Proxy(this.GOT, { get: this.GOTFuncHandler.bind(this) });
    this.getMainInstanceExports = getMainInstanceExports;
    this.functionTable = functionTable;
  }

  private GOTMemHandler(_, key: string) {
    if (key in this.GOT) {
      return Reflect.get(this.GOT, key);
    }
    /*
    The spec has the following (garbled?) statement about what this is:
    "However since exports are static, modules connect [sic -- cannot?]
    export the final relocated addresses (i.e. they cannot add
    __memory_base before exporting). Thus, the exported address is
    before relocation; the loader, which knows __memory_base, can
    then calculate the final relocated address."

    In any case, what we need to do here is return the *memory address*
    of the variable with name key.  For example, if key='stdin', we
    are returning the address of the stdin file descriptor (that integer).
    */

    let rtn = this.GOT[key];
    if (!rtn) {
      const x = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        0
      );
      this.memMap[key] = x;
      rtn = this.GOT[key] = x;
    }
    return rtn;
  }

  private GOTFuncHandler(_, key: string) {
    if (key in this.GOT) {
      return Reflect.get(this.GOT, key);
    }
    let rtn = this.GOT[key];
    if (!rtn) {
      // Dynamic module needs a *pointer* to the function with name "key".
      // There are several possibilities:
      //
      // 1. This function is already in a our global function table, from
      // the main module or another dynamic link library defining it. An
      // example is the function strcmp from libc, which is often used as a pointer
      // with qsort.  In that case, we know the pointer and immediately
      // set the value of the function pointer to that value -- it's important
      // to use the *same* pointer in both the main module and the dynamic library,
      // rather than making another one just for the dynamic library (which would
      // waste space, and completely breaks functions like qsort that take a
      // function pointer).
      //
      // 2. Another likely possibility is that this is a function that will get defined
      // as a side effect of the dynamic link module being loaded.  We don't know
      // what address that function will get, so in that case we create an entry
      // in funcMap, and later below we update the pointer created here.
      //
      // 3. A third possibility is that the requested function isn't in the
      // function pointer table but it's made available via the Javascript
      // environment.  As far as I know, there is no way to make such a Javascript
      // function available as a function pointer aside from creating a new compiled
      // function in web assembly that calls that Javascript function, so this is
      // a fatal error, and we have to modify libc.ts to make such a wrapper.  This
      // happened with geteuid at one point, which comes from node.js.
      //
      // 4. The function might be defined in another dynamic library that hasn't
      // been loaded yet.  We have NOT addressed this problem yet, and this must
      // also be a fatal error.
      //
      let value;
      const f = this.getMainInstanceExports()[`__WASM_EXPORT__${key}`];
      if (f == null) {
        // new function:  have to do further work below to add this to table.
        this.funcMap[key] = this.functionTable.setLater();
        value = this.funcMap[key].index;
      } else {
        // existing function perhaps from libc, e.g., "strcmp".
        value = (f as Function)();
      }
      log("GOTFuncHandler ", key, "-->", value);
      // place in the table -- we make a note of where to put it,
      // and actually place it later below after the import is done.
      const ptr = new WebAssembly.Global(
        {
          value: "i32",
          mutable: true,
        },
        value
      );
      rtn = this.GOT[key] = ptr;
    }
    return rtn;
  }
}
