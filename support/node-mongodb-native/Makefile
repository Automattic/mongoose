
NODE = node
NODEUNIT = deps/nodeunit/bin/nodeunit
name = all

total: build_native

build_native:
	$(MAKE) -C ./external-libs/bson

clean_native:
	$(MAKE) -C ./external-libs/bson clean

test: build_native
	@echo "\n == Run All tests minus replicaset tests=="
	$(NODE) tools/test_all.js --noreplicaset

test_junit: build_native
	@echo "\n == Run All tests minus replicaset tests=="
	$(NODE) tools/test_all.js --junit --noreplicaset

test_nodeunit_pure:
	@echo "\n == Execute Test Suite using Pure JS BSON Parser == "
	@$(NODEUNIT) test/ test/gridstore test/bson

test_nodeunit_replicaset_pure:
	@echo "\n == Execute Test Suite using Pure JS BSON Parser == "
	@$(NODEUNIT) test/replicaset

test_nodeunit_native:
	@echo "\n == Execute Test Suite using Native BSON Parser == "
	@TEST_NATIVE=TRUE $(NODEUNIT) test/ test/gridstore test/bson	

test_nodeunit_replicaset_native:
	@echo "\n == Execute Test Suite using Native BSON Parser == "
	@TEST_NATIVE=TRUE $(NODEUNIT) test/replicaset

test_all: build_native
	@echo "\n == Run All tests =="
	$(NODE) tools/test_all.js

test_all_junit: build_native
	@echo "\n == Run All tests =="
	$(NODE) tools/test_all.js --junit

clean:
	rm ./external-libs/bson/bson.node
	rm -r ./external-libs/bson/build

.PHONY: total