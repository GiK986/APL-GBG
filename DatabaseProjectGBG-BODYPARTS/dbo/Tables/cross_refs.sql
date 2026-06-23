-- Връзки между базови и подобни артикули (от Refar).
CREATE TABLE [dbo].[cross_refs] (
    [id]           INT           IDENTITY (1, 1) NOT NULL,
    [product_id]   INT           NULL,
    [basic_code]   NVARCHAR (20) NOT NULL,
    [similar_code] NVARCHAR (20) NOT NULL,
    CONSTRAINT [PK_cross_refs] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_cross_refs_products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products] ([product_id])
);
GO

CREATE NONCLUSTERED INDEX [IX_cross_refs_product_id]
    ON [dbo].[cross_refs]([product_id] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_cross_refs_similar_code]
    ON [dbo].[cross_refs]([similar_code] ASC) INCLUDE ([basic_code]);
GO
