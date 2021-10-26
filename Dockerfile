# Work in progress Dockerfile for building jsage in a predictable way.

FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="SageMath, Inc. <office@sagemath.com>"

USER root

# Critical required apt dependencies
RUN apt-get update \
  && apt-get install -y git make curl dpkg-dev m4 yasm texinfo python-is-python3 autotools-dev automake libtool

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

# TODO: you must install zig for the architecture you are on
# manually right now -- this won't work.  We will make installing
# the latest zig automatic as part of the make below soon enough,
# since there is no easy way from the zig devs yet to do this.

RUN  cd / \
  && curl https://ziglang.org/download/0.8.1/zig-linux-`uname -m`-0.8.1.tar.xz > zig.tar.xz \
  && mkdir zig \
  && tar xf zig.tar.xz -C zig --strip-components=1 \
  && cd /usr/bin \
  && ln -s /zig/zig .

RUN  git clone https://github.com/sagemathinc/jsage \
  && cd jsage && make
