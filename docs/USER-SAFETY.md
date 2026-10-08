# Blocks and reports

Users can block, unblock, or report a user from the directory or chat header. Blocks prevent new messages, uploads, calls, typing and doodle signals in both directions, end active calls, and suppress queued push alerts. History remains available. Each user can remove only their own block.

Reports are stored in PostgreSQL user_reports with reporter_id, reported_id, reason, details and created_at. No report is exposed to other users. An operator with database access can review reports using:

SELECT id, reporter_id, reported_id, reason, details, created_at FROM user_reports ORDER BY created_at DESC;

Reports do not automatically suspend accounts. This release does not include an operator moderation UI or automated notification to an operator.
