-- Връзка част към модел. Един ред на item_code (приложение по модел).
-- model_raw/model_code/ktype/brand_id живеят в dbo.models — тук само линкът.
CREATE TABLE [dbo].[applications] (
    [id]         INT           IDENTITY (1, 1) NOT NULL,
    [product_id] INT           NOT NULL,
    [item_code]  NVARCHAR (20) NOT NULL,
    [model_id]   INT           NULL,
    CONSTRAINT [PK_applications] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_applications_products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products] ([product_id]),
    CONSTRAINT [FK_applications_models] FOREIGN KEY ([model_id]) REFERENCES [dbo].[models] ([model_id])
);
GO

CREATE NONCLUSTERED INDEX [IX_applications_product_id]
    ON [dbo].[applications]([product_id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_applications_item_code]
    ON [dbo].[applications]([item_code] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_applications_model_id]
    ON [dbo].[applications]([model_id] ASC);
GO
