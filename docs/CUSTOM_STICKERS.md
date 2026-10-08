# Custom Couple Stickers

Open a chat, choose **Choose sticker**, then **Create**. Under **My Stickers**, use **Create from Photo / Meme**.

- Upload, drop, or paste a JPG, PNG, WebP, or GIF (up to 10 MB / 24 megapixels). GIFs export as still images.
- Choose Circle, Rounded, Heart, Star, or Meme card (which keeps the whole image at normal zoom); adjust the outline and photo filter.
- Zoom and drag with a mouse or touch, or focus the preview and use arrow keys. Reset returns to the centered crop.
- Add a caption in Malayalam or another language, use a quick caption, and choose its position.
- **Save to My Stickers** keeps a reusable sticker on this device for the signed-in account. **Download PNG** exports a 512 × 512 PNG with transparency outside the chosen shape.
- **Send as Sticker** queues the finished PNG using the existing private attachment pipeline. The editor closes only once the outbox stores it. Normal chat delivery and retries handle sending; no new provider or server configuration is needed.
- Under **My Stickers**, send saved stickers again or delete them with the delete button.

The library is account-specific, browser-local, and limited to 50 stickers. Duplicate saves keep one copy. Storage errors preserve the current library and let you download instead. Sending still works if automatic library saving fails. Old unscoped kipenzi_custom_stickers storage is left untouched and is not imported into any account, since its owner is unknown.

Photo editing runs in the browser. It is a shape crop, not automatic subject/background removal; transparent source pixels are preserved. Only the exported image is uploaded when sent to chat.

Verification: node --test tests/sticker-maker.test.js; node node_modules/@playwright/test/cli.js test --config tests/sticker-check.config.js; npm run build.

The browser suite mocks chat APIs, so it checks the client editor, exports, persistence, and outbox integration without live database/storage services.
