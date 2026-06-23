CREATE TABLE [dbo].[catalog] (
    [id]           INT             IDENTITY (1, 1) NOT NULL,
    [item_code]    NVARCHAR (20)   NOT NULL,
    [genuine_code] NVARCHAR (50)   NULL,
    [barcode]      NVARCHAR (20)   NOT NULL,
    [gr_descr]     NVARCHAR (200)  NULL,
    [eng_descr]    NVARCHAR (200)  NULL,
    [model_code]   NVARCHAR (10)   NULL,
    [brand]        NVARCHAR (50)   NULL,
    [model]        NVARCHAR (100)  NULL,
    [category]     NVARCHAR (100)  NULL,
    [side]         NCHAR (2)       NULL,
    [price]        DECIMAL (10, 2) NULL,
    [weight]       DECIMAL (8, 3)  NULL,
    [imported_at]  DATETIME2 (7)   DEFAULT (getutcdate()) NOT NULL,
    CONSTRAINT [PK_catalog] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_catalog_barcode]
    ON [dbo].[catalog]([barcode] ASC)
    INCLUDE([brand], [category], [price]);


GO

CREATE NONCLUSTERED INDEX [IX_catalog_brand_category]
    ON [dbo].[catalog]([brand] ASC, [category] ASC)
    INCLUDE([barcode], [price], [eng_descr]);


GO

CREATE NONCLUSTERED INDEX [IX_catalog_item_code]
    ON [dbo].[catalog]([item_code] ASC);


GO

