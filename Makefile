BUILT = dist/.built

CWD = $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

PACKAGE_DIRS = $(dir $(shell ls packages/*/Makefile))

export PATH := ${CWD}/bin:${CWD}/packages/zig/dist:$(PATH)

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



.PHONY: clean
clean:
	./bin/make-all clean ${PACKAGE_DIRS}
	rm -rf ${CWD}/bin-wasm
