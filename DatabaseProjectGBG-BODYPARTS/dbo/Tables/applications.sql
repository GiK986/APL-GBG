-- Връзка част към кола. Един ред на item_code (приложение по модел).
-- ktype се извежда по-късно от model_raw срещу TECDOC_DATA.
CREATE TABLE [dbo].[applications] (
    [id]         INT            IDENTITY (1, 1) NOT NULL,
    [product_id] INT            NOT NULL,
    [item_code]  NVARCHAR (20)  NOT NULL,
    [brand_id]   INT            NULL,
    [model_raw]  NVARCHAR (100) NULL,
    [model_code] NVARCHAR (10)  NULL,
    [ktype]      INT            NULL,
    CONSTRAINT [PK_applications] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_applications_products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products] ([product_id]),
    CONSTRAINT [FK_applications_brands] FOREIGN KEY ([brand_id]) REFERENCES [dbo].[brands] ([brand_id])
);
GO

CREATE NONCLUSTERED INDEX [IX_applications_product_id]
    ON [dbo].[applications]([product_id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_applications_item_code]
    ON [dbo].[applications]([item_code] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_applications_brand_id]
    ON [dbo].[applications]([brand_id] ASC) INCLUDE ([model_raw], [ktype]);
GO

CREATE NONCLUSTERED INDEX [IX_applications_ktype]
    ON [dbo].[applications]([ktype] ASC) WHERE ([ktype] IS NOT NULL);
GO
