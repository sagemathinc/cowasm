The goal here is to link the actual python library into a shared object and load it.  So python isn't in the main module \-\- instead it's entirely fPIC.

Our first goal is to use Python to print hello world.