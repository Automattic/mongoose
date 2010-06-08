SH = sh
NODE = node

test:
	@$(NODE) tests/unit/run.js
	@$(SH) tests/integration/support/expresso/bin/expresso tests/integration/*.js