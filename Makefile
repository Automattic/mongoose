
EXPRESSO = support/expresso/bin/expresso -I lib --serial

TESTS = tests/document.js \
	      tests/documentation.js \
	      tests/index.js \
	      tests/schema.js \
	      tests/types.js \
	      tests/util.js

test:
	@$(EXPRESSO) $(TESTS) \
		&& $(EXPRESSO) tests/query.js

test-cov:
	@$(MAKE) TEST_FLAGS=--cov test

benchmark:
	@node benchmark/bm.js

.PHONY: test test-cov benchmark
