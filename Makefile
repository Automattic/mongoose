
TESTS = $(shell find test/ -name '*.test.js')

test:
	@NODE_ENV=test ./support/expresso/bin/expresso \
		$(TESTFLAGS) \
		$(TESTS)
	@node test/dropdb.js

test-cov:
	@TESTFLAGS=--cov $(MAKE) test

docs: docs/api.html

docs/api.html: lib/mongoose/*.js
	dox \
		--private \
		--title Mongooose \
		--desc "Expressive MongoDB for Node.JS" \
		$(shell find lib/mongoose/* -type f) > $@

docclean:
	rm -f docs/*.{1,html}

.PHONY: test test-cov docs docclean
