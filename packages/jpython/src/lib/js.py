# Code that is NOT written in valid Python syntax, but can
# be used from valid python code to accomplish various things
# that are needed.

# This gives us the new operator as a Python function call:
def js_new(f, *args, **kwds):
    return new f(*args, **kwds)

def js_instanceof(obj, cls):
    return r"%js obj instanceof cls"