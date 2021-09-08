cd $BUILD

# Download the OpenSSL source code from github and extract it:
git clone --depth 1 --branch openssl-3.0.0-beta2 https://github.com/openssl/openssl.git openssl.native

git clone openssl.native openssl.wasm

