# Phase 1 — Baseline Audit

- Repository: `honeydani524-gif/jalsalabose`
- Base branch: `main`
- Audited baseline commit: `1ed54b42921a072b6e13e28459cbaa1242fcedd2`
- Audit branch: `audit/phase-1-baseline`
- Scope: source review and baseline CI; no application behavior changed in this phase.

## Confirmed baseline checks

A GitHub Actions workflow was added on the isolated audit branch at `.github/workflows/verify.yml`.

| Check | Result |
|---|---|
| `npm ci` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |
| Existing unit/integration tests | Not configured in baseline |
| Android build | Not configured / not run |

Workflow run: https://github.com/honeydani524-gif/jalsalabose/actions/runs/45552009896

## Findings requiring correction

### P1 — Investment snapshot applies internal cash flow twice

File: `src/store/AppStore.tsx`, `recordSnapshot` (approximately lines 628–666).

The account balance cache is first set to `input.endBalance`. If `fromId` is supplied, the code then applies a transfer leg to the investment account again. For a deposit, the entered end balance is increased again; for a withdrawal, it is decreased again. The current branch also chooses either deposit or withdrawal with a ternary, so a snapshot containing both positive values records only one transfer.

The snapshot form accepts both deposit and withdrawal values and allows selecting a source account, so this is reachable through the UI.

Required behavior: treat the entered end balance as authoritative. Record each external/internal flow independently, without applying those flows a second time to the already-final balance. If both deposit and withdrawal are entered, record both flows. Cross-currency sources must be converted at the transaction-time rate.

### P1 — General transfer assumes source and destination use the same currency

Files: `src/domain/entities.ts` (`Leg`), `src/screens/forms.tsx` (`TransferForm`), `src/store/AppStore.tsx` (`applyTx`).

A transfer leg stores only a numeric amount, with no destination currency or exchange-rate snapshot. The form requires the sum of destination numeric amounts to equal the source numeric amount. The store subtracts the source amount and adds each leg amount directly to the destination balance.

This is incorrect when source and destination currencies differ.

Required behavior: preserve the source amount/currency and transaction-time FX snapshot; store each destination amount in its own currency with its own transaction-time FX snapshot and base-currency equivalent. Validate equality using the transaction-time base-currency equivalents, allowing only a defined rounding tolerance.

### P1 — Casino session currency is not enforced or normalized

Files: `src/store/AppStore.tsx` (`addBuyIn`, `addCashOut`), `src/domain/entities.ts` (`BuyIn`, `CashOut`, `ongoingChipBase`), `src/screens/Casino.tsx`.

The first Buy-in creates a session with that Buy-in's currency. Later Buy-ins can use the selected source asset's currency, but the store does not check or convert that currency to the session currency. Several session-level views sum raw `amount` values and display the result in the session currency. `ongoingChipBase` also sums raw amounts and converts the result using only the first Buy-in's currency.

Required behavior: session currency is fixed by the first Buy-in. Each later Buy-in and Cash-out keeps its original currency and transaction-time FX snapshot, plus a persisted equivalent in the session currency. Session P/L and open-chip amounts use only those persisted session-currency equivalents. Cash-out destinations are credited in their own currencies using transaction-time conversion.

### P1 — Cash-out destination legs do not carry currency conversion data

Files: `src/domain/entities.ts` (`CashOut.legs`), `src/screens/Casino.tsx` (`CashOutForm`), `src/store/AppStore.tsx` (`addCashOut`).

Cash-out legs are summed as if every destination amount is denominated in the session currency, then those same numeric amounts are added directly to destination balances. A session-currency Cash-out paid into a different-currency account therefore produces an incorrect account balance.

Required behavior: each destination leg records its credited amount/currency and transaction-time rate; its session-currency equivalent is used for reconciliation against the Cash-out net amount.

### P1 — Backup import deletes existing data before validating the full backup

File: `src/store/AppStore.tsx`, `importJSON` (approximately lines 933–968).

Only the JSON syntax, app marker, and a limited upper schema-version check are performed before `clearAll()`. Store arrays, row IDs, required fields, and settings are not fully validated before the destructive operation. Rows are then written store-by-store, so a later failure can leave a partial restore.

Required behavior: validate the entire payload first, then replace all stores in one IndexedDB transaction (or a safe staged swap). On any failure, the original data must remain available.

### P2 — IndexedDB request success is treated as transaction success

File: `src/data/db.ts`, helper `run`.

The helper resolves on an individual request's `onsuccess`, not on the transaction's `oncomplete`. A request succeeding does not by itself prove the transaction committed. The helper should resolve only after transaction completion and reject on error/abort.

### P2 — UI state can report success before persistence completes

File: `src/store/AppStore.tsx`, `commit`, `save`, `remove`.

`commit` updates React state immediately and starts IndexedDB writes without awaiting them. `remove` also suppresses delete errors. The UI may therefore show a successful operation while persistence later fails.

Required behavior: await persistence before reporting success; handle transaction failure consistently and avoid leaving in-memory state divergent from IndexedDB.

### P2 — Rate history writes are not awaited

File: `src/screens/Settings.tsx`, `applyRates`.

Exchange-rate history entries and settings are saved through asynchronous store methods without awaiting completion before the success message appears. The settings operation should persist the new rates and history consistently before reporting success.

## Confirmed design decisions for implementation

1. General transfers use the exchange rate at the time of the transfer and preserve the historical converted amounts.
2. A casino session's currency is fixed by its first Buy-in.
3. Later casino Buy-ins and Cash-outs preserve their original currency and transaction-time FX rate, and also persist their session-currency equivalent.
4. Changing current exchange rates must not rewrite historical transaction/session equivalents.

## Phase 1 exit decision

The existing TypeScript project passes the baseline type check and production build, but the financial correctness and persistence findings above are release blockers. Add focused automated tests for these cases before modifying the application logic. Android packaging remains out of scope until the core tests pass.
