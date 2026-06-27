# Delta Spec: fix-pacientes-delete-flake

## MODIFIED Requirements

### Requirement: E2E delete synchronization — `tests/e2e/pacientes.spec.ts` "delete a paciente"

The e2e test for deleting a paciente MUST synchronize on the actual DELETE HTTP response before asserting row disappearance, so the 10-second timeout clock starts AFTER the cascade has begun, not before.

#### Scenario: Delete waits for DELETE response before DOM assertion

- GIVEN the user is on the `/pacientes` page and a newly created paciente row is visible in the list
- WHEN the user clicks the delete button followed by the confirm button
- THEN the test MUST call `page.waitForResponse` matching the pacientes DELETE endpoint and await its resolution
- AND the 10-second `not.toBeVisible` assertion MUST start AFTER the DELETE response resolves, not before

#### Scenario: Regression guard — original timeout assertion remains

- GIVEN the user is on the `/pacientes` page and a newly created paciente row is visible in the list
- WHEN the user clicks the delete button followed by the confirm button and the DELETE response has resolved
- THEN the test MUST still assert `not.toBeVisible({ timeout: 10_000 })` as a secondary safety net
- AND if the row persists beyond 10 seconds after the DELETE response, the test MUST fail, catching a real slow-delete server-side bug

## ADDED Requirements

### Requirement: Reliability criterion for flaky e2e delete test

The "delete a paciente" scenario MUST pass 10 consecutive runs under the re-run strategy before the change is considered done.

#### Scenario: Ten consecutive runs pass

- GIVEN the Playwright test file `tests/e2e/pacientes.spec.ts`
- WHEN the test runner executes `pnpm exec playwright test tests/e2e/pacientes.spec.ts --grep "delete a paciente"` ten times in sequence
- THEN all 10 runs MUST produce zero failures
- AND no `waitForResponse` timeout errors MAY occur during any run

---

_No source-of-truth spec exists for e2e flake-handling patterns; this delta spec is self-contained._
