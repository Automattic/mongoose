
TESTS = $(shell find test/ -name '*.test.js')
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
DOCFILE = docs/source/_docs

test:
	@node test/dropdb.js
	@time ./node_modules/.bin/mocha $(T) --async-only $(TESTS)
	@node test/dropdb.js

docs: ghpages docclean gendocs

gendocs: $(DOCFILE)

$(DOCFILE): $(DOCS)
	node website.js

%.json: %.js
	@echo "\n### $(patsubst lib//%,lib/%, $^)" >> $(DOCFILE)
	./node_modules/dox/bin/dox < $^ >> $(DOCFILE)

site:
	node website.js && node static.js

ghpages:
	git checkout gh-pages && git merge master

docclean:
	rm -f ./docs/*.{1,html,json}
	rm -f ./docs/source/_docs

.PHONY: test site docs docclean gendocs
