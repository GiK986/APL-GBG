-- Една физическа част на barcode (basic item code).
-- product_id е стабилен сурогат, мачва се по barcode при всеки sync и не се мени.
-- image_path е изводим от barcode: папка = първите 4 цифри (model_code).
CREATE TABLE [dbo].[products] (
    [product_id]   INT             IDENTITY (1, 1) NOT NULL,
    [barcode]      NVARCHAR (20)   NOT NULL,
    [eng_descr]    NVARCHAR (200)  NULL,
    [gr_descr]     NVARCHAR (200)  NULL,
    [category_raw] NVARCHAR (100)  NULL,
    [genart_id]    INT             NULL,
    [genart_source] NVARCHAR (40)  NULL,   -- 'manual' | 'rule:<id>' | 'category' | NULL=немапнат
    [weight]       DECIMAL (8, 3)  NULL,
    [cost_price]   DECIMAL (10, 2) NULL,   -- доставна цена (от доставчика)
    [sale_price]   DECIMAL (10, 2) NULL,   -- продажна цена (попълва се от ERP)
    [side]         NCHAR (2)       NULL,   -- LE / RI
    [image_path]   AS (LEFT([barcode], 4) + '/' + [barcode] + '.jpg') PERSISTED,
    [stock_ath]    BIT             DEFAULT ((0)) NOT NULL,  -- наличност Атина
    [stock_the]    BIT             DEFAULT ((0)) NOT NULL,  -- наличност Солун
    [is_active]    BIT             DEFAULT ((1)) NOT NULL,
    [first_seen]   DATETIME2 (7)   DEFAULT (sysutcdatetime()) NOT NULL,
    [last_seen]    DATETIME2 (7)   NULL,
    [updated_at]   DATETIME2 (7)   DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_products] PRIMARY KEY CLUSTERED ([product_id] ASC),
    CONSTRAINT [UQ_products_barcode] UNIQUE NONCLUSTERED ([barcode] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_products_genart_id]
    ON [dbo].[products]([genart_id] ASC) WHERE ([genart_id] IS NOT NULL);
GO

CREATE NONCLUSTERED INDEX [IX_products_category_raw]
    ON [dbo].[products]([category_raw] ASC) INCLUDE ([genart_id]);
GO

CREATE NONCLUSTERED INDEX [IX_products_is_active]
    ON [dbo].[products]([is_active] ASC) INCLUDE ([barcode], [genart_id]);
GO
