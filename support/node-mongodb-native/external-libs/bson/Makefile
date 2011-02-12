
NODE = node
name = all

all:
	rm -rf build .lock-wscript bson.node
	node-waf configure build
	@$(NODE) test_bson.js
	@$(NODE) test_full_bson.js

test:
	@$(NODE) test_bson.js
	@$(NODE) test_full_bson.js

clean:
	rm -rf build .lock-wscript bson.node
	
.PHONY: all