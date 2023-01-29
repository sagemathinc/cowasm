BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PACKAGE_DIRS = $(dir $(shell ls packages/*/Makefile))

export PATH := ${CWD}/bin:${CWD}/packages/zig/dist:$(PATH)

all:
	./bin/make-all all ${PACKAGE_DIRS}
	#
	#
	##########################################################
	#                                                        #
	#   CONGRATULATIONS -- FULL COWASM BUILD WORKED!         #
	#
	@echo "#   `date`"
	@echo "#   `uname -s -m`"
	@echo "#   Git Branch: `git rev-parse --abbrev-ref HEAD`"
	#                                                        #
	##########################################################

.PHONY: test
test:
	./bin/make-all test ${PACKAGE_DIRS}
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
	./bin/make-all-clean test ${PACKAGE_DIRS}
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
	./bin/make-all clean ${PACKAGE_DIRS}
	rm -rf bin/python* bin/node bin/*npm bin/*npx bin/cowasm-* bin/zig

