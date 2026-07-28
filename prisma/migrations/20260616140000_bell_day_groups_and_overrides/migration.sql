-- Redefine bell_times with day groups (drop old single-set table; it was empty)
DROP TABLE "bell_times";

CREATE TABLE "bell_times" (
    "id" TEXT NOT NULL,
    "day_group" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bell_times_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bell_times_day_group_number_key" ON "bell_times"("day_group", "number");

-- Temporary overrides
CREATE TABLE "bell_overrides" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bell_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bell_override_slots" (
    "id" TEXT NOT NULL,
    "override_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "bell_override_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bell_override_slots_override_id_number_key" ON "bell_override_slots"("override_id", "number");

ALTER TABLE "bell_override_slots" ADD CONSTRAINT "bell_override_slots_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "bell_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
