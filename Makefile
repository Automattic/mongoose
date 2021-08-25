
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
DOCFILE = docs/source/_docs
STABLE_BRANCH = master
LEGACY_BRANCH = 5.x

test:
	./node_modules/.bin/mocha $(T) --async-only test/*.test.js

docs: ghpages merge_stable docclean gendocs search
docs_legacy: legacy docclean_legacy gendocs copytmp ghpages copylegacy

ghpages:
	git checkout gh-pages

search:
	node docs/search.js

gendocs:
	node website.js

site:
	node website.js && node static.js

merge_stable:
	git merge $(STABLE_BRANCH)

legacy:
	git checkout $(LEGACY_BRANCH)

docclean:
	rm -f ./docs/*.{1,html,json}
	rm -f ./docs/source/_docs

docclean_legacy:
	rm -rf ./docs/$(LEGACY_BRANCH)/*
	rm -f ./docs/source/_docs

copytmp:
	mkdir -p ./tmp/docs/css
	mkdir -p ./tmp/docs/js
	mkdir -p ./tmp/docs/images
	mkdir -p ./tmp/docs/api
	mkdir -p ./tmp/docs/tutorials
	mkdir -p ./tmp/docs/typescript
	cp -R ./docs/*.html ./tmp/docs
	cp -R ./docs/css/*.css ./tmp/docs/css
	cp -R ./docs/js/*.js ./tmp/docs/js
	cp -R ./docs/images/* ./tmp/docs/images
	cp -R ./docs/api/* ./tmp/docs/api
	cp -R ./docs/tutorials/* ./tmp/docs/tutorials
	cp -R ./docs/typescript/* ./tmp/docs/typescript
	cp index.html ./tmp

copylegacy:
	mkdir -p ./docs/$(LEGACY_BRANCH)
	cp -R ./tmp/* ./docs/$(LEGACY_BRANCH)/
	rm -rf ./tmp
