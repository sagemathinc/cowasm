cd $BUILD

# Download the Python source code from python.org and extract it:
curl https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tar.xz -o Python-$PYTHON_VERSION.tar.xz
tar xvf Python-$PYTHON_VERSION.tar.xz
mv Python-$PYTHON_VERSION Python-$PYTHON_VERSION.native
tar xvf Python-$PYTHON_VERSION.tar.xz
mv Python-$PYTHON_VERSION Python-$PYTHON_VERSION.wasm
rm Python-$PYTHON_VERSION.tar.xz

