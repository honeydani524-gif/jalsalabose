# Final Review Report — 2026-11-25

- Repository: `honeydani524-gif/jalsalabose`
- Working branch: `fix/phase-2-financial-corrections`
- Pull request: [#1](https://github.com/honeydani524-gif/jalsalabose/pull/1)
- Base branch: `audit/phase-1-baseline`
- `main` was not modified or merged.

## Findings corrected

| Area | Finding | Correction |
|---|---|---|
| Casino crypto Buy-in | USD-denominated value was subtracted as if it were BTC/ETH/SOL token quantity. | Restrict the current USD 1:1 debit path to USDT until historical token-price snapshots are implemented. |
| Prop payouts | USD-denominated fees were stored but not deducted from the credited amount; payout and destination FX used current rather than receipt-time rates. | Convert the USD fee at the payout-date rate, credit the net payout, and persist the historical payout/destination FX snapshots. |
| Investment snapshot editing | Reversing an old snapshot flow could update another source asset in memory without persisting its corrected balance. | Persist every reversed source/destination balance row in the same batch transaction. |
| Backup restore | Missing store arrays could be treated as empty arrays and wipe existing records during restore. | Require all store arrays, the supported backup/schema versions, and exactly one settings row before atomic replacement. |
| Exchange-rate settings | Rate-history rows and settings were saved separately, allowing a partial update if a later write failed. | Save all changed rate-history rows and settings in one multi-store IndexedDB transaction. |
| Backup export | The object URL was revoked immediately after clicking download; mobile browsers may also support file sharing more reliably. | Prefer the native file-share sheet where supported and defer object-URL cleanup for the download fallback. |
| CI permissions | The verification job had repository write permission and auto-committed generated files. | Use read-only repository permissions and build/sync generated Android files only in the runner. |
| Version metadata | Package, settings screen, and Android version labels differed. | Align all three to version `0.1.0`. |
| Documentation | The implementation notes still claimed Android packaging had not been added. | Reconcile the implementation notes and record remaining release checks. |

## Verification evidence

- A GitHub Actions run on the branch completed successfully at commit `c67531c8171ec1bf4929ee1d37b02d4cd819712c`:
  - financial regression tests
  - TypeScript check
  - Vite production build
  - Capacitor Android sync
  - Android debug APK build and artifact upload
- That successful run predates the final follow-up changes in this report (atomic rate settings, stricter backup validation, version alignment, and export-share fallback). Those final edits still require a fresh CI run before release.
- Earlier CI evidence: [workflow run 45558976609](https://github.com/honeydani524-gif/jalsalabose/actions/runs/45558976609).

## Remaining release checks

1. Run CI again against the latest branch head and verify a fresh APK artifact is produced.
2. Install the latest APK on a physical Android phone and test first launch, app restart, orientation/process recreation, and update installation.
3. Test JSON export through Android's share sheet/download fallback, then import the file and verify balances and transaction counts.
4. Perform a failure-injection test for IndexedDB restore to confirm a rejected transaction leaves the original database unchanged.
5. Configure a persistent release keystore in GitHub Actions secrets before publishing upgrades that must install over an existing app and preserve local IndexedDB data.

## Important operating notes

- App data remains local to each device in WebView IndexedDB. There is no account, server, or cloud sync.
- Android automatic backup is disabled. Users must export an in-app JSON backup before reinstalling or changing phones.
- Casino crypto Buy-in currently supports USDT only. BTC, ETH, and SOL must not be debited as if USD values were token quantities.
- The current package remains a debug-build workflow; physical device testing and release signing are not yet complete.
