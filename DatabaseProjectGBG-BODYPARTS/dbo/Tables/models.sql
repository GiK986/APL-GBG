-- Нормализирани модели коли (една серия/шаси на ред), извлечени от
-- GBG-BUFFER.dbo.catalog.model чрез regex (model_group = серия, напр. "GIULIA",
-- "SERIES 1"; model_name = серия + шаси; constr_year_from/to = години на производство).
-- Пълни се/обновява се от usp_sync_from_buffer чрез MERGE (НЕ се truncate-ва,
-- за да остане model_id стабилен между синхронизациите — както brand_id).
-- ktype е тук (по модел), не в applications — фаза "KType" предстои.
CREATE TABLE [dbo].[models] (
    [model_id]         INT            IDENTITY (1, 1) NOT NULL,
    [brand_id]         INT            NOT NULL,
    [model_code]       NVARCHAR (10)  NOT NULL,
    [model_raw]        NVARCHAR (100) NOT NULL,
    [model_group]      NVARCHAR (100) NOT NULL,
    [model_name]       NVARCHAR (100) NOT NULL,
    [constr_year_from] SMALLINT       NULL,
    [constr_year_to]   SMALLINT       NULL,
    [ktype]            INT            NULL,
    CONSTRAINT [PK_models] PRIMARY KEY CLUSTERED ([model_id] ASC),
    CONSTRAINT [FK_models_brands] FOREIGN KEY ([brand_id]) REFERENCES [dbo].[brands] ([brand_id]),
    CONSTRAINT [UQ_models_brand_code] UNIQUE NONCLUSTERED ([brand_id] ASC, [model_code] ASC)
);
GO

CREATE NONCLUSTERED INDEX [IX_models_brand_group]
    ON [dbo].[models]([brand_id] ASC, [model_group] ASC);
GO

CREATE NONCLUSTERED INDEX [IX_models_ktype]
    ON [dbo].[models]([ktype] ASC) WHERE ([ktype] IS NOT NULL);
GO
