
TESTS = $(shell find test/ -name '*.test.js')
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
DOCFILE = docs/source/_docs

test:
	@node test/dropdb.js
	@./node_modules/.bin/mocha $(T) --async-only $(TESTS)
	@node test/dropdb.js

test-short:
	@node test/dropdb.js
	@./node_modules/.bin/mocha $(T) -g LONG -i --async-only $(TESTS)
	@node test/dropdb.js

test-long:
	@./node_modules/.bin/mocha $(T) -g LONG --async-only $(TESTS)

docs: ghpages docclean gendocs
docs_from_master: docclean gendocs
docs_unstable: docclean master gendocs copytmp gitreset ghpages copyunstable

gendocs: $(DOCFILE)

$(DOCFILE): $(DOCS)
	node website.js

%.json: %.js
	@echo "\n### $(patsubst lib//%,lib/%, $^)" >> $(DOCFILE)
	./node_modules/dox/bin/dox < $^ >> $(DOCFILE)

site:
	node website.js && node static.js

ghpages:
	git checkout gh-pages && git merge 3.6.x

master:
	git checkout master

docclean:
	rm -f ./docs/*.{1,html,json}
	rm -f ./docs/source/_docs

copytmp:
	mkdir -p ./tmp
	cp -R ./docs/*.html ./tmp

gitreset:
	git checkout -- ./docs
	git checkout -- ./index.html

copyunstable:
	mkdir -p ./docs/unstable
	cp -R ./tmp/* ./docs/unstable/
	rm -rf ./tmp

.PHONY: test test-short test-long ghpages site docs docclean gendocs docs_from_master docs_unstable master copytmp copyunstable gitreset
