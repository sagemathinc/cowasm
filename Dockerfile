# Dockerfile for building jsage in a predictable way.
# This should fully work on both x86_64 and ARM hosts,
# and results in /jsage having everything built
# and the commands jsage and jpython in the PATH.
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="SageMath, Inc. <office@sagemath.com>"

USER root

# Required apt dependencies -- mainly tools for compiling code.
RUN apt-get update \
  && apt-get install -y git make curl dpkg-dev m4 yasm texinfo python-is-python3 autotools-dev automake libtool vim

# Required nodejs dependency
RUN  curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g npm@latest

# Get source code of JSage and build everything:
ARG commit=HEAD

RUN  git clone https://github.com/sagemathinc/jsage \
  && cd jsage \
  && git checkout ${commit:-HEAD} \
  && make

RUN echo "export PATH=/jsage/packages/jpython/bin:/jsage/packages/zig/dist/:/jsage/packages/wasmer/dist/bin:$PATH" >> /root/.bashrc

# Run the test suite, thus increasing the CI value of this Docker image.
RUN  cd /jsage/lib \
  && make test
