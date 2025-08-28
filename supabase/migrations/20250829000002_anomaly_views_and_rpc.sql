-- Drop existing views if they exist to avoid column naming conflicts
DROP VIEW IF EXISTS rental_anomaly_summary;
DROP VIEW IF EXISTS rental_anomalies;
DROP VIEW IF EXISTS _per_type_thresholds;

-- Create thresholds view for anomaly detection
CREATE VIEW _per_type_thresholds AS
SELECT 
  'excavator'::vehicle_type as vehicle_type, 
  25.0 as fuel_per_hour_threshold, 
  0.7 as idle_ratio_threshold
UNION ALL
SELECT 
  'bulldozer'::vehicle_type, 
  30.0, 
  0.6
UNION ALL
SELECT 
  'crane'::vehicle_type, 
  20.0, 
  0.65
UNION ALL
SELECT 
  'truck'::vehicle_type, 
  35.0, 
  0.5
UNION ALL
SELECT 
  'forklift'::vehicle_type, 
  8.0, 
  0.8;

-- Create rental anomalies view
CREATE VIEW rental_anomalies AS
WITH rental_metrics AS (
  SELECT 
    r.id as rental_id,
    r.vehicle_id,
    r.user_id,
    r.check_out_date,
    r.expected_return_date,
    r.check_in_date,
    r.idle_time,
    r.working_time,
    r.fuel_usage,
    r.downtime,
    v.type as vehicle_type,
    v.name as vehicle_name,
    t.fuel_per_hour_threshold,
    t.idle_ratio_threshold,
    -- Calculate metrics
    CASE 
      WHEN (r.idle_time + r.working_time) > 0 
      THEN r.idle_time::float / (r.idle_time + r.working_time)::float 
      ELSE 0 
    END as idle_ratio,
    CASE 
      WHEN r.working_time > 0 
      THEN r.fuel_usage / r.working_time 
      ELSE 0 
    END as fuel_per_hour
  FROM rentals r
  JOIN vehicles v ON r.vehicle_id = v.id
  JOIN _per_type_thresholds t ON v.type = t.vehicle_type
  WHERE r.check_in_date IS NULL -- Only active rentals
),
anomaly_detection AS (
  SELECT 
    rental_id,
    vehicle_id,
    user_id,
    vehicle_type,
    vehicle_name,
    -- Detect overdue
    CASE 
      WHEN expected_return_date < now() 
      THEN jsonb_build_object(
        'type', 'overdue',
        'severity', 'high',
        'score', EXTRACT(days FROM (now() - expected_return_date)) * 10,
        'details', 'Vehicle is ' || EXTRACT(days FROM (now() - expected_return_date)) || ' days overdue'
      )
    END as overdue_anomaly,
    -- Detect high idle ratio
    CASE 
      WHEN idle_ratio > idle_ratio_threshold 
      THEN jsonb_build_object(
        'type', 'high_idle_ratio',
        'severity', CASE WHEN idle_ratio > idle_ratio_threshold * 1.2 THEN 'high' ELSE 'medium' END,
        'score', (idle_ratio - idle_ratio_threshold) * 100,
        'details', 'Idle ratio is ' || ROUND((idle_ratio * 100)::numeric, 1) || '% (threshold: ' || ROUND((idle_ratio_threshold * 100)::numeric, 1) || '%)'
      )
    END as idle_anomaly,
    -- Detect no work while rented
    CASE 
      WHEN working_time = 0 AND check_out_date < now() - interval '1 day'
      THEN jsonb_build_object(
        'type', 'no_work_while_rented',
        'severity', 'medium',
        'score', EXTRACT(days FROM (now() - check_out_date)) * 5,
        'details', 'No working time recorded for ' || EXTRACT(days FROM (now() - check_out_date)) || ' days'
      )
    END as no_work_anomaly,
    -- Detect excess fuel per hour
    CASE 
      WHEN fuel_per_hour > fuel_per_hour_threshold 
      THEN jsonb_build_object(
        'type', 'excess_fuel_per_hour',
        'severity', CASE WHEN fuel_per_hour > fuel_per_hour_threshold * 1.3 THEN 'high' ELSE 'medium' END,
        'score', (fuel_per_hour - fuel_per_hour_threshold) * 2,
        'details', 'Fuel usage is ' || ROUND(fuel_per_hour::numeric, 2) || ' units/hour (threshold: ' || fuel_per_hour_threshold || ')'
      )
    END as fuel_anomaly,
    -- Detect long downtime
    CASE 
      WHEN downtime > 3 
      THEN jsonb_build_object(
        'type', 'long_downtime',
        'severity', CASE WHEN downtime > 6 THEN 'high' ELSE 'medium' END,
        'score', (downtime - 3) * 3,
        'details', 'Downtime is ' || downtime || ' hours (threshold: 3 hours)'
      )
    END as downtime_anomaly,
    now() as detected_at
  FROM rental_metrics
)
SELECT 
  rental_id,
  vehicle_id,
  (anomaly->>'type')::text as anomaly,
  (anomaly->>'severity')::text as severity,
  (anomaly->>'score')::numeric as score,
  (anomaly->>'details')::text as details,
  detected_at
