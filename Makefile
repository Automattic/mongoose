
EXPRESSO = support/expresso/bin/expresso
TESTS = tests/*.js

test:
	@$(EXPRESSO) \
		-I lib \
		--serial \
		$(TEST_FLAGS) $(TESTS)

test-cov:
	@$(MAKE) TEST_FLAGS=--cov test

benchmark:
	@node benchmark/bm.js

.PHONY: test test-cov benchmark