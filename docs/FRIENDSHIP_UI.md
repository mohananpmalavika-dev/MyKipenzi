# Friendship UI and receiver languages

The app uses a cream, plum, and coral friendship theme, with labeled navigation, conversation filters, a searchable Together toolkit, and a friendship activity panel on wide screens. The mobile composer keeps message entry on its own row so attachment, voice, sticker, and scheduling controls remain accessible.

Navigation and account structure stay in English. Feature copy uses the current account's receive language: English, Malayalam, Manglish, or Kiswahili. Changing the receive language in Settings updates the feature context and refreshes message translations. Sender names, notes, and original messages remain intact.

Feature localization is bundled inside the app and makes no provider requests. `shared/featureLanguage.js` holds toolkit and common feature copy. `shared/feature-pairs.json` extracts existing built-in Malayalam/English pairs, with local Kiswahili and supplemental copy in the adjacent catalogues. Manglish uses authored translations for common copy and deterministic Malayalam transliteration for the remaining built-in pairs. Unrecognized custom content retains its original text.

`scripts/feature-locale-plugin.mjs` wraps rendered built-in feature labels in `FeatureText` at build time. It adds no DOM wrappers, skips the app shell, editable fields, and user-authored message/answer expressions, and leaves underlying protocol values unchanged. Regenerate built-in pairs after changing preset copy:

```powershell
node scripts/generate-feature-catalog.mjs
```

Received messages display a translation only when it belongs to the current receive language. The sender's original text is shown alongside it. Shared feature cards show the translated message with the original card; received voice notes retain the original recording and show the source transcript when available. Deleted messages and unrevealed invisible-ink content cannot disclose their translations through the original-message panel. Actual message translation continues to use the existing provider and consent rules.

Validation:

```powershell
node --test tests/feature-language.test.js tests/theme-fontsize.test.js tests/daily-prompt.test.js tests/relationship-story.test.js tests/message-status.test.js
npx playwright test --config tests/friendship-check.config.js
npm run build
```

Browser checks use mocked messages and sockets to validate receiver-language rendering, source preservation, feature search, activity launch, deleted-message privacy, mobile layout, account screens, and dark mode. They do not verify live provider translations or real two-device calls.
