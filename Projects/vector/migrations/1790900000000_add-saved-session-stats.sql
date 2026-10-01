-- Up Migration
-- Each saved session's flight and safety numbers, for career stats on the start screen.
ALTER TABLE saved_sessions ADD COLUMN stats jsonb;

-- Sessions saved before: the same numbers, read from their snapshots.
UPDATE saved_sessions SET stats = jsonb_build_object(
  'arrivals', COALESCE((snapshot #>> '{state,score,tally,landing,count}')::int, 0),
  'departures', COALESCE((snapshot #>> '{state,score,tally,departureHandoff,count}')::int, 0),
  'overflights', COALESCE((snapshot #>> '{state,score,tally,transitHandoff,count}')::int, 0),
  'onTime', COALESCE((snapshot #>> '{state,score,timing,arrival,onTime}')::int, 0)
    + COALESCE((snapshot #>> '{state,score,timing,departure,onTime}')::int, 0)
    + COALESCE((snapshot #>> '{state,score,timing,transit,onTime}')::int, 0),
  'timed', COALESCE((snapshot #>> '{state,score,timing,arrival,count}')::int, 0)
    + COALESCE((snapshot #>> '{state,score,timing,departure,count}')::int, 0)
    + COALESCE((snapshot #>> '{state,score,timing,transit,count}')::int, 0),
  'separationLosses', COALESCE((snapshot #>> '{state,score,tally,separationLoss,count}')::int, 0),
  'wakeLosses', COALESCE((snapshot #>> '{state,score,tally,wakeLoss,count}')::int, 0),
  'nearMidAirs', COALESCE((snapshot #>> '{state,score,tally,nearMidAir,count}')::int, 0),
  'goArounds', COALESCE((snapshot #>> '{state,score,tally,goAround,count}')::int, 0)
);

-- Down Migration
ALTER TABLE saved_sessions DROP COLUMN stats;
