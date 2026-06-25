-- =============================================================================
-- usp_sync_from_buffer
-- Обновява GBG-BODYPARTS от GBG-BUFFER чрез UPSERT (без TRUNCATE на products).
-- Изпълнява се дневно, СЛЕД буферния внос (import_gbg.py).
-- Предполага, че двете бази са на един SQL Server инстанс.
--
-- Логика:
--   1. brands      -> добавя нови марки
--   2. models      -> MERGE по (brand_id, model_code); regex извлича model_group/
--                      model_name/constr_year_from/to от catalog.model. НЕ се
--                      truncate-ва — model_id остава стабилен между синхронизациите.
--   3. products    -> MERGE по barcode (запазва product_id, sale_price, is_active при ръчна промяна)
--   4. наличности  -> от buffer.stock по barcode
--   5. genart_id   -> от map_category_genart
--   6. applications / oem_numbers / cross_refs -> пълно презареждане (derived)
-- Всичко в една транзакция с rollback при грешка.
-- =============================================================================
CREATE PROCEDURE [dbo].[usp_sync_from_buffer]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @now DATETIME2(7) = sysutcdatetime();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1) Нови марки -------------------------------------------------------
        INSERT INTO dbo.brands (name_raw)
        SELECT DISTINCT c.brand
        FROM [GBG-BUFFER].dbo.[catalog] c
        WHERE c.brand IS NOT NULL
          AND c.model_code NOT IN ('0007', '0039', '0056', '0064', '0227', '0928', '0401')
          AND NOT EXISTS (SELECT 1 FROM dbo.brands b WHERE b.name_raw = c.brand)
          ORDER BY c.brand;

        -- 2) models: MERGE по (brand_id, model_code) ---------------------------
        --    model_group/model_name/constr_year_* извлечени чрез regex от
        --    catalog.model (формат "БРАНД МОДЕЛ ГГГГ-ГГГГ (шаси)"). НЕ delete-ва
        --    при липса в buffer-а (като brands) — стар модел просто спира да се
        --    показва, защото няма активни applications/products към него.
        ;WITH src AS (
            SELECT DISTINCT
                b.brand_id,
                c.model_code,
                c.model AS model_raw,
                LTRIM(RTRIM(REGEXP_SUBSTR(REPLACE(c.model, c.brand, ''),
                    '(.*)[0-9]{4}-[0-9]{0,4}', 1, 1, '', 1))) AS model_group_raw,
                LTRIM(RTRIM(REPLACE(REPLACE(REGEXP_REPLACE(REPLACE(c.model, c.brand, ''),
                    '[0-9]{4}-[0-9]{0,4}', ''), '  ', ' '), '  ', ' '))) AS model_name_raw,
                REGEXP_SUBSTR(c.model, '[0-9]{4}-[0-9]{0,4}') AS year_match
            FROM [GBG-BUFFER].dbo.[catalog] c
            JOIN dbo.brands b ON b.name_raw = c.brand
            WHERE c.model_code NOT IN ('0007', '0039', '0056', '0064', '0227', '0928', '0401')
        ),
        derived AS (
            SELECT
                brand_id, model_code, model_raw,
                COALESCE(NULLIF(model_group_raw, N''), model_name_raw) AS model_group,
                model_name_raw AS model_name,
                TRY_CAST(LEFT(year_match, 4) AS SMALLINT) AS constr_year_from,
                CASE WHEN LEN(year_match) > 5
                     THEN TRY_CAST(SUBSTRING(year_match, 6, 4) AS SMALLINT)
                     ELSE NULL END AS constr_year_to
            FROM src
        )
        MERGE dbo.models AS tgt
        USING derived AS s
            ON tgt.brand_id = s.brand_id AND tgt.model_code = s.model_code
        WHEN MATCHED THEN UPDATE SET
            model_raw        = s.model_raw,
            model_group      = s.model_group,
            model_name       = s.model_name,
            constr_year_from = s.constr_year_from,
            constr_year_to   = s.constr_year_to
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (brand_id, model_code, model_raw, model_group, model_name, constr_year_from, constr_year_to)
            VALUES (s.brand_id, s.model_code, s.model_raw, s.model_group, s.model_name, s.constr_year_from, s.constr_year_to);

        -- 3) products: представителен ред на barcode  --------
        ;WITH rep AS (
            SELECT
                c.barcode, c.eng_descr, c.gr_descr, c.category, c.side,
                c.price, c.weight,
                ROW_NUMBER() OVER (
                    PARTITION BY c.barcode
                    ORDER BY c.price DESC, c.item_code
                ) AS rn
            FROM [GBG-BUFFER].dbo.[catalog] c
            WHERE c.barcode IS NOT NULL
            AND item_code = barcode
            AND c.model_code NOT IN ('0007', '0039', '0056', '0064', '0227', '0928', '0401')
        )
        MERGE dbo.products AS tgt
        USING (SELECT * FROM rep WHERE rn = 1) AS s
            ON tgt.barcode = s.barcode
        WHEN MATCHED THEN UPDATE SET
            eng_descr    = s.eng_descr,
            gr_descr     = s.gr_descr,
            category_raw = s.category,
            side         = s.side,
            cost_price   = s.price,
            weight       = s.weight,
            last_seen    = @now,
            is_active    = 1,
            updated_at   = @now
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (barcode, eng_descr, gr_descr, category_raw, side,
                    cost_price, sale_price, weight, first_seen, last_seen, is_active, updated_at)
            VALUES (s.barcode, s.eng_descr, s.gr_descr, s.category, s.side,
                    s.price, ROUND(s.price * 1.98, 2), s.weight, @now, @now, 1, @now)
        WHEN NOT MATCHED BY SOURCE AND tgt.is_active = 1 THEN
            UPDATE SET is_active = 0, updated_at = @now;

        -- 4) Наличности от buffer.stock (по barcode) --------------------------
        UPDATE p SET
            p.stock_ath = COALESCE(s.ath, 0),
            p.stock_the = COALESCE(s.the, 0)
        FROM dbo.products p
        LEFT JOIN (
            SELECT item_code,
                   MAX(CAST(ath AS INT)) AS ath,
                   MAX(CAST(the AS INT)) AS the
            FROM [GBG-BUFFER].dbo.[stock]
            GROUP BY item_code
        ) s ON s.item_code = p.barcode;

        -- 5) genart_id: ръчно > артикулно правило > категория -----------------
        --    map_genart_manual   (по barcode)            - ръчни решения
        --    map_genart_article  (категория+descr+side)  - от article_genart.py
        --    map_category_genart (по категория)          - fallback за нови описания
        UPDATE p SET
            p.genart_id = COALESCE(mm.genart_id, ma.genart_id, mc.genart_id),
            p.genart_source = COALESCE(
                CASE WHEN mm.barcode      IS NOT NULL THEN N'manual'   END,
                CASE WHEN ma.category_raw IS NOT NULL THEN ma.[source] END,
                CASE WHEN mc.genart_id    IS NOT NULL THEN N'category' END)
        FROM dbo.products p
        LEFT JOIN dbo.map_genart_manual  mm ON mm.barcode = p.barcode
        LEFT JOIN dbo.map_genart_article ma ON ma.category_raw = p.category_raw
                                           AND ma.eng_descr    = p.eng_descr
                                           AND ma.side         = ISNULL(p.side, '')
        LEFT JOIN dbo.map_category_genart mc ON mc.category_raw = p.category_raw;

        -- 5b) опашка за преглед: активни части без ред в артикулния мапинг ----
        --     (включително тези, спасени от категорийния fallback - те също
        --      чакат правило, за да получат проверен артикулен GenArt)
        MERGE dbo.genart_unmapped AS tgt
        USING (
            SELECT p.category_raw, p.eng_descr,
                   ISNULL(p.side, '') AS side, COUNT(*) AS parts_count
            FROM dbo.products p
            WHERE p.is_active = 1
              AND p.category_raw IS NOT NULL AND p.eng_descr IS NOT NULL
              AND p.genart_id IS NULL
            --   AND NOT EXISTS (SELECT 1 FROM dbo.map_genart_manual  mm
            --                   WHERE mm.barcode = p.barcode)
              AND  EXISTS (SELECT 1 FROM dbo.map_genart_article ma
                              WHERE ma.category_raw = UPPER(p.category_raw)
                                AND ma.eng_descr    = UPPER(p.eng_descr)
                                AND ma.side         = ISNULL(p.side, ''))
            GROUP BY p.category_raw, p.eng_descr, ISNULL(p.side, '')
        ) AS s
            ON  tgt.category_raw = s.category_raw
            AND tgt.eng_descr    = s.eng_descr
            AND tgt.side         = s.side
        WHEN MATCHED THEN UPDATE SET
            parts_count = s.parts_count, last_seen = @now
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (category_raw, eng_descr, side, parts_count, first_seen, last_seen)
            VALUES (s.category_raw, s.eng_descr, s.side, s.parts_count, @now, @now)
        WHEN NOT MATCHED BY SOURCE THEN DELETE;

        -- 6a) applications: пълно презареждане --------------------------------
        TRUNCATE TABLE dbo.applications;
        INSERT INTO dbo.applications (product_id, item_code, model_id)
        SELECT p.product_id, c.item_code, m.model_id
        FROM [GBG-BUFFER].dbo.[catalog] c
        JOIN dbo.products p ON p.barcode = c.barcode
        LEFT JOIN dbo.brands b ON b.name_raw = c.brand
        LEFT JOIN dbo.models m ON m.brand_id = b.brand_id AND m.model_code = c.model_code
        WHERE c.model_code NOT IN ('0007', '0039', '0056', '0064', '0227', '0928', '0401');

        -- 6b) oem_numbers: пълно презареждане --------------------------------
        -- OEM в Genuine е по item_code (per-vehicle). Затова джойн през
        -- catalog.item_code -> barcode (product_id) + brand (tecdoc_man_no).
        -- Така се пазят ВСИЧКИ OE и всеки носи правилния ManNo за Reference Brand.
        TRUNCATE TABLE dbo.oem_numbers;
        ;WITH cat AS (
            SELECT DISTINCT item_code, barcode, brand
            FROM [GBG-BUFFER].dbo.[catalog]
            WHERE model_code NOT IN ('0007', '0039', '0056', '0064', '0227', '0928', '0401')
        )
        INSERT INTO dbo.oem_numbers (product_id, item_code, oem_code, net_oem_code, tecdoc_man_no)
        SELECT DISTINCT
            p.product_id, o.product_code, o.oem_code, o.net_oem_code, b.tecdoc_man_no
        FROM [GBG-BUFFER].dbo.[oem_codes] o
        JOIN cat c              ON c.item_code = o.product_code
        JOIN dbo.products p     ON p.barcode   = c.barcode
        LEFT JOIN dbo.brands b  ON b.name_raw  = c.brand;

        -- 6c) cross_refs: пълно презареждане ---------------------------------
        TRUNCATE TABLE dbo.cross_refs;
        INSERT INTO dbo.cross_refs (product_id, basic_code, similar_code)
        SELECT p.product_id, r.basic_code, r.similar_code
        FROM [GBG-BUFFER].dbo.[cross_ref] r
        LEFT JOIN dbo.products p ON p.barcode = r.basic_code;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
