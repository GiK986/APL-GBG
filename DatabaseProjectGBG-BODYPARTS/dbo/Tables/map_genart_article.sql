-- Артикулен GenArt мапинг: категория + описание + страна -> TecDoc GenArt ID.
-- Генерира се от extracts/article_genart.py (14_article_genart.csv, ~48 600 реда)
-- и се зарежда с gbg-data/app/load_genart_maps.py.
--
-- genart_id NULL е ЛЕГИТИМНА стойност: "проверено, няма GenArt в TecDoc"
-- (рефлектори за брони, капачки фароструйки, скинове и т.н.).
-- Това е различно от ЛИПСВАЩ ред, който значи "още непроверено описание".
--
-- side: '' = двустранна/без страна (PK не допуска NULL).
CREATE TABLE [dbo].[map_genart_article] (
    [category_raw] NVARCHAR (100) NOT NULL,
    [eng_descr]    NVARCHAR (200) NOT NULL,
    [side]         NCHAR (2)      CONSTRAINT [DF_map_genart_article_side] DEFAULT ('') NOT NULL,
    [genart_id]    INT            NULL,
    [source]       NVARCHAR (40)  NOT NULL,   -- 'rule:<id>' | 'category'
    [updated_at]   DATETIME2 (7)  CONSTRAINT [DF_map_genart_article_upd] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_map_genart_article]
        PRIMARY KEY CLUSTERED ([category_raw] ASC, [eng_descr] ASC, [side] ASC)
);
GO
