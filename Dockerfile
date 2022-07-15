# Dockerfile for building python-wasm in a predictable way.
# This should fully work on both x86_64 and aarch64 hosts,
# and results in /python-wasm having everything built with
# the test suite passing.

FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="William Stein <wstein@sagemath.com>"

USER root

# Required apt dependencies -- mainly tools for compiling code.
RUN apt-get update \
  && apt-get install -y git make curl dpkg-dev m4 yasm texinfo python-is-python3 autotools-dev automake libtool vim zip

# Required nodejs dependency
RUN  curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g npm@latest

# Get source code of python-wasm and build everything:
ARG commit=HEAD

RUN  git clone https://github.com/sagemathinc/python-wasm \
  && cd python-wasm \
  && git checkout ${commit:-HEAD} \
  && make

RUN echo "export PATH=/python-wasm/bin/:$PATH" >> /root/.bashrc

# Run the test suite:
RUN cd python-wasm && make test
