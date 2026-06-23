-- Migration: replace item_code PK with id IDENTITY on dbo.stock
-- Run once on the server:
--   sqlcmd -S localhost -U sa -P <password> -d GBG-BUFFER -i migrate_stock_pk.sql

USE [GBG-BUFFER];
GO

-- 1. Drop dependent indexes first
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_stock_ath'  AND object_id = OBJECT_ID('dbo.stock'))
    DROP INDEX IX_stock_ath  ON dbo.stock;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_stock_the'  AND object_id = OBJECT_ID('dbo.stock'))
    DROP INDEX IX_stock_the  ON dbo.stock;

-- 2. Drop existing PK
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'PK_stock')
    ALTER TABLE dbo.stock DROP CONSTRAINT PK_stock;

-- 3. Add id IDENTITY as new PK
ALTER TABLE dbo.stock
    ADD id INT IDENTITY(1,1) NOT NULL;

ALTER TABLE dbo.stock
    ADD CONSTRAINT PK_stock PRIMARY KEY CLUSTERED (id ASC);

-- 4. Recreate indexes
CREATE NONCLUSTERED INDEX IX_stock_item_code ON dbo.stock (item_code ASC);
CREATE NONCLUSTERED INDEX IX_stock_ath       ON dbo.stock (ath ASC) INCLUDE (item_code);
CREATE NONCLUSTERED INDEX IX_stock_the       ON dbo.stock (the ASC) INCLUDE (item_code);

PRINT 'Migration complete — dbo.stock now uses id IDENTITY as PK.';
GO
