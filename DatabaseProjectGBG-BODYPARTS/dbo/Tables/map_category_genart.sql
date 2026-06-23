-- Ръчно курирана мапинг таблица: категория на доставчика -> TecDoc GenArt ID.
-- Около 175 категории се събират към ~100 реални GenArt.
-- Попълва се поетапно, започвайки от най-обемните категории.
CREATE TABLE [dbo].[map_category_genart] (
    [category_raw] NVARCHAR (100) NOT NULL,
    [genart_id]    INT            NULL,
    [note]         NVARCHAR (200) NULL,
    [updated_at]   DATETIME2 (7)  DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_map_category_genart] PRIMARY KEY CLUSTERED ([category_raw] ASC)
);
GO
