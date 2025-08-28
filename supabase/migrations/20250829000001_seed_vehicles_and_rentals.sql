-- Seed 30 vehicles with Caterpillar-style names
INSERT INTO public.vehicles (type, name, capacity, location, fuel_type) VALUES
-- Excavators (8 vehicles)
('excavator', 'CAT 320D', '20 ton', 'Site A', 'diesel'),
('excavator', 'CAT 336F', '36 ton', 'Site B', 'diesel'),
('excavator', 'CAT 349F', '49 ton', 'Site C', 'diesel'),
('excavator', 'CAT 315F', '15 ton', 'Site A', 'diesel'),
('excavator', 'CAT 330F', '30 ton', 'Site B', 'diesel'),
('excavator', 'CAT 340F', '40 ton', 'Site C', 'diesel'),
('excavator', 'CAT 323F', '23 ton', 'Site A', 'diesel'),
('excavator', 'CAT 350F', '50 ton', 'Site B', 'diesel'),

-- Bulldozers (6 vehicles)
('bulldozer', 'CAT D6T', '18 ton', 'Site A', 'diesel'),
('bulldozer', 'CAT D8T', '28 ton', 'Site B', 'diesel'),
('bulldozer', 'CAT D9T', '45 ton', 'Site C', 'diesel'),
('bulldozer', 'CAT D5K2', '12 ton', 'Site A', 'diesel'),
('bulldozer', 'CAT D7E', '25 ton', 'Site B', 'diesel'),
('bulldozer', 'CAT D10T', '55 ton', 'Site C', 'diesel'),

-- Cranes (6 vehicles)
('crane', 'CAT MH3022', '22 ton', 'Site A', 'diesel'),
('crane', 'CAT MH3026', '26 ton', 'Site B', 'diesel'),
('crane', 'CAT MH3037', '37 ton', 'Site C', 'diesel'),
('crane', 'CAT MH3040', '40 ton', 'Site A', 'diesel'),
('crane', 'CAT MH3049', '49 ton', 'Site B', 'diesel'),
('crane', 'CAT MH3055', '55 ton', 'Site C', 'diesel'),

-- Trucks (5 vehicles)
('truck', 'CAT 740B', '40 ton', 'Site A', 'diesel'),
('truck', 'CAT 745C', '45 ton', 'Site B', 'diesel'),
('truck', 'CAT 770', '70 ton', 'Site C', 'diesel'),
('truck', 'CAT 775G', '75 ton', 'Site A', 'diesel'),
('truck', 'CAT 785D', '85 ton', 'Site B', 'diesel'),

-- Forklifts (5 vehicles)
('forklift', 'CAT EP16', '1.6 ton', 'Warehouse A', 'electric'),
('forklift', 'CAT EP20', '2.0 ton', 'Warehouse B', 'electric'),
('forklift', 'CAT EP25', '2.5 ton', 'Warehouse C', 'electric'),
('forklift', 'CAT EP30', '3.0 ton', 'Warehouse A', 'electric'),
('forklift', 'CAT EP35', '3.5 ton', 'Warehouse B', 'electric');

-- Update 25 vehicles to be rented (mark is_rented = true)
WITH vehicle_ids AS (
  SELECT id FROM public.vehicles ORDER BY created_at LIMIT 25
)
UPDATE public.vehicles 
SET is_rented = true 
WHERE id IN (SELECT id FROM vehicle_ids);

-- Create rentals for the 25 rented vehicles with varied data
WITH rented_vehicles AS (
  SELECT id, type FROM public.vehicles WHERE is_rented = true
),
rental_data AS (
  SELECT 
    id as vehicle_id,
    type,
    -- Generate random user_id (using existing profile user_ids or generate new UUIDs)
    gen_random_uuid() as user_id,
    -- Check out dates between 1-30 days ago
    (now() - interval '1 day' * (random() * 30)::int) as check_out_date,
    -- Expected return dates (some overdue, some not)
    CASE 
      WHEN random() < 0.3 THEN (now() - interval '1 day' * (random() * 5)::int) -- 30% overdue
      ELSE (now() + interval '1 day' * (random() * 10)::int) -- 70% future
    END as expected_return_date,
    -- Randomized operational data with some anomalies
    CASE 
      WHEN random() < 0.2 THEN 0 -- 20% no work time (anomaly)
      ELSE (random() * 100)::int -- Normal work time
    END as working_time,
    -- Idle time (some high ratios for anomalies)
    CASE 
      WHEN random() < 0.25 THEN (random() * 200)::int -- 25% high idle
      ELSE (random() * 50)::int -- Normal idle
    END as idle_time,
    -- Fuel usage (some excessive for anomalies)
    CASE 
      WHEN type = 'excavator' AND random() < 0.2 THEN (random() * 50 + 30)::numeric -- High fuel
      WHEN type = 'bulldozer' AND random() < 0.2 THEN (random() * 60 + 35)::numeric
      WHEN type = 'crane' AND random() < 0.2 THEN (random() * 40 + 25)::numeric
      WHEN type = 'truck' AND random() < 0.2 THEN (random() * 70 + 40)::numeric
      WHEN type = 'forklift' AND random() < 0.2 THEN (random() * 15 + 10)::numeric
      ELSE 
        CASE type
          WHEN 'excavator' THEN (random() * 25 + 5)::numeric
          WHEN 'bulldozer' THEN (random() * 30 + 8)::numeric
          WHEN 'crane' THEN (random() * 20 + 5)::numeric
          WHEN 'truck' THEN (random() * 35 + 10)::numeric
          WHEN 'forklift' THEN (random() * 8 + 2)::numeric
        END
    END as fuel_usage,
    -- Downtime (some excessive)
    CASE 
      WHEN random() < 0.15 THEN (random() * 10 + 4)::int -- 15% high downtime (>3hrs)
      ELSE (random() * 3)::int -- Normal downtime
    END as downtime,
    -- Operating days
    (random() * 10 + 1)::int as no_operating_days
  FROM rented_vehicles
)
INSERT INTO public.rentals (
  user_id, 
  vehicle_id, 
  check_out_date, 
  expected_return_date, 
  check_in_date,
  working_time, 
  idle_time, 
  fuel_usage, 
  downtime, 
  no_operating_days
)
SELECT 
  user_id,
  vehicle_id,
  check_out_date,
  expected_return_date,
  NULL, -- All still active (not checked in)
  working_time,
  idle_time,
  fuel_usage,
  downtime,
  no_operating_days
FROM rental_data;
