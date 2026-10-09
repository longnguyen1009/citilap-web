-- Migration 0007: Contact Submissions & Security Rate Limiting Storage
-- Author: STORE-13 Security Hardening & Rate Limiting
-- Date: 2026-10-09

CREATE TABLE IF NOT EXISTS "ContactSubmission" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "ipHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ContactSubmission_status_idx" ON "ContactSubmission"("status");
CREATE INDEX IF NOT EXISTS "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");

CREATE TABLE IF NOT EXISTS "RateLimitRecord" (
  "key" TEXT PRIMARY KEY NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "RateLimitRecord_expiresAt_idx" ON "RateLimitRecord"("expiresAt");
