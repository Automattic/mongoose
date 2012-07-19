
TESTS = $(shell find test/ -name '*.test.js')
DOCS = $(shell find lib/ -name '*.js')
DOCSS = $(DOCS:.js=.json)
DOCFILE = docs/dox.json

test:
	@./node_modules/.bin/mocha --reporter list $(TESTFLAGS) $(TESTS)
	@node test/dropdb.js

home:
	@./node_modules/jade/bin/jade < ./index.jade > ./index.html

docs: $(DOCFILE)

$(DOCFILE): $(DOCSS)
	node render.js api
	node render.js guide

%.json: %.js
	@echo "\n### $(patsubst lib//%,lib/%, $^)" >> $(DOCFILE)
	./node_modules/dox/bin/dox < $^ >> $(DOCFILE)

newsite2:
	./node_modules/dox/bin/dox < ./lib/collection.js > ./docs/collection.json

site:
	node website.js && node static.js

docclean:
	rm -f ./docs/*.{1,html,json}

.PHONY: test home site test-old docs docclean
