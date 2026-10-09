# Friendship UI and receiver languages

The app uses a cream, plum, and coral friendship theme, with labeled navigation, conversation filters, a searchable Together toolkit, and a friendship activity panel on wide screens. The mobile composer keeps message entry on its own row so attachment, voice, sticker, and scheduling controls remain accessible.

All interface copy stays in English: navigation, feature names, menus, controls, instructions, mood labels, and invisible-ink labels. The receive-language setting affects chat-message translation only. Changing it refreshes message translations; it does not change the interface language. Sender names, notes, and original messages remain intact.

Legacy bilingual UI labels are normalized to English locally, without provider requests. `shared/feature-pairs.json` contains existing bilingual aliases; `shared/english-ui.json` covers remaining legacy interface copy. The feature-language provider is fixed to English regardless of the account's message language. Unrecognized custom content retains its original text.

`scripts/feature-locale-plugin.mjs` normalizes rendered built-in labels and static interface attributes at build time. It adds no DOM wrappers, preserves editable fields and user-authored message/answer expressions, and leaves underlying protocol values unchanged. Regenerate built-in pairs after changing preset copy:

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
