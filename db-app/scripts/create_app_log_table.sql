CREATE TABLE IF NOT EXISTS workspace.default.user_logs (
  event_id STRING,
  event_ts TIMESTAMP,
  app_name STRING,
  workspace_id STRING,
  event_type STRING,
  user_email STRING,
  user_name STRING,
  user_header STRING,
  session_id STRING,
  request_path STRING,
  url STRING,
  user_agent STRING,
  payload_json STRING
) USING DELTA;
