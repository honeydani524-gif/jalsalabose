# Final Review Report — 2026-11-25

- Repository: `honeydani524-gif/jalsalabose`
- Working branch: `fix/phase-2-financial-corrections`
- Pull request: [#1](https://github.com/honeydani524-gif/jalsalabose/pull/1)
- Base branch: `audit/phase-1-baseline`
- `main` remains unchanged at the baseline commit.
- APK creation is intentionally manual and was not part of the latest verification runs.

## Findings corrected

| Area | Finding | Correction |
|---|---|---|
| Casino crypto Buy-in | USD-denominated value could be debited as if it were BTC/ETH/SOL token quantity. | Restrict the current USD 1:1 debit path to USDT until historical token-price snapshots are implemented. |
| Casino session currency | A later Buy-in entered with an earlier date could be mistaken for the first Buy-in by date-sorted totals. | Use the persisted session currency and FX rate for totals, cash-out validation, and open-chip calculations; add a backdated-entry regression test. |
| Prop payouts | USD-denominated fees were not deducted from credited payouts and FX could use current rather than receipt-time rates. | Convert the fee at the payout-date rate, credit the net amount, persist historical FX, and link payout rows to their generated transactions. |
| Investment snapshot editing | Reversing old snapshot flows could update source balances in memory without persisting them. | Persist every reversed source/destination balance in the same transaction. |
| Transaction deletion | Deleting a ledger row removed only the transaction record, leaving cached asset balances unchanged. | Reverse the transaction's native-currency balance effects and delete the row atomically; protect snapshot-generated rows and safely unlink new prop payouts. |
| Backup restore | Missing store arrays or malformed values could risk destructive replacement. | Validate required stores, IDs, financial fields, settings, and casino legs before one atomic replacement. |
| IndexedDB writes | A synchronous object-store write exception could leave earlier queued writes eligible to commit. | Abort the whole transaction on synchronous errors in batch and replace operations. |
| Exchange-rate settings | Rate-history rows and settings could be persisted separately. | Save settings and all new rate-history rows in one multi-store transaction. |
| Backup export | Immediate object-URL cleanup and mobile sharing could cause unreliable exports. | Prefer native file sharing when available and defer URL cleanup for download fallback. |
| Android instrumentation test | The sample test expected the wrong application ID. | Align the assertion with `com.jalsalabose.app`. |
| CI permissions | The workflow previously had write access and generated-file auto-commit behavior. | Keep repository permissions read-only and do not auto-commit generated files. |
| APK workflow | Routine code review previously generated a debug APK. | Keep push/PR checks to tests, type checking, and web build; gate APK packaging behind manual `workflow_dispatch` input. |
| GitHub PR target | PR #1 targeted `main` instead of the intended audit baseline. | Retarget PR #1 to `audit/phase-1-baseline`; `main` was not modified. |
| Documentation and metadata | README and package-lock metadata were stale. | Align package-lock root version and refresh README/build/QA instructions. |

## Latest automated verification

The latest code verification completed successfully at commit `7bc3dac31b6b2198077cdbedde27f0a0e99c5e3c`.

- GitHub Actions push run: [45593912117](https://github.com/honeydani524-gif/jalsalabose/actions/runs/45593912117)
- GitHub Actions pull request run: [45593922888](https://github.com/honeydani524-gif/jalsalabose/actions/runs/45593922888)
- `npm ci`: passed
- Financial regression tests: passed
- TypeScript check: passed
- Vite production build: passed
- Android APK job: skipped by design

This verification does not certify Android installation or physical-device behavior.

## Remaining checks before release

1. Perform physical Android testing: first launch, persistence after restart, orientation/process recreation, and update installation.
2. Test JSON export/import on Android and verify balances, transactions, settings, and historical FX.
3. Perform failure-injection testing for IndexedDB restore and confirm that the old database remains intact after an aborted transaction.
4. Configure a persistent release keystore in GitHub Actions secrets before distributing upgrades that must install over an existing app.
5. Manually trigger the APK workflow only when the user is ready to create an APK.

## Operating notes

- Data remains local to each device in WebView IndexedDB. There is no account, server, or cloud sync.
- Android automatic backup is disabled. Users must export an in-app JSON backup before reinstalling or changing phones.
- Casino crypto Buy-in currently supports USDT only.
- The repository is public and has no standard LICENSE file; source visibility and reuse rights should be considered separately.
- PR #1 remains open and draft. Do not merge into `main` without explicit approval.
