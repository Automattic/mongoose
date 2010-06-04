NODE = node

test:
	(cd lib/support/node-mongodb-native; make test_all)
	@$(NODE) spec/specs.js