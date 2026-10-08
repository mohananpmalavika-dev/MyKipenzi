# Message status and actions

Failed composer sends remain in their conversation with an error and Retry message.
The retry uses the original text, language, reply, expiration and client identifier.
Successfully uploaded attachments are reused. The database's existing client-ID
deduplication prevents duplicate messages after a response is lost. Failed entries
remain in memory for the current signed-in session; they do not survive a reload.
An error refreshing the chat after a successful send does not mark the send failed.

Edited messages have an Edited · History action. Chat members can inspect earlier
versions and their timestamps; other users cannot access them. Unchanged edits do
not create revisions. Deletion and expiration purge earlier versions.

Only the sender may delete for everyone, within 24 hours of the original send.
The server enforces the deadline, even if an old client still offers Delete.
Deleted messages retain a tombstone and lose text, revisions, reactions and saved
status. Unreferenced attachments and generated media are queued for removal.

The composer offers self-destruct after 5 minutes, 1 hour, 24 hours, 7 days or
30 days, or the chat default. A message timer can shorten the conversation timer,
but cannot extend it. Expiration begins on successful delivery. Expired messages
are inaccessible immediately, then the existing maintenance sweep purges content
and queues attachment/media cleanup. Visible messages show a live countdown.

Run `npm run migrate` before restarting the API and worker; migration 15 creates
the editing-history table. Tests cover retry snapshots and attachment reuse,
history access, deletion deadlines, and expiration cleanup.
