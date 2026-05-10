-- Enable btree_gist extension untuk exclusion constraint dengan equality + range
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Cegah dua reservasi pada meja yang sama dengan waktu overlap
ALTER TABLE "reservations"
  ADD CONSTRAINT no_overlap_per_table
  EXCLUDE USING gist (
    "tableId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  );