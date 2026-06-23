-- Нормализирани марки коли. Служи и като мапинг към TecDoc.
-- tecdoc_man_no се попълва ръчно (курирано) от TECDOC_DATA.
CREATE TABLE [dbo].[brands] (
    [brand_id]        INT           IDENTITY (1, 1) NOT NULL,
    [name_raw]        NVARCHAR (50) NOT NULL,
    [tecdoc_man_no]   INT           NULL,
    [imported_at]     DATETIME2 (7) DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_brands] PRIMARY KEY CLUSTERED ([brand_id] ASC),
    CONSTRAINT [UQ_brands_name_raw] UNIQUE NONCLUSTERED ([name_raw] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_brands_tecdoc_man_no]
    ON [dbo].[brands]([tecdoc_man_no] ASC) WHERE ([tecdoc_man_no] IS NOT NULL);
GO
