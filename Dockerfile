# Work in progress Dockerfile for building jsage in a predictable way.

FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8
LABEL maintainer="SageMath, Inc. <office@sagemath.com>"

USER root

# Required apt dependencies -- mainly tools for compiling code.
RUN apt-get update \
  && apt-get install -y git make curl dpkg-dev m4 yasm texinfo python-is-python3 autotools-dev automake libtool

# Required nodejs dependency
RUN  curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
  && apt-get install -y nodejs \
  && npm install -g npm@latest

# Optional convenience dependencies
RUN apt-get install -y vim

# Get source code of JSage and build everything:
RUN  git clone https://github.com/sagemathinc/jsage \
  && cd jsage \
  && make

RUN echo "export PATH=/jsage/packages/jpython/bin:$PATH" >> /root/.bashrc
