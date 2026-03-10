-- Run this script in the Supabase SQL Editor to create the OrgRole table
-- This enables the "Create New Role" feature inside organizations

CREATE TABLE IF NOT EXISTS "public"."OrgRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "powerRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgRole_pkey" PRIMARY KEY ("id")
);

-- Foreign Key: Link OrgRole to Organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'OrgRole_organizationId_fkey'
    ) THEN
        ALTER TABLE "public"."OrgRole" ADD CONSTRAINT "OrgRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Key: Link OrgMember to OrgRole (Optional)
ALTER TABLE "public"."OrgMember" ADD COLUMN IF NOT EXISTS "orgRoleId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'OrgMember_orgRoleId_fkey'
    ) THEN
        ALTER TABLE "public"."OrgMember" ADD CONSTRAINT "OrgMember_orgRoleId_fkey" FOREIGN KEY ("orgRoleId") REFERENCES "public"."OrgRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."OrgRole" ENABLE ROW LEVEL SECURITY;
