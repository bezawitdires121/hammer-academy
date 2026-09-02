-- Announcement audience targeting
ALTER TABLE "announcements"
ADD COLUMN "audience" JSONB;