FROM anomaly_detection,
LATERAL (
  SELECT unnest(ARRAY[
    overdue_anomaly,
    idle_anomaly, 
    no_work_anomaly,
    fuel_anomaly,
    downtime_anomaly
  ]) as anomaly
) as anomalies
WHERE anomaly IS NOT NULL;

-- Create rental anomaly summary view
CREATE VIEW rental_anomaly_summary AS
SELECT 
  v.id as vehicle_id,
  v.name as vehicle_name,
  v.type as vehicle_type,
  v.location,
  COUNT(a.rental_id) as total_anomalies,
  COUNT(CASE WHEN a.severity = 'high' THEN 1 END) as high_severity_count,
  COUNT(CASE WHEN a.severity = 'medium' THEN 1 END) as medium_severity_count,
  COUNT(CASE WHEN a.severity = 'low' THEN 1 END) as low_severity_count,
  COALESCE(SUM(a.score), 0) as total_anomaly_score,
  COALESCE(AVG(a.score), 0) as avg_anomaly_score,
  array_agg(DISTINCT a.anomaly) FILTER (WHERE a.anomaly IS NOT NULL) as anomaly_types
FROM vehicles v
LEFT JOIN rental_anomalies a ON v.id = a.vehicle_id
WHERE v.is_rented = true
GROUP BY v.id, v.name, v.type, v.location
ORDER BY total_anomaly_score DESC;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_rental_anomalies();
DROP FUNCTION IF EXISTS get_vehicle_anomalies(uuid);
DROP FUNCTION IF EXISTS get_anomaly_summary();

-- RPC: Get all rental anomalies
CREATE FUNCTION get_rental_anomalies()
RETURNS TABLE (
  rental_id uuid,
  vehicle_id uuid,
  vehicle_name text,
  vehicle_type vehicle_type,
  anomaly text,
  severity text,
  score numeric,
  details text,
  detected_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.rental_id,
    a.vehicle_id,
    v.name as vehicle_name,
    v.type as vehicle_type,
    a.anomaly,
    a.severity,
    a.score,
    a.details,
    a.detected_at
  FROM rental_anomalies a
  JOIN vehicles v ON a.vehicle_id = v.id
  ORDER BY a.score DESC, a.detected_at DESC;
END;
$$;

-- RPC: Get anomalies for a specific vehicle
CREATE FUNCTION get_vehicle_anomalies(target_vehicle_id uuid)
RETURNS TABLE (
  rental_id uuid,
  vehicle_id uuid,
  vehicle_name text,
  vehicle_type vehicle_type,
  anomaly text,
  severity text,
  score numeric,
  details text,
  detected_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.rental_id,
    a.vehicle_id,
    v.name as vehicle_name,
    v.type as vehicle_type,
    a.anomaly,
    a.severity,
    a.score,
    a.details,
    a.detected_at
  FROM rental_anomalies a
  JOIN vehicles v ON a.vehicle_id = v.id
  WHERE a.vehicle_id = target_vehicle_id
  ORDER BY a.score DESC, a.detected_at DESC;
END;
$$;

-- RPC: Get anomaly summary
CREATE FUNCTION get_anomaly_summary()
RETURNS TABLE (
  vehicle_id uuid,
  vehicle_name text,
  vehicle_type vehicle_type,
  location text,
  total_anomalies bigint,
  high_severity_count bigint,
  medium_severity_count bigint,
  low_severity_count bigint,
  total_anomaly_score numeric,
  avg_anomaly_score numeric,
  anomaly_types text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.vehicle_id,
    s.vehicle_name,
    s.vehicle_type,
    s.location,
    s.total_anomalies,
    s.high_severity_count,
    s.medium_severity_count,
    s.low_severity_count,
    s.total_anomaly_score,
    s.avg_anomaly_score,
    s.anomaly_types
  FROM rental_anomaly_summary s
  ORDER BY s.total_anomaly_score DESC;
END;
$$;
