-- Ръчни GenArt решения по barcode. НАЙ-ВИСОК приоритет:
-- бие и артикулните правила, и категорийния мапинг.
-- Sync процедурата чете оттук, но НИКОГА не пише и не трие.
--
-- genart_id NULL = ръчно потвърдено "без GenArt" (изключва се от NEXT експорта).
CREATE TABLE [dbo].[map_genart_manual] (
    [barcode]    NVARCHAR (20)  NOT NULL,
    [genart_id]  INT            NULL,
    [note]       NVARCHAR (200) NULL,
    [decided_by] NVARCHAR (50)  NULL,
    [updated_at] DATETIME2 (7)  CONSTRAINT [DF_map_genart_manual_upd] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_map_genart_manual] PRIMARY KEY CLUSTERED ([barcode] ASC)
);
GO
