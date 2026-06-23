-- OE / OEM кодове на част. net_oem_code е без специални символи (за матчване).
-- OEM номерата в Genuine са по item_code (per-vehicle), затова item_code се пази тук.
-- tecdoc_man_no идва от марката на колата за този item_code (DT100 ManNo) -> Reference Brand за NEXT.
CREATE TABLE [dbo].[oem_numbers] (
    [id]            INT           IDENTITY (1, 1) NOT NULL,
    [product_id]    INT           NOT NULL,
    [item_code]     NVARCHAR (20) NULL,
    [oem_code]      NVARCHAR (50) NOT NULL,
    [net_oem_code]  NVARCHAR (50) NULL,
    [tecdoc_man_no] INT           NULL,
    CONSTRAINT [PK_oem_numbers] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_oem_numbers_products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products] ([product_id])
);
GO

CREATE NONCLUSTERED INDEX [IX_oem_numbers_product_id]
    ON [dbo].[oem_numbers]([product_id] ASC) INCLUDE ([oem_code], [net_oem_code], [tecdoc_man_no]);
GO

CREATE NONCLUSTERED INDEX [IX_oem_numbers_net_oem_code]
    ON [dbo].[oem_numbers]([net_oem_code] ASC) WHERE ([net_oem_code] IS NOT NULL);
GO

CREATE NONCLUSTERED INDEX [IX_oem_numbers_tecdoc_man_no]
    ON [dbo].[oem_numbers]([tecdoc_man_no] ASC) WHERE ([tecdoc_man_no] IS NOT NULL);
GO
