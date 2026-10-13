-- Migration: 0013_brand_seo.sql
-- Goal: Add optional SEO metadata fields to Brand table

ALTER TABLE "Brand" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Brand" ADD COLUMN "seoDescription" TEXT;
