CREATE TABLE [dbo].[stock] (
    [item_code]   NVARCHAR (20) NOT NULL,
    [barcode]     NVARCHAR (20) NULL,
    [ath]         BIT           DEFAULT ((0)) NOT NULL,
    [the]         BIT           DEFAULT ((0)) NOT NULL,
    [imported_at] DATETIME2 (7) DEFAULT (getutcdate()) NOT NULL,
    [id]          INT           IDENTITY (1, 1) NOT NULL,
    CONSTRAINT [PK_stock] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_stock_item_code]
    ON [dbo].[stock]([item_code] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_stock_the]
    ON [dbo].[stock]([the] ASC)
    INCLUDE([item_code]);


GO

CREATE NONCLUSTERED INDEX [IX_stock_ath]
    ON [dbo].[stock]([ath] ASC)
    INCLUDE([item_code]);


GO

