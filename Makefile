
TESTS = $(shell find test/ -name '*.test.js')

test:
	@./node_modules/.bin/mocha --reporter list $(TESTFLAGS) $(TESTS)
	@node test/dropdb.js

test-old:
	@NODE_ENV=test ./support/expresso/bin/expresso \
		$(TESTFLAGS) \
		$(TESTS)
	@node test/dropdb.js

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
