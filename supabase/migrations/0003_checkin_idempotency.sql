-- Make pack metric entries idempotent per (user, metric, date) so check-in
-- re-saves upsert cleanly. Supports the PUT /api/v1/checkins/:date contract.
alter table pack_metric_entries
  add constraint pack_metric_entries_user_metric_date_key
  unique (user_id, metric_id, entry_date);
