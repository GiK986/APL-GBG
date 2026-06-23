-- DVSE NEXT — TM_References_GBG
--
-- Reference Type 2 (Utility number) и Type 4 (OE number) САМО.
-- Критерии за включване: продуктът е активен И има GenArt ID
-- (без GenArt не влизат нито в Article Details, нито тук).
--
-- Колони по шаблона на DVSE NEXT:
--   Supplier                = 3323
--   Supplier Article Number = '<barcode> GBG'
--   Reference Type          = 2 | 4
--   Reference Brand         = NULL за Type-2 / tecdoc_man_no за Type-4
--                             (oem_numbers.tecdoc_man_no се попълва от brands.tecdoc_man_no
--                              при зареждане на Genuine файла)
--   Reference Number        = barcode (Type-2) | oem_code (Type-4)
--   Show in Article List    = 0
--
-- Дедупликация на OEM кодове:
--   Един OEM код може да се появи за множество приложения (item_code) на един продукт.
--   DISTINCT в Type-4 CTE осигурява по един ред на (barcode, oem_code, tecdoc_man_no).

CREATE VIEW [dbo].[vw_dvse_references]
AS

-- Активни продукти с GenArt — базов набор
WITH active_products AS (
    SELECT
        p.[product_id],
        p.[barcode]
    FROM [dbo].[products] AS p
    WHERE
        p.[is_active]  = 1
        AND p.[genart_id] IS NOT NULL
),

-- Type 2: barcode като utility number
type2 AS (
    SELECT
        ap.[barcode],
        2               AS [Reference Type],
        NULL            AS [Reference Brand],
        ap.[barcode]    AS [Reference Number]
    FROM active_products AS ap
),

-- Type 4: OEM кодове — дедупликирани по (barcode, oem_code, tecdoc_man_no)
type4 AS (
    SELECT DISTINCT
        ap.[barcode],
        4                       AS [Reference Type],
        o.[tecdoc_man_no]       AS [Reference Brand],
        o.[oem_code]            AS [Reference Number]
    FROM active_products AS ap
    INNER JOIN [dbo].[oem_numbers] AS o
        ON o.[product_id] = ap.[product_id]
    WHERE
        o.[oem_code] IS NOT NULL
        AND o.[oem_code] <> N''
)

-- Финален резултат: Type-2 преди Type-4, сортирано по barcode
SELECT
    3323                        AS [Supplier],
    t.[barcode] + N' GBG'      AS [Supplier Article Number],
    t.[Reference Type],
    t.[Reference Brand],
    t.[Reference Number],
    CAST(0 AS INT)              AS [Show in Article List]
FROM (
    SELECT [barcode], [Reference Type], [Reference Brand], [Reference Number] FROM type2
    UNION ALL
    SELECT [barcode], [Reference Type], [Reference Brand], [Reference Number] FROM type4
) AS t;
GO
