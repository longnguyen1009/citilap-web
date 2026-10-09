-- Migration 0008: Order Confirmation Token Hash for CSPRNG Security
-- Author: STORE-14 Production Readiness
-- Date: 2026-10-09

ALTER TABLE "Order" ADD COLUMN "confirmationTokenHash" TEXT;
