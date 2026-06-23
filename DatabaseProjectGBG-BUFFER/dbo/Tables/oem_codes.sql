CREATE TABLE [dbo].[oem_codes] (
    [id]           INT           IDENTITY (1, 1) NOT NULL,
    [product_code] NVARCHAR (20) NOT NULL,
    [oem_code]     NVARCHAR (50) NOT NULL,
    [net_oem_code] NVARCHAR (50) NULL,
    [imported_at]  DATETIME2 (7) DEFAULT (getutcdate()) NOT NULL,
    CONSTRAINT [PK_oem_codes] PRIMARY KEY CLUSTERED ([id] ASC)
);


GO

CREATE NONCLUSTERED INDEX [IX_oem_codes_net_oem_code]
    ON [dbo].[oem_codes]([net_oem_code] ASC) WHERE ([net_oem_code] IS NOT NULL);


GO

CREATE NONCLUSTERED INDEX [IX_oem_codes_oem_code]
    ON [dbo].[oem_codes]([oem_code] ASC);


GO

CREATE NONCLUSTERED INDEX [IX_oem_codes_product_code]
    ON [dbo].[oem_codes]([product_code] ASC)
    INCLUDE([oem_code], [net_oem_code]);


GO

