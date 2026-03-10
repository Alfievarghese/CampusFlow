-- =========================================================================
-- CAMPUSFLOW: DATABASE SECURITY & POWER HIERARCHY MIGRATION
-- Copy and paste this full script into the Supabase SQL Editor and hit RUN
-- =========================================================================

-- 1. PATCH SUPABASE RLS VULNERABILITIES 
-- This locks down all postgres tables so they cannot be accessed anonymously
-- via the public REST API. Since CampusFlow uses an Express backend with a 
-- Service Role key, it bypasses RLS safely, meaning this only strictly 
-- enhances security without breaking your app.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Hall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConflictRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RSVP" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;


-- 2. PHASE 5: ADD POWER HIERARCHY COLUMNS
-- This adds the necessary 'powerRank' and 'systemPermissions' fields to
-- support the new Discord-style role hierarchy system.
DO $$ 
BEGIN 
    -- Add powerRank and systemPermissions to the User table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='powerRank') THEN
        ALTER TABLE "User" ADD COLUMN "powerRank" INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='systemPermissions') THEN
        ALTER TABLE "User" ADD COLUMN "systemPermissions" TEXT NOT NULL DEFAULT '[]';
    END IF;

    -- Add powerRank to the OrgMember table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='OrgMember' AND column_name='powerRank') THEN
        ALTER TABLE "OrgMember" ADD COLUMN "powerRank" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Migration and Security Lockdown Complete!
