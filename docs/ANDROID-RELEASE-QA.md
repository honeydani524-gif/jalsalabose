# Android Release QA Checklist

Use this checklist against the latest APK artifact produced by the GitHub Actions workflow.

## Automated checks

- [ ] Financial regression tests pass
- [ ] TypeScript check passes
- [ ] Production web build passes
- [ ] Capacitor Android sync completes
- [ ] Android debug APK builds and uploads

## Physical Android checks

- [ ] Install APK on a clean Android device
- [ ] Launch the app and confirm the dashboard loads without errors
- [ ] Create and delete income/expense transactions; verify the linked account balance is reversed exactly
- [ ] Create and delete a multi-destination transfer; verify source and every destination balance are restored
- [ ] Verify an account referenced only as a transfer destination cannot be deleted
- [ ] Verify cash locations, crypto wallets, prop accounts, and casinos with linked history cannot be deleted
- [ ] Confirm snapshot-generated transactions cannot be deleted independently
- [ ] Change the selected base currency and verify historical income/expense summaries remain correct using transaction-time FX
- [ ] Rapidly submit two balance-changing actions; verify the second is rejected while a save is active rather than overwriting the first balance
- [ ] Restart the app and verify persistence
- [ ] Record a cross-currency transfer and verify both sides and historical FX details
- [ ] Create an investment snapshot with both deposit and withdrawal flows; edit it and verify every source/destination balance
- [ ] Create a casino session, Buy-in, and Cash-out; verify fees, session currency, and open chips
- [ ] Export a JSON backup using Android's share sheet or download fallback
- [ ] Import that backup and verify balances, transactions, settings, and history
- [ ] Try importing an incomplete/invalid backup and verify the existing data remains unchanged
- [ ] Background and resume the app; verify data remains available
- [ ] Verify app data is not silently restored by Android cloud backup; retain a manual JSON backup before reinstall/device migration

## Release signing

- [ ] Configure a persistent release keystore outside the repository
- [ ] Store signing credentials only in GitHub Actions secrets
- [ ] Build and test a signed release APK before distributing upgrades
- [ ] Confirm an upgrade installs over the previous signed build and preserves local IndexedDB data

Do not mark the app release-ready until the automated checks and physical-device checks are complete.
