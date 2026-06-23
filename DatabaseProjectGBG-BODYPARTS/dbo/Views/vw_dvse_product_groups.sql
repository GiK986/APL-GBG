-- DVSE NEXT — TM_Product_Groups_GBG
--
-- Един ред за всеки активен продукт с валиден GenArt ID.
-- Критерии идентични с vw_dvse_article_details.
--
-- Колони по шаблона на DVSE NEXT:
--   Supplier                = 3323
--   Supplier Article Number = '<barcode> GBG'
--   TecDoc GenArt ID        = genart_id от products (вече финално резолвиран:
--                             manual override > article rule > category fallback)

CREATE VIEW [dbo].[vw_dvse_product_groups]
AS
SELECT
    3323                                AS [Supplier],
    p.[barcode] + N' GBG'              AS [Supplier Article Number],
    p.[genart_id]                      AS [TecDoc GenArt ID]
FROM
    [dbo].[products] AS p
WHERE
    p.[is_active]  = 1
    AND p.[genart_id] IS NOT NULL;
GO
