# GBG-BODYPARTS — База, схема и GenArt пайплайн (снимка на състоянието)

> Записано: 2026-06-23, след проверка срещу живия SQL Server.
> Цел: следваща сесия да прочете само този файл и да има пълна картина,
> без да обхожда наново базата и `gbg-genart/`.

---

## 1. Връзка към базата

```
sqlcmd config get-contexts        # текущ контекст: ubuntu-ms-sql
sqlcmd query -d "GBG-BODYPARTS" -q "<SQL>"
```

Контекстът е насочен към remote MS SQL Server (`31.13.228.173:1433`, user `sa`),
конфигурацията е в `~/.sqlcmd/sqlconfig`. `HANDOFF_CLAUDE_CODE.md` описва по-стар
вариант с `localhost,1433` — вече невалиден, активният път е през контекста по-горе.

---

## 2. Жива схема (потвърдено чрез `INFORMATION_SCHEMA.TABLES`)

9 таблици + 3 изгледа в `dbo`, **1:1 съвпадение** с дефинициите в
`DatabaseProjectGBG-BODYPARTS/dbo/Tables/` и `dbo/Views/`. Схемата по проекта е
вярна — не се е разминала с реалния деплой.

| Таблица | Роля | Ключ |
|---|---|---|
| `products` | Една физическа част по `barcode` | `barcode` UNIQUE, `image_path` computed (`LEFT(barcode,4)+'/'+barcode+'.jpg'`) |
| `applications` | Част → кола (по `item_code`) | FK → products, brands |
| `brands` | Марки коли | `tecdoc_man_no` за TecDoc |
| `oem_numbers` | OE кодове | `tecdoc_man_no` = Reference Brand за NEXT |
| `cross_refs` | Similar codes (от Refar) | — |
| `map_category_genart` | Категория → GenArt (fallback) | PK `category_raw` |
| `map_genart_article` | (категория+descr+side) → GenArt | PK композитен, `source`='rule:&lt;id&gt;'\|'category' |
| `map_genart_manual` | **Ръчен fix по barcode**, най-висок приоритет | PK `barcode`, sync никога не пише/трие тук |
| `genart_unmapped` | Опашка: активни части без GenArt | пълни се от sync, топи се сама |

Изгледи: `vw_dvse_article_details`, `vw_dvse_product_groups`, `vw_dvse_references`
(виж секция 4).

Stored proc `usp_sync_from_buffer` (в `dbo/StoredProcedures/`): дневен UPSERT от
`GBG-BUFFER` → `GBG-BODYPARTS`, в една транзакция, rollback при грешка. Логика:
brands → products (MERGE по barcode, пази `product_id`/`sale_price`/`is_active`) →
stock → genart_id (manual > article rule > category) → genart_unmapped опашка →
пълно презареждане на applications/oem_numbers/cross_refs.

---

## 3. Обеми — план срещу реалност (2026-06-23)

| Таблица | План/Handoff очакваше | Реално сега |
|---|---|---|
| products | ~107 001 | **107 149** |
| applications | ~204 745 | **205 305** |
| oem_numbers | ~393 823 | **412 399** |
| cross_refs | ~97 755 | **98 196** |
| brands | 58 | **54** (4 по-малко, вероятно никога неприсъствали марки) |
| map_category_genart | ~175 | **172** |
| map_genart_article | ~48 600 | **48 480** |
| map_genart_manual | — | **1** |
| genart_unmapped | — | **318** |
| products активни без GenArt | "почти всички" (старо очакване) | **31** — мапингът е практически завършен |

`HANDOFF_CLAUDE_CODE.md` още описва очакване "no_genart ще е почти всички" —
**остаряло**, реалното състояние е 31 от 107k.

---

## 4. NEXT (DVSE) експорт — РЕШЕНО: през DB views

Има два паралелни пътя за генериране на NEXT файловете. **Решено: каноничният
път е през SQL изгледите, не през Python скрипта.**

- ✅ **Активен/каноничен:** `dbo.vw_dvse_article_details`, `dbo.vw_dvse_product_groups`,
  `dbo.vw_dvse_references` — четат директно от `products`/`oem_numbers`,
  филтър `is_active=1 AND genart_id IS NOT NULL`, `Supplier Article Number = barcode + ' GBG'`.
- ⚠️ **Legacy/паралелен:** `gbg-genart/dvse_export.py` генерира същите три xlsx
  директно от `Pricelist_36078.txt` (не от базата). Произвел е файловете в root
  (`TM_Article_Details_GBG.xlsx` и др., датирани 15 юни). Този скрипт **не е**
  активният път напред — пази се за справка/история, но не се ползва за бъдещи
  експорти.

При нужда от нов NEXT експорт: SELECT от трите `vw_dvse_*` изгледа, не пускай
`dvse_export.py`.

---

## 5. GenArt мапинг пайплайн (`gbg-genart/`)

Генерира `dbo.map_genart_article` и `dbo.map_category_genart`. Описан подробно в
`gbg-genart/GENART_MAINTENANCE.md` (дърво на решенията — кое се пипа къде).

```
Pricelist_36078.txt
   │
normalize_descr.py ──► 13_descr_norm_all.csv     (парсва base_type/carrier/purpose/position/features)
   │
article_genart.py  ──► 14_article_genart.csv     (48 481 реда = точно колкото в DB — синхронизирано)
   │
gbg-data/app/load_genart_maps.py  ──► dbo.map_genart_article + dbo.map_category_genart
   │
EXEC dbo.usp_sync_from_buffer  ──► products.genart_id
```

**Приоритет на резолюция (код потвърден в `article_genart.py`):**

1. `gbg-genart/map_genart_manual.csv` (47 реда, ключ `category+descr_raw`) →
   маркира се `source='rule:MANUAL'` в `14_article_genart.csv`.
   ⚠️ **Различно от** DB-таблицата `dbo.map_genart_manual` (виж т.2) — онази е
   per-`barcode`, директно в базата, по-висок и финален приоритет в SQL sync-а.
   Това CSV е priority-1 *вътре в Python пайплайна*, преди категорийните правила.
2. `genart_rules.csv` (172 правила, ред = приоритет, само за 38 категории в
   `genart_target_categories.csv`).
3. `10_category_genart_v3.csv` (172 категории) — fallback по категория.

Валидация: всяко GenArt ID от правилата трябва да съществува в `07_genart_list.csv`
(~11 100 реда, пълен TecDoc справочник) — невалиден ID гърми скрипта преди база.

**Цикъл след промяна** (виж `GENART_MAINTENANCE.md` за пълни детайли):
```
python3 normalize_descr.py --all && python3 article_genart.py   # гледай DIFF отчета
gbg-data/app/.venv/bin/python3 gbg-data/app/load_genart_maps.py \
    gbg-genart/14_article_genart.csv gbg-genart/10_category_genart_v3.csv
EXEC dbo.usp_sync_from_buffer;   # в SSMS
```

**Седмичен преглед:** `SELECT TOP 50 * FROM dbo.genart_unmapped ORDER BY parts_count DESC;`

---

## 6. Бележки за директориите

- `extracts/` — **временни резултати**, не четри като устойчив източник на истина.
- `gbg-genart/` — устойчив пайплайн, активно поддържан (виж `GENART_MAINTENANCE.md`).
- `DatabaseProjectGBG-BODYPARTS/` — SQL Database Project, схемата тук = живата схема (потвърдено т.2).
