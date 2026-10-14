# Єдина точка входу перевірок (ADR 0008). ID перевірок — standards/checklist.md.
SHELL := sh
BASE ?=

.PHONY: run fmt fmt-check lint boundaries test ac ac-check coverage smoke build audit \
	spec-check log-check check prepush ci

run:
	bun server/main.js

fmt:
	bunx prettier --write .

fmt-check: # C1
	bunx prettier --check .

lint: # C2
	bunx eslint --max-warnings=0 .

boundaries: # C3, AC-15
	bunx depcruise server tests --config .dependency-cruiser.cjs

test: # C4
	bun test

ac: # make ac ID=AC-N
	@test -n "$(ID)" || { echo "Використання: make ac ID=AC-N"; exit 1; }
	bun test -t "$(ID):"

ac-check: # C5
	@missing=0; \
	for id in $$(grep -E '^\| AC-[0-9]+ .*make ac ID=' standards/spec.md | grep -oE '^\| AC-[0-9]+' | grep -oE 'AC-[0-9]+'); do \
	  grep -rqF "$$id:" tests || { echo "C5: немає тесту $$id:"; missing=1; }; \
	done; \
	exit $$missing

coverage: # C6, поріг у bunfig.toml
	bun test --coverage

smoke: # C7
	bun test tests/smoke.test.js

build: # C8
	bun install --frozen-lockfile
	bun -e "const { openDb } = await import('./server/db/index.js'); openDb(':memory:').close()"

audit: # C9
	bun audit --audit-level=high

spec-check: # C10, лише в PR: make spec-check BASE=origin/main
	@if [ -z "$(BASE)" ]; then echo "C10: BASE не задано, пропуск"; exit 0; fi; \
	changed=$$(git diff --name-only $(BASE)...HEAD); \
	if echo "$$changed" | grep -qE '^server/routes/|^server/db/schema\.sql$$'; then \
	  echo "$$changed" | grep -qx 'standards/spec.md' || { echo "C10: змінено routes/schema.sql без standards/spec.md"; exit 1; }; \
	fi

log-check: # C11, лише в PR: make log-check BASE=origin/main
	@if [ -z "$(BASE)" ]; then echo "C11: BASE не задано, пропуск"; exit 0; fi; \
	git diff --name-only $(BASE)...HEAD | grep -qx 'ai/prompts-log.md' || { echo "C11: ai/prompts-log.md не оновлено"; exit 1; }

check: fmt-check lint boundaries # pre-commit

prepush: test ac-check smoke # pre-push

ci: check prepush coverage build audit spec-check log-check
