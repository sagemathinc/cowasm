BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

CORE = $(dir $(shell ls core/*/Makefile))
PYTHON = $(dir $(shell ls python/*/Makefile))
WEB = $(dir $(shell ls web/*/Makefile))

ALL = ${CORE} ${PYTHON} ${WEB}

export PATH := ${CWD}/bin:${CWD}/core/zig/dist:$(PATH)

all: core

.PHONY: core
core:
	./bin/make-all all ${CORE}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- BUILT COWASM CORE!                #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

.PHONY: test-core
test-core:
	./bin/make-all test ${CORE}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- COWASM CORE TEST SUITE PASSED!    #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

.PHONY: clean-core
clean-core:
	./bin/make-all clean ${CORE}

.PHONY: python
python:
	./bin/make-all all ${PYTHON}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- BUILT COWASM PYTHON!              #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

.PHONY: clean-python
clean-python:
	./bin/make-all clean ${PYTHON}

.PHONY: web
web:
	./bin/make-all all ${WEB}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- BUILT COWASM WEB!                 #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

.PHONY: clean-web
clean-web:
	./bin/make-all clean ${WEB}

.PHONY: test
test:
	./bin/make-all test ${ALL}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- FULL COWASM TEST SUITE PASSED!    #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################


.PHONY: test-clean
test-clean:
	./bin/make-all-clean test ${ALL}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- FULL COWASM TEST SUITE PASSED!
	#   WITH EACH PACKAGE TESTED IN ISOLATION (AFTER MAKE CLEAN)!!
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

.PHONY: clean
clean:
	./bin/make-all clean ${ALL}
	rm -rf bin/python* bin/cowasm-* bin/zig


docker:
	docker build --build-arg commit=`git ls-remote -h https://github.com/sagemathinc/cowasm master | awk '{print $$1}'` -t cowasm .
.PHONY: docker
