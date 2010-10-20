EXPRESSO = support/expresso/bin/expresso

test:
	@$(EXPRESSO) \
		-I lib \
		$(TEST_FLAGS) tests/*.js

test-cov:
	@$(MAKE) TEST_FLAGS=--cov test

.PHONY: test test-cov