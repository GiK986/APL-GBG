# Handoff към Claude Code

Тази задача изисква достъп до терминала и до локалния MS SQL Server. Cowork сесията няма този достъп, затова я изпълняваш ти. Работим в една директория.

Свързаните файлове са вече тук:

- План: `GBG-BODYPARTS_PLAN.md`
- Схема и sync (Фаза 1 и 2): `DatabaseProjectGBG-BODYPARTS/`
- Извличащи заявки: `extracts/`

---

## Връзка към сървъра

Данните са в `gbg-data/app/config.ini`:

```
server   = localhost,1433
database = GBG-BUFFER
username = sa
password = Qwerty@123
driver   = ODBC Driver 18 for SQL Server
```

Шаблон за sqlcmd (`-C` приема self-signed сертификата):

```bash
sqlcmd -S localhost,1433 -U sa -P 'Qwerty@123' -C -d <БАЗА> -i <входен.sql> -o <изход> -s"|" -W -k1
```

Разделител `|`, понеже категориите съдържат запетаи и наклонени черти.

---

## Стъпка 1 — Деплой на GBG-BODYPARTS (Фаза 1)

Създай базата и таблиците. Редът има значение заради FK.

```bash
DIR="DatabaseProjectGBG-BODYPARTS"
sqlcmd -S localhost,1433 -U sa -P 'Qwerty@123' -C -Q "IF DB_ID('GBG-BODYPARTS') IS NULL CREATE DATABASE [GBG-BODYPARTS];"

for f in brands products map_category_genart applications oem_numbers cross_refs; do
  sqlcmd -S localhost,1433 -U sa -P 'Qwerty@123' -C -d GBG-BODYPARTS -i "$DIR/dbo/Tables/$f.sql"
done

sqlcmd -S localhost,1433 -U sa -P 'Qwerty@123' -C -d GBG-BODYPARTS -i "$DIR/dbo/StoredProcedures/usp_sync_from_buffer.sql"
```

## Стъпка 2 — Първи sync и проверка (Фаза 2)

```bash
sqlcmd -S localhost,1433 -U sa -P 'Qwerty@123' -C -d GBG-BODYPARTS -Q "EXEC dbo.usp_sync_from_buffer;"

sqlcmd -S localhost,1433 -U sa -P 'Qwerty@123' -C -d GBG-BODYPARTS -Q "
SET NOCOUNT ON;
SELECT 'products' t, COUNT(*) n FROM dbo.products
UNION ALL SELECT 'applications', COUNT(*) FROM dbo.applications
UNION ALL SELECT 'oem_numbers', COUNT(*) FROM dbo.oem_numbers
UNION ALL SELECT 'cross_refs', COUNT(*) FROM dbo.cross_refs
UNION ALL SELECT 'brands', COUNT(*) FROM dbo.brands
UNION ALL SELECT 'no_genart', COUNT(*) FROM dbo.products WHERE genart_id IS NULL;"
```

Очаквани обеми: products ~107001, applications ~204745, oem_numbers ~393823, cross_refs ~97755, brands ~58. `no_genart` ще е почти всички, защото `map_category_genart` още е празна. Това е нормално.

Запиши изхода на проверката в `extracts/_verify_counts.txt`.

## Стъпка 3 — Извличане за следващите фази

Пусни четирите заявки и остави CSV-тата в `extracts/`. Cowork сесията ги поема оттам.

```bash
cd extracts
DB_BUF="GBG-BUFFER"; DB_TD="TECDOC_DATA"
S="-S localhost,1433 -U sa -P 'Qwerty@123' -C"

sqlcmd $S -d $DB_BUF -i 01_categories_by_volume.sql -o 01_categories_by_volume.csv -s"|" -W -k1
sqlcmd $S -d $DB_BUF -i 02_brands.sql               -o 02_brands.csv               -s"|" -W -k1
sqlcmd $S -d $DB_TD  -i 03_tecdoc_tables.sql        -o 03_tecdoc_tables.csv        -s"|" -W -k1
sqlcmd $S -d $DB_TD  -i 04_tecdoc_columns.sql       -o 04_tecdoc_columns.csv       -s"|" -W -k1
```

Ако `TECDOC_DATA` се казва другояче, смени `DB_TD`.

---

## Какво връщаш

В `extracts/`:

- `01_categories_by_volume.csv`
- `02_brands.csv`
- `03_tecdoc_tables.csv`
- `04_tecdoc_columns.csv`
- `_verify_counts.txt`

И кратка бележка дали деплоят и sync-ът минаха без грешки. С тези файлове Cowork сесията продължава с Фаза 3 и 4 (мапинг brand към TecDoc ID и category към GenArt).

## Бележки

- Схемата и процедурата не са пускани досега срещу реален сървър. Логиката и имената на колоните са сверени с `DatabaseProjectGBG-BUFFER`. Ако нещо гръмне, докладвай точното съобщение.
- `usp_sync_from_buffer` работи в транзакция. При грешка прави пълен rollback, нищо не остава наполовина.
- Не пипай `GBG-BUFFER`. Тя е staging и се презарежда от `import_gbg.py`.
