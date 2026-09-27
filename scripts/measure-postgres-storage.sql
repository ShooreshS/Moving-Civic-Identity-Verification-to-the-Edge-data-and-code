\set ON_ERROR_STOP on

-- Publication-adapted sizing query for a reviewer-owned physical test table.
-- review_data.review_ballots is a public example name, not a deployment mapping.
-- No experimental database or connection credentials are supplied here.
-- CSV output omits stored rows, object names, and index definitions.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog;
-- Fail if row-level security would hide rows from the aggregate counts.
SET LOCAL row_security = off;

-- Views and partition/inheritance hierarchies do not represent one table's storage.
DO $review_table_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid = to_regclass('review_data.review_ballots')
      AND c.relkind = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM pg_inherits i
        WHERE i.inhrelid = c.oid OR i.inhparent = c.oid
      )
  ) THEN
    RAISE EXCEPTION 'Expected review_data.review_ballots to be a physical, non-inherited test table.';
  END IF;
END;
$review_table_check$;

-- psql requires each \copy meta-command to occupy a single physical line.
\copy (SELECT current_setting('server_version') AS postgres_version, current_setting('block_size')::integer AS page_size_bytes, now() AT TIME ZONE 'utc' AS measured_at_utc) TO STDOUT WITH CSV HEADER

\copy (SELECT count(*) AS row_count, avg(pg_column_size(row_value))::numeric(20,2) AS mean_row_bytes, min(pg_column_size(row_value)) AS min_row_bytes, max(pg_column_size(row_value)) AS max_row_bytes FROM review_data.review_ballots AS row_value) TO STDOUT WITH CSV HEADER

\copy (SELECT 'review_ballots' AS relation_label, pg_relation_size(c.oid) AS heap_bytes, pg_indexes_size(c.oid) AS index_bytes, pg_total_relation_size(c.oid) - pg_relation_size(c.oid) - pg_indexes_size(c.oid) AS auxiliary_bytes, pg_total_relation_size(c.oid) AS total_bytes FROM pg_class c WHERE c.oid = 'review_data.review_ballots'::regclass) TO STDOUT WITH CSV HEADER

\copy (SELECT row_number() OVER (ORDER BY ix.indexrelid) AS index_number, pg_relation_size(ix.indexrelid) AS index_main_bytes, ix.indisunique AS is_unique, ix.indisprimary AS is_primary, ix.indisvalid AS is_valid FROM pg_index ix WHERE ix.indrelid = 'review_data.review_ballots'::regclass ORDER BY ix.indexrelid) TO STDOUT WITH CSV HEADER

ROLLBACK;
