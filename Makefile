BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

CORE_DIRS = $(dir $(shell ls core/*/Makefile))
PYTHON_DIRS = $(dir $(shell ls python/*/Makefile))

ALL_DIRS = ${CORE_DIRS} ${PYTHON_DIRS}

export PATH := ${CWD}/bin:${CWD}/core/zig/dist:$(PATH)

all: core

.PHONY: core
core:
	./bin/make-all all ${CORE_DIRS}
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
	./bin/make-all test ${CORE_DIRS}
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
	./bin/make-all clean ${CORE_DIRS}

.PHONY: python
python: core
	./bin/make-all all ${PYTHON_DIRS}
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
	./bin/make-all clean ${PYTHON_DIRS}

.PHONY: test
test:
	./bin/make-all test ${ALL_DIRS}
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
	./bin/make-all-clean test ${ALL_DIRS}
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
	./bin/make-all clean ${ALL_DIRS}
	rm -rf bin/python* bin/cowasm-* bin/zig


docker:
	docker build --build-arg commit=`git ls-remote -h https://github.com/sagemathinc/cowasm master | awk '{print $$1}'` -t cowasm .
.PHONY: docker
