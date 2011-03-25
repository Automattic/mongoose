
NODE = node
name = all

total: build_native

build_native:
	$(MAKE) -C ./external-libs/bson

clean_native:
	$(MAKE) -C ./external-libs/bson clean

test: build_native test_integration_pure test_integration_native
	@$(NODE) spec/spec.node.js

test_integration_pure:
	@$(NODE) integration/integration_tests.js pure $(name)

test_integration_native:
	@$(NODE) integration/integration_tests.js native $(name)

clean:
	rm ./external-libs/bson/bson.node
	rm -r ./external-libs/bson/build

.PHONY: total