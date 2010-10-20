EXPRESSO = support/expresso/bin/expresso

test:
	@$(EXPRESSO) \
		-I lib \
		tests/*.js

.PHONY: test