# Dockerfile for building CoWasm in a predictable way.
# The goal is that this fully work on both x86_64 and aarch64 hosts,
# and results in /cowasm having everything built with
# the test suite passing.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="William Stein <wstein@sagemath.com>"

USER root

# Required apt dependencies -- mainly tools for compiling code.
RUN apt-get update \
  && apt-get install -y git make cmake curl dpkg-dev m4 yasm texinfo python-is-python3 libtool tcl zip libncurses-dev

# Install nodejs and pnpm.
# We specify a particular version of node.js for reproducibility, not because
# it is needed for some reason.
RUN  apt-get update \
  && apt-get remove -y nodejs libnode72 nodejs-doc \
  && apt-get install -y apt-utils ca-certificates curl gnupg \
  && mkdir -p /etc/apt/keyrings \
  && rm -f /etc/apt/keyrings/nodesource.gpg  \
  && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
  && export NODE_MAJOR=18 \
  && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
  && apt-get update && apt-get install nodejs=18.17.1-1nodesource1 -y \
  && apt-mark hold nodejs \
  && npm install -g npm pnpm

# Get source code of python-wasm and build everything:
ARG commit=HEAD

RUN  git clone https://github.com/sagemathinc/cowasm \
  && cd cowasm \
  && git checkout ${commit:-HEAD} \
  && make

RUN echo "export PATH=/python-wasm/bin/:$PATH" >> /root/.bashrc

# Run the test suite:
RUN cd cowasm && make test
