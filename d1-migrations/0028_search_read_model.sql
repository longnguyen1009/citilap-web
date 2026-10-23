-- Materialized public search results. All authoritative writers invalidate via triggers.
CREATE TABLE SearchCatalogRevision (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL);
INSERT INTO SearchCatalogRevision VALUES(1,0);
CREATE TABLE SearchResultSet (
 cacheKey TEXT PRIMARY KEY, revision INTEGER NOT NULL, createdAt INTEGER NOT NULL,
 validUntil INTEGER NOT NULL, query TEXT NOT NULL, facets TEXT NOT NULL, totalCount INTEGER NOT NULL
);
CREATE TABLE SearchResultItem (
 cacheKey TEXT NOT NULL REFERENCES SearchResultSet(cacheKey) ON DELETE CASCADE,
 position INTEGER NOT NULL, document TEXT NOT NULL, PRIMARY KEY(cacheKey,position)
) WITHOUT ROWID;
CREATE TRIGGER search_revision_Product_insert AFTER INSERT ON Product
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Product_update AFTER UPDATE ON Product
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Product_delete AFTER DELETE ON Product
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_ProductVariant_insert AFTER INSERT ON ProductVariant
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_ProductVariant_update AFTER UPDATE ON ProductVariant
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_ProductVariant_delete AFTER DELETE ON ProductVariant
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_ProductStudio_insert AFTER INSERT ON ProductStudio
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_ProductStudio_update AFTER UPDATE ON ProductStudio
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_ProductStudio_delete AFTER DELETE ON ProductStudio
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Brand_insert AFTER INSERT ON Brand
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Brand_update AFTER UPDATE ON Brand
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Brand_delete AFTER DELETE ON Brand
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Category_insert AFTER INSERT ON Category
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Category_update AFTER UPDATE ON Category
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_Category_delete AFTER DELETE ON Category
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_SiteSettings_insert AFTER INSERT ON SiteSettings
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_SiteSettings_update AFTER UPDATE ON SiteSettings
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_SiteSettings_delete AFTER DELETE ON SiteSettings
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_PromotionCampaign_insert AFTER INSERT ON PromotionCampaign
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_PromotionCampaign_update AFTER UPDATE ON PromotionCampaign
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_PromotionCampaign_delete AFTER DELETE ON PromotionCampaign
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_PromotionCampaignItem_insert AFTER INSERT ON PromotionCampaignItem
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_PromotionCampaignItem_update AFTER UPDATE ON PromotionCampaignItem
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
CREATE TRIGGER search_revision_PromotionCampaignItem_delete AFTER DELETE ON PromotionCampaignItem
BEGIN UPDATE SearchCatalogRevision SET revision=revision+1 WHERE id=1; END;
