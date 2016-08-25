
DOCS_ = $(shell find lib/ -name '*.js')
DOCS = $(DOCS_:.js=.json)
DOCFILE = docs/source/_docs
STABLE_BRANCH = master
LEGACY_BRANCH = 3.8.x

test:
	@MONGOOSE_DISABLE_STABILITY_WARNING=1 ./node_modules/.bin/mocha $(T) --async-only test/*.test.js

docs: ghpages merge_stable docclean gendocs
docs_legacy: legacy docclean_legacy gendocs copytmp gitreset ghpages copylegacy

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
	cp -R ./docs/*.html ./tmp/docs
	cp -R ./docs/css/*.css ./tmp/docs/css
	cp -R ./docs/js/*.js ./tmp/docs/js
	cp -R ./docs/images/* ./tmp/docs/images
	cp index.html ./tmp

gitreset:
	git checkout -- ./docs
	git checkout -- ./index.html

copylegacy:
	mkdir -p ./docs/$(LEGACY_BRANCH)
	cp -R ./tmp/* ./docs/$(LEGACY_BRANCH)/
	rm -rf ./tmp

.PHONY: test test-short test-long ghpages site docs docclean gendocs docs_from_master docs_unstable master copytmp copyunstable gitreset docclean_unstable

browser:
	npm install `node format_deps.js`
	./node_modules/browserify/bin/cmd.js -o ./bin/mongoose.js lib/browser.js
	./node_modules/uglify-js/bin/uglifyjs ./bin/mongoose.js -o ./bin/mongoose.min.js --screw-ie8 -c -m
