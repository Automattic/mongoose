SH = sh
NODE = node

test:
	@$(NODE) tests/unit/run.js
	tests/integration/support/expresso/bin/expresso tests/integration/*.js