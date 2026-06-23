-- DVSE NEXT — TM_Article_Details_GBG
--
-- Един ред за всеки активен продукт с валиден GenArt ID.
-- Критерии за включване:
--   • is_active = 1   (не е изваден от ценоразписа)
--   • genart_id IS NOT NULL   (мапнат към TecDoc GenArt)
--
-- Колони по шаблона на DVSE NEXT:
--   Supplier                = 3323 (TecDoc DSN на GBG / Georgakopoulos)
--   Supplier Article Number = '<barcode> GBG'
--   Trader Article Number   = '<barcode> GBG'  (идентично с горното)
--   Additional Description  = eng_descr от products
--   Pole Position           = 0
--   Stock article           = 0

CREATE VIEW [dbo].[vw_dvse_article_details]
AS
SELECT
    3323                                AS [Supplier],
    p.[barcode] + N' GBG'              AS [Supplier Article Number],
    p.[barcode] + N' GBG'              AS [Trader Article Number],
    p.[eng_descr]                      AS [Additional Description],
    CAST(0 AS INT)                     AS [Pole Position],
    CAST(0 AS INT)                     AS [Stock article]
FROM
    [dbo].[products] AS p
WHERE
    p.[is_active]  = 1
    AND p.[genart_id] IS NOT NULL;
GO
