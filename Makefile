
TESTS = $(shell find test/ -name '*.test.js')
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
DOCFILE = docs/source/_docs
STABLE_BRANCH = 3.6.x

test:
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 node test/dropdb.js
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 ./node_modules/.bin/mocha $(T) --async-only $(TESTS)
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 node test/dropdb.js

test-short:
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 node test/dropdb.js
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 ./node_modules/.bin/mocha $(T) -g LONG -i --async-only $(TESTS)
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 node test/dropdb.js

test-long:
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 ./node_modules/.bin/mocha $(T) -g LONG --async-only $(TESTS)

docs: ghpages merge_stable docclean gendocs
docs_all: docs_unstable docs
docs_from_current_branch: docclean gendocs
docs_unstable: master docclean_unstable gendocs copytmp gitreset ghpages copyunstable

gendocs: $(DOCFILE)

$(DOCFILE): $(DOCS)
	node website.js

%.json: %.js
	@echo "\n### $(patsubst lib//%,lib/%, $^)" >> $(DOCFILE)
	./node_modules/dox/bin/dox < $^ >> $(DOCFILE)

site:
	node website.js && node static.js

merge_stable:
	git merge $(STABLE_BRANCH)

ghpages:
	git checkout gh-pages

master:
	git checkout master

docclean:
	rm -f ./docs/*.{1,html,json}
	rm -f ./docs/source/_docs

docclean_unstable:
	rm -rf ./docs/unstable/*
	rm -f ./docs/source/_docs

copytmp:
	mkdir -p ./tmp/docs/css
	mkdir -p ./tmp/docs/js
	mkdir -p ./tmp/docs/images
	cp -R ./docs/*.html ./tmp/docs
	cp -R ./docs/css/*.css ./tmp/docs/css
	cp -R ./docs/js/*.js ./tmp/docs/js
	cp -R ./docs/images/* ./tmp/docs/images
	cp index.html ./tmp

gitreset:
	git checkout -- ./docs
	git checkout -- ./index.html

copyunstable:
	mkdir -p ./docs/unstable
	cp -R ./tmp/* ./docs/unstable/
	rm -rf ./tmp

.PHONY: test test-short test-long ghpages site docs docclean gendocs docs_from_master
