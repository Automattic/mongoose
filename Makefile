
EXPRESSO = support/expresso/bin/expresso -I lib --serial

TESTS =	tests/dbrefArray.js \
				tests/dbref.js \
				tests/document.js \
				tests/documentation.js \
				tests/index.js \
				tests/schema.js \
				tests/types.js \
				tests/util.js

test:
	@$(EXPRESSO) $(TESTS) $(TEST_FLAGS) \
		&& $(EXPRESSO) $(TEST_FLAGS) tests/query.js

test-cov:
	@$(MAKE) TEST_FLAGS=--cov test

benchmark:
	@node benchmark/bm.js

.PHONY: test test-cov benchmark
