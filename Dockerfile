# Dockerfile for building Zython in a predictable way.
# This should fully work on both x86_64 and aarch64 hosts,
# and results in /zython having everything built with
# the test suite passing.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="William Stein <wstein@sagemath.com>"

USER root

# Required apt dependencies -- mainly tools for compiling code.
RUN apt-get update \
  && apt-get install -y git make cmake curl dpkg-dev m4 yasm texinfo python-is-python3 libtool tcl zip

# Get source code of python-wasm and build everything:
ARG commit=HEAD

RUN  git clone https://github.com/sagemathinc/zython \
  && cd zython \
  && git checkout ${commit:-HEAD} \
  && make

RUN echo "export PATH=/python-wasm/bin/:$PATH" >> /root/.bashrc

# Run the test suite:
RUN cd zython && make test
