
TESTS = $(shell find test/ -name '*.test.js')

test:
	@./node_modules/.bin/mocha --reporter list $(TESTFLAGS) $(TESTS)
	@node test/dropdb.js

home:
	./node_modules/jade/bin/jade < ./index.jade > ./index.html

site:
	node website.js && node static.js

test-old:
	@NODE_ENV=test ./support/expresso/bin/expresso \
		$(TESTFLAGS) \
		$(TESTS)
	@node test/dropdb.js

docs: docs/api.html

docs/api.html: lib/*.js
	./node_modules/dox/bin/dox \
		--private \
		--title Mongooose \
		--desc "Expressive MongoDB for Node.JS" \
		--ribbon "https://github.com/learnboost/mongoose" \
		--style mongoose \
		$(shell find lib/* -type f) > $@

docclean:
	rm -f ./docs/*.{1,html}

.PHONY: test home site test-old docs docclean
