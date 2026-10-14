.PHONY: run smoke

run:
	bun server/main.js

smoke: # C7
	bun test tests/smoke.test.js
