# DEPRECATED, since we are no longer building a shared libpython.

Goal: use our `libpython.so` in a different shared object library.  This requires first loading `libpython.so`, then loading the other library, and having calls from when use functions from the other... **efficiently**.