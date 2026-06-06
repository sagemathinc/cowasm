#include "Python.h"

#include <stdio.h>

// The TypeScript runtime owns the signal state, since it is stored outside
// WASM memory in a SharedArrayBuffer that supports browser and node interrupts.
extern int wasmGetSignalState(void);

void
_Py_CheckEmscriptenSignals(void)
{
    int sig = wasmGetSignalState();
    if (sig != 0) {
        if (PyErr_SetInterruptEx(sig) != 0) {
            fprintf(stderr, "_Py_CheckEmscriptenSignals: invalid signal = %d\n", sig);
        }
    }
}

#define COWASM_SIGNAL_INTERVAL 50

static int cowasm_signal_counter = COWASM_SIGNAL_INTERVAL;

void
_Py_CheckEmscriptenSignalsPeriodically(void)
{
    cowasm_signal_counter -= 1;
    if (cowasm_signal_counter <= 0) {
        cowasm_signal_counter = COWASM_SIGNAL_INTERVAL;
        _Py_CheckEmscriptenSignals();
    }
}
