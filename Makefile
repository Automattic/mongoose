
EXPRESSO = support/expresso/bin/expresso
TESTS = tests/*.js

test:
	@$(EXPRESSO) \
		-I lib \
		$(TEST_FLAGS) $(TESTS)

test-cov:
	@$(MAKE) TEST_FLAGS=--cov test

.PHONY: test test-cov