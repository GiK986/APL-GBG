CREATE TABLE [dbo].[cross_ref] (
    [basic_code]   NVARCHAR (20) NOT NULL,
    [similar_code] NVARCHAR (20) NOT NULL,
    [imported_at]  DATETIME2 (7) DEFAULT (getutcdate()) NOT NULL,
    CONSTRAINT [PK_cross_ref] PRIMARY KEY CLUSTERED ([basic_code] ASC, [similar_code] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_cross_ref_similar_code]
    ON [dbo].[cross_ref]([similar_code] ASC)
    INCLUDE([basic_code]);


GO

