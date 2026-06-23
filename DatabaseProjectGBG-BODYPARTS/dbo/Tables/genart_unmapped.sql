-- Опашка за преглед: комбинации категория + описание + страна, за които
-- дневният sync не намира ред в map_genart_article.
-- Пълни се от usp_sync_from_buffer (стъпка 4b). Периодично (седмично):
--   1. extracts/normalize_descr.py + article_genart.py върху натрупаното
--   2. load_genart_maps.py залива новите редове в map_genart_article
--   3. редовете тук се трият автоматично при следващия sync (вече мапнати)
CREATE TABLE [dbo].[genart_unmapped] (
    [category_raw] NVARCHAR (100) NOT NULL,
    [eng_descr]    NVARCHAR (200) NOT NULL,
    [side]         NCHAR (2)      CONSTRAINT [DF_genart_unmapped_side] DEFAULT ('') NOT NULL,
    [parts_count]  INT            NOT NULL,
    [first_seen]   DATETIME2 (7)  CONSTRAINT [DF_genart_unmapped_first] DEFAULT (sysutcdatetime()) NOT NULL,
    [last_seen]    DATETIME2 (7)  NOT NULL,
    CONSTRAINT [PK_genart_unmapped]
        PRIMARY KEY CLUSTERED ([category_raw] ASC, [eng_descr] ASC, [side] ASC)
);
GO
