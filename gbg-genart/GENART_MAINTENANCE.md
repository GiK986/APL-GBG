# Поддръжка на нормализацията и GenArt мапинга

## Кое къде се променя (дърво на решенията)

**Една конкретна част е сбъркана (по barcode)**
→ ред в `dbo.map_genart_manual` направо в базата. Най-висок приоритет, sync не го пипа.

```sql
INSERT INTO dbo.map_genart_manual (barcode, genart_id, note, decided_by)
VALUES (N'012345678', 4111, N'причина', N'GiK986');
```

**Цял тип описания е сбъркан или липсва (като START/STOP SWITCH → 4111)**
→ ред в `genart_rules.csv`. Редът на редовете е приоритетът, първото съвпаднало правило печели, затова специфичните стоят над генеричните. Празно genart_id значи „проверено, няма GenArt".

**Парсерът не разпознава дума (стои в колоната residual)**
→ ред в `vocab_extra.csv`: `token;class[;extra]`. Класове: base, carrier, purpose, position, body, material, finish, features, packaging, variant, maker, engine, noise, typo, multiword.

**Категорията трябва да мине под артикулни правила**
→ ред в `genart_target_categories.csv`.

**Нова категория от доставчика**
→ ред в `10_category_genart_v3.csv` (fallback) и при нужда в target файла.

Кодът (`normalize_descr.py`, `article_genart.py`) се пипа само при нов клас информация или нов формат на данните.

## Цикълът след промяна

```gbg
cd gbg-genart/
python3 normalize_descr.py --all      # 13_descr_norm_all.csv
python3 article_genart.py             # 14_article_genart.csv + DIFF отчет
```

**Гледай DIFF отчета.** Той показва колко части сменят GenArt и кои, ПРЕДИ
нещо да е пипнало базата. Очакваш само промяната, която си направил.
Ако правило е закачило странични части, виждаш го тук и го стесняваш
(добави второ условие, например `SWITCH` в base_type срещу токен,
който се среща и другаде — случаят START/STOP при кондензаторите).

После зареждане и презапис:

```gbg
gbg-data/app/.venv/bin/python3 gbg-data/app/load_genart_maps.py \
    gbg-genart/14_article_genart.csv gbg-genart/10_category_genart_v3.csv
# в SSMS: EXEC dbo.usp_sync_from_buffer;
```

## Седмичният преглед

1. `SELECT TOP 50 * FROM dbo.genart_unmapped ORDER BY parts_count DESC;`
   Това са нови описания без артикулен ред (включително хванатите от
   категорийния fallback — те чакат проверено правило).
2. За всяко: правило, дума в речника или ръчен ред по дървото горе.
3. Цикълът след промяна (виж по-горе). Опашката се топи сама при
   следващия sync.

## Проверки на здравето

```sql
-- разпределение по произход (очаквано: rule+category ≈ 97-98%, NULL < 3%)
SELECT genart_source, COUNT(*) AS parts
FROM dbo.products WHERE is_active = 1
GROUP BY genart_source ORDER BY parts DESC;

-- ръчните решения, за ревизия
SELECT * FROM dbo.map_genart_manual ORDER BY updated_at DESC;
```

`article_genart.py` сам валидира, че всяко genart_id от правилата
съществува в `07_genart_list.csv` — невалидно ID спира скрипта, преди
да е стигнало до базата. При обновен TecDoc дъмп регенерирай
`07_genart_list.csv` със заявката от `07_genart_list.sql`.

## Файловете накратко

| Файл                                      | Роля                                | Пипа се      |
| ----------------------------------------- | ----------------------------------- | ------------ |
| `vocab_extra.csv`                         | речникови добавки за парсера        | често        |
| `genart_rules.csv`                        | артикулни правила (ред = приоритет) | често        |
| `genart_target_categories.csv`            | категории под правила               | рядко        |
| `10_category_genart_v3.csv`               | категориен fallback                 | рядко        |
| `dbo.map_genart_manual`                   | ръчни решения по barcode            | при нужда    |
| `normalize_descr.py`, `article_genart.py` | код                                 | почти никога |
