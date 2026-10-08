# Message threads

Use Reply on any message to quote it in the composer. Messages with replies show an Expand thread button. Expanded threads load the original message and nested replies across chat history, with a Reply to this message action on each available entry. Collapse thread hides the context. Load more replies fetches the next page. Threads refresh when conversation messages change.

In-app and push previews identify thread replies and include the quoted sender when available. Existing notification and unread settings apply. Only conversation members can read threads; expired messages are excluded and deleted content is shown as a placeholder.

Deployment: run `npm run migrate` to apply migration 16, which adds the thread lookup index. No changes to existing reply data are required.
