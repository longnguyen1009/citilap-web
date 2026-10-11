-- Additive CMS media registry. ProductImage remains the product association.
-- No R2 objects are moved/deleted. Legacy URLs are retained without remote fetch.
CREATE TABLE MediaAsset (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('IMAGE','VIDEO')),
  provider TEXT NOT NULL CHECK(provider IN ('R2','YOUTUBE','LEGACY')),
  storageKey TEXT UNIQUE,
  externalId TEXT,
  name TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  mimeType TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  revision INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'READY' CHECK(state IN ('READY','ARCHIVED')),
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX MediaAsset_state_createdAt_idx ON MediaAsset(state, createdAt);
CREATE UNIQUE INDEX MediaAsset_provider_externalId_key ON MediaAsset(provider, externalId);
CREATE TABLE MediaUsage (
  id TEXT PRIMARY KEY NOT NULL,
  assetId TEXT NOT NULL REFERENCES MediaAsset(id) ON DELETE RESTRICT,
  ownerType TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  slot TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(assetId,ownerType,ownerId,slot)
);
CREATE INDEX MediaUsage_owner_idx ON MediaUsage(ownerType,ownerId);
CREATE INDEX MediaUsage_assetId_idx ON MediaUsage(assetId);

INSERT OR IGNORE INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,size,width,height)
SELECT 'legacy-' || id, 'IMAGE',
  CASE WHEN r2Key LIKE 'https://%' OR r2Key LIKE 'http://%' THEN 'LEGACY' ELSE 'R2' END,
  r2Key, r2Key, coalesce(alt,''), mimeType,size,width,height
FROM ProductImage ORDER BY id;
INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot)
SELECT 'pi-' || p.id, a.id, 'PRODUCT', p.productId, 'image:' || p.id
FROM ProductImage p JOIN MediaAsset a ON a.storageKey=p.r2Key;

-- Keep the legacy uploader and product-image relation tracked after this migration.
CREATE TRIGGER media_product_image_insert AFTER INSERT ON ProductImage BEGIN
  INSERT OR IGNORE INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,size,width,height)
  VALUES('legacy-' || NEW.id,'IMAGE',CASE WHEN NEW.r2Key LIKE 'https://%' OR NEW.r2Key LIKE 'http://%' THEN 'LEGACY' ELSE 'R2' END,
    NEW.r2Key,NEW.r2Key,coalesce(NEW.alt,''),NEW.mimeType,NEW.size,NEW.width,NEW.height);
  UPDATE MediaAsset SET state='READY',revision=revision+1 WHERE storageKey=NEW.r2Key AND state='ARCHIVED';
  INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot)
  SELECT 'pi-' || NEW.id,id,'PRODUCT',NEW.productId,'image:' || NEW.id FROM MediaAsset WHERE storageKey=NEW.r2Key;
END;
CREATE TRIGGER media_product_image_delete AFTER DELETE ON ProductImage BEGIN
  DELETE FROM MediaUsage WHERE id='pi-' || OLD.id;
END;
CREATE TRIGGER media_product_image_update AFTER UPDATE OF r2Key,productId ON ProductImage BEGIN
  DELETE FROM MediaUsage WHERE id='pi-' || OLD.id;
  INSERT OR IGNORE INTO MediaAsset(id,kind,provider,storageKey,name,alt,mimeType,size,width,height)
  VALUES('legacy-' || NEW.id,'IMAGE',CASE WHEN NEW.r2Key LIKE 'https://%' OR NEW.r2Key LIKE 'http://%' THEN 'LEGACY' ELSE 'R2' END,
    NEW.r2Key,NEW.r2Key,coalesce(NEW.alt,''),NEW.mimeType,NEW.size,NEW.width,NEW.height);
  UPDATE MediaAsset SET state='READY',revision=revision+1 WHERE storageKey=NEW.r2Key AND state='ARCHIVED';
  INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot)
  SELECT 'pi-' || NEW.id,id,'PRODUCT',NEW.productId,'image:' || NEW.id FROM MediaAsset WHERE storageKey=NEW.r2Key;
END;
-- Prevent future CMS owners from attaching archived assets.
CREATE TRIGGER media_usage_ready BEFORE INSERT ON MediaUsage
WHEN NOT EXISTS(SELECT 1 FROM MediaAsset WHERE id=NEW.assetId AND state='READY')
BEGIN SELECT RAISE(ABORT,'MEDIA_NOT_READY'); END;
CREATE TRIGGER media_archive_guard BEFORE UPDATE OF state ON MediaAsset
WHEN NEW.state='ARCHIVED' AND EXISTS(SELECT 1 FROM MediaUsage WHERE assetId=NEW.id)
BEGIN SELECT RAISE(ABORT,'MEDIA_IN_USE'); END;

-- Track the legacy string gallery too (new-product forms persist URLs there).
INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot)
SELECT 'gallery-' || p.id || '-' || j.key,a.id,'PRODUCT',p.id,'gallery:' || j.key
FROM Product p,json_each(CASE WHEN json_valid(p.images) THEN p.images ELSE '[]' END) j
JOIN MediaAsset a ON j.value='/api/library/' || a.id OR j.value='/api/media/' || a.storageKey OR j.value=a.storageKey;
CREATE TRIGGER media_product_gallery_insert AFTER INSERT ON Product BEGIN
  UPDATE MediaAsset SET state='READY',revision=revision+1 WHERE state='ARCHIVED' AND id IN (
    SELECT a.id FROM MediaAsset a,json_each(CASE WHEN json_valid(NEW.images) THEN NEW.images ELSE '[]' END) j
    WHERE j.value='/api/library/' || a.id OR j.value='/api/media/' || a.storageKey OR j.value=a.storageKey);
  INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot)
  SELECT 'gallery-' || NEW.id || '-' || j.key,a.id,'PRODUCT',NEW.id,'gallery:' || j.key
  FROM json_each(CASE WHEN json_valid(NEW.images) THEN NEW.images ELSE '[]' END) j JOIN MediaAsset a
  ON j.value='/api/library/' || a.id OR j.value='/api/media/' || a.storageKey OR j.value=a.storageKey;
END;
CREATE TRIGGER media_product_gallery_update AFTER UPDATE OF images ON Product BEGIN
  DELETE FROM MediaUsage WHERE ownerType='PRODUCT' AND ownerId=NEW.id AND slot LIKE 'gallery:%';
  UPDATE MediaAsset SET state='READY',revision=revision+1 WHERE state='ARCHIVED' AND id IN (
    SELECT a.id FROM MediaAsset a,json_each(CASE WHEN json_valid(NEW.images) THEN NEW.images ELSE '[]' END) j
    WHERE j.value='/api/library/' || a.id OR j.value='/api/media/' || a.storageKey OR j.value=a.storageKey);
  INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot)
  SELECT 'gallery-' || NEW.id || '-' || j.key,a.id,'PRODUCT',NEW.id,'gallery:' || j.key
  FROM json_each(CASE WHEN json_valid(NEW.images) THEN NEW.images ELSE '[]' END) j JOIN MediaAsset a
  ON j.value='/api/library/' || a.id OR j.value='/api/media/' || a.storageKey OR j.value=a.storageKey;
END;
CREATE TRIGGER media_product_usage_delete AFTER DELETE ON Product BEGIN
  DELETE FROM MediaUsage WHERE ownerType='PRODUCT' AND ownerId=OLD.id;
END;
