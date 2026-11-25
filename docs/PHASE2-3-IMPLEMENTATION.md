# Phase 2–3 Implementation Notes

- Repository: `honeydani524-gif/jalsalabose`
- Working branch: `fix/phase-2-financial-corrections`
- Base: `audit/phase-1-baseline`
- Main branch has not been modified.

## Financial behavior implemented

### General multi-currency transfers
- The source amount is entered in the source asset currency.
- Each destination amount is entered in that destination asset's currency.
- The latest exchange-rate record effective on or before the transaction timestamp is used.
- Source and destination amounts are reconciled in USD-equivalent terms with a 0.01 USD rounding tolerance.
- Destination currency, transaction-time FX rate, base-currency equivalent, and base-currency label are stored on each transfer leg.
- Historical transfer amounts are not recomputed when current rates change.

### Investment snapshots
- The entered ending balance is authoritative; deposits and withdrawals are not applied to it a second time.
- Deposits and withdrawals are written as separate internal transfer rows, so both can be recorded on the same date.
- Cross-currency source/destination amounts use the effective historical rates for the snapshot timestamp.
- Snapshot-generated transfer rows are linked to their snapshot so editing a snapshot can replace its generated rows.
- Legacy snapshot transfer rows are recognized by their original memo and investment-account relationship when editing.
- Recording an older snapshot preserves a later snapshot's account-balance cache.
- External deposits/withdrawals remain supported when no source asset is selected.

### Casino sessions
- The first Buy-in fixes the session currency and stores the session's FX rate.
- Each Buy-in stores its original currency/rate, its session-currency cash cost, and the session-currency equivalent of chips received.
- Each Cash-out stores its original currency/rate, its net session-currency receipt, and per-destination currency/rate/session-currency equivalents.
- Fees are included in session cash-cost / net-cash-receipt P&L, while the open-chip calculation uses chip amounts and gross Cash-outs.
- Cash-outs cannot exceed the outstanding chip balance.
- Session detail, open-chip calculations, and net-worth exclusions use the fixed session currency.
- Existing casino rows without the new optional snapshot fields remain readable; legacy conversions use the stored FX rates on the original rows.

## Persistence and backup safety implemented

- IndexedDB request helpers now resolve only after the transaction completes and reject on request, transaction, or abort errors.
- Multi-store puts/deletes use a single IndexedDB transaction.
- App state is updated only after the corresponding persistence transaction succeeds.
- Save and delete operations await persistence; failures are surfaced instead of silently ignored.
- Investment snapshot replacement deletes old generated rows and writes the replacement rows in one batch transaction.
- Backup restore validates the payload and row IDs before touching the database.
- Backup restore clears and repopulates all stores in one IndexedDB transaction; a failed transaction rolls back instead of leaving a partially restored database.
- Reset and sample-data replacement also use atomic full-store replacement.
- Exchange-rate history and settings are awaited before the success message appears.
- Initial IndexedDB read errors are no longer treated as empty stores.

## Automated verification

Regression tests cover:
- Transaction-time currency conversion.
- Mixed-currency transfer reconciliation.
- Historical effective-rate lookup.
- Casino session conversion across currencies.
- Casino session calculations for legacy rows without new session snapshots.
- Investment P&L with deposits and withdrawals.

The test runner is pinned to Vitest 2.1.9 through the `npm test` script; it is not added to the production dependency bundle.

The branch's GitHub Actions workflow runs:
1. `npm ci`
2. `npm test`
3. `npx tsc --noEmit`
4. `npm run build`

The workflow must pass on the final branch head before this phase is considered complete.

## Not yet verified / next phase

- No Android Capacitor project or APK is produced by this phase.
- No browser manual QA or physical Android device test has been performed.
- IndexedDB restore behavior is protected by a single database transaction, but a real-browser failure-injection test is still desirable.
- Android packaging and APK installation remain the next major milestone.
