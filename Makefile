BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

CORE_DIRS = $(dir $(shell ls core/*/Makefile))
PYTHON_DIRS = $(dir $(shell ls python/*/Makefile))

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

.PHONY: python
python:
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

.PHONY: test
test:
	./bin/make-all test ${CORE_DIRS}
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
	./bin/make-all-clean test ${CORE_DIRS}
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
	./bin/make-all clean ${CORE_DIRS} ${PYTHON_DIRS}
	rm -rf bin/python* bin/cowasm-* bin/zig

