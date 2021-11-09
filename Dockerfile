# Work in progress Dockerfile for building jsage in a predictable way.

FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="SageMath, Inc. <office@sagemath.com>"

USER root

# Critical required apt dependencies
RUN apt-get update \
  && apt-get install -y git make curl dpkg-dev m4 yasm texinfo python-is-python3 autotools-dev automake libtool libffi-dev

# Required nodejs dependency
RUN  curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g npm@latest

# Download and build wasmer from source using Rust.
# We have to do this since, e.g., there's no wasmer binary for linux-aarch64,
# i.e., docker on a macbook, and we want to support that at least.
RUN  curl https://sh.rustup.rs -sSf > /tmp/install.sh \
  && cd /tmp \
  && sh ./install.sh -y \
  && cd / && git clone https://github.com/wasmerio/wasmer.git && cd wasmer \
  && PATH=/root/.cargo/bin/:$PATH make build-wasmer \
  && cp ./target/release/wasmer  /usr/local/bin/

# Optional convenience dependencies
RUN apt-get install -y vim

# Note that zig-0.8.1 -- though stable -- is completely useless and broken
#  for wasm, unfortunately.   In particular, we quickly hit this with 0.8.x:
#. /zig/lib/std/c.zig:40:16: error: use of undeclared identifier '_errno'
#        return _errno().*;
# This is fixed in 0.9.x: https://github.com/ziglang/zig/issue<sub></sub>s/9414
# Of course it *is* good hardcoding a specific dev version, since these can
# easily go from working to completely broken from one day to the next...
RUN  cd / \
  && export VERSION=0.9.0-dev.1524+d2f9646d9 \
  && curl https://ziglang.org/builds/zig-linux-`uname -m`-$VERSION.tar.xz > zig.tar.xz \
  && mkdir zig \
  && tar xf zig.tar.xz -C zig --strip-components=1 \
  && rm zig.tar.xz \
  && cd /usr/bin \
  && ln -s /zig/zig .

RUN  git clone https://github.com/sagemathinc/jsage \
  && cd jsage && make jpython
