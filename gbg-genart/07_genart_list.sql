-- База: TECDOC_DATA
-- Цел: списък на генеричните артикули с английско описание, за мапинга category -> GenArt.
-- Път: DT320 (GenArtNo, TermNo) -> DT030 (Term по TermNo + LangNo).
--
-- ВАЖНО: първо пусни ЗАЯВКА А, за да намериш LangNo на английския език,
-- после сложи числото в @LangEN в ЗАЯВКА Б.

-- ===== ЗАЯВКА А: езици (намери English) =====
-- SET NOCOUNT ON;
-- SELECT DISTINCT d.LangNo, d.Term
-- FROM dbo.[DT030 Language Descriptions] d
-- JOIN dbo.[DT020 Language] l ON l.TermNo = d.TermNo
-- ORDER BY d.LangNo;

-- ===== ЗАЯВКА Б: GenArt с английско описание =====
DECLARE @LangEN INT = 4   -- смени според ЗАЯВКА А
SELECT
    dt320.GenArtNo,
    t.Term AS genart_en
    ,dt323desc.Term AS standardised_article_description
    ,dt324desc.Term AS assembly_groups
    ,dt325desc.Term AS purpose_of_use
    ,dt320.[Delete]
FROM dbo.[DT320 Generic Articles] dt320
LEFT JOIN dbo.[DT030 Language Descriptions] t
       ON t.TermNo = dt320.TermNo AND t.LangNo = @LangEN
LEFT JOIN [DT323 Standardised Article Description] dt323
        ON dt323.NormTermNo = dt320.NormTermNo       
LEFT JOIN dbo.[DT030 Language Descriptions] dt323desc
       ON dt323desc.TermNo = dt323.TermNo AND dt323desc.LangNo = @LangEN       
LEFT JOIN [DT324 Assembly Groups] dt324
        ON dt324.AssGrpNo = dt320.AssGrpNo       
LEFT JOIN dbo.[DT030 Language Descriptions] dt324desc
       ON dt324desc.TermNo = dt324.TermNo AND dt324desc.LangNo = @LangEN
LEFT JOIN [DT325 Purpose of Use] dt325
        ON dt325.UsageNo = dt320.UsageNo       
LEFT JOIN dbo.[DT030 Language Descriptions] dt325desc
       ON dt325desc.TermNo = dt325.TermNo AND dt325desc.LangNo = @LangEN               
-- WHERE ISNULL(dt320.[Delete],0) = 0
ORDER BY dt320.GenArtNo;
