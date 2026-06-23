# GBG Catalog MVP — дизайн

> Записано: 2026-06-23
> Контекст: бъдещ TM1-вграждан модул (като UniCat), но MVP се гради и тества
> локално; реалната `postMessage` вградка в TM1 е следваща фаза.
> Виж [DB_STATE_AND_GENART_PIPELINE.md](../../../DB_STATE_AND_GENART_PIPELINE.md)
> за пълната схема и [NEXT_CATALOGUE_POSTMESSAGE_BASKET.md](../../../NEXT_CATALOGUE_POSTMESSAGE_BASKET.md)
> за протокола на бутона "Добави".

---

## 1. Цел и обхват

Уеб приложение `gbg-catalog/` за разглеждане и търсене на части от
`GBG-BODYPARTS`, проектирано да заработи по-късно като модул, вграждан в TM1
Next Catalogue (cross-origin iframe, по модела на UniCat). За MVP се гради и
тества само локално — самата `postMessage` вградка в TM1 е следваща фаза.

**В обхват за MVP:**

- Търсене по OE номер / баркод / описание / свободен текст марка-модел
- Browse йерархия: марки → модели → части на модела
- Страница с детайли на артикул
- Снимки от локален път (NAS на сървъра по-късно)
- Език bg/en през `lid` query param
- Динамично изчислена продажна цена (markup правило)
- Бутон "Добави" с коректния `postMessage` формат (без реална TM1 проверка)

**Извън обхват за MVP:**

- Реална вградка/регистрация в TM1, проверка на `targetOrigin`
- TecDoc KType връзка част↔кола (Фаза 7 на основния план, не е готова)
- Многоезични описания от `TECDOC_DATA` по GenArt ID
- Филтър по категория в ляв панел
- Автентикация на потребителя на модула

---

## 2. Архитектура

Next.js 14 (App Router) + TypeScript, нова директория `gbg-catalog/` в корена
на проекта (до `DatabaseProjectGBG-BODYPARTS/`, `gbg-genart/`, `gbg-data/`).

- **Без отделен API слой.** Server Components четат `searchParams` и пускат
  параметризирани SQL заявки директно към `GBG-BODYPARTS` чрез `mssql`
  (npm пакет, Tedious driver) — единственият консуматор на данните е самото
  приложение, REST договор не е нужен на този етап.
- Връзка към базата: конфигурация през env vars (host/port/user/pass/database),
  стойностите засега огледални на `sqlcmd` контекста `ubuntu-ms-sql`
  (31.13.228.173:1433, `sa`).
- Снимки: route handler `/img/[barcode]`, чете от `PARTS_DIR` env var
  (локално `/Volumes/sftpgo-storage/data/georgakopoulos/Parts`, на сървъра
  ще се смени), резолвира `LEFT(barcode,4)/barcode.jpg`. Връща placeholder
  при липсващ файл (без 404 страница).

---

## 3. Търсене

Един текстов бокс. OR-комбинация по:

- `products.barcode` (exact / LIKE)
- `oem_numbers.oem_code`, `oem_numbers.net_oem_code`
- `products.eng_descr`, `products.gr_descr` (LIKE)
- `applications.model_raw`, `dbo.brands.name_raw` (LIKE, свободен текст)

Без TecDoc KType мач — само текстово съвпадение. Резултати пагинирани
(25/страница), просто ранкиране: точен баркод/OE мач първи, после описание.

URL: `/search?q=<текст>&lid=<32|4>&page=<n>`

---

## 4. Browse йерархия (марка → модел → части)

Потвърдено в базата: `applications.model_code` ↔ `model_raw` е 1:1
(2155 различни модела), чист груповъчен ключ.

- `/brands` — грид с марки (`dbo.brands`), брой части на марка
- `/brands/[brand]/models` — модели за марката, групирани по
  `applications.model_code`, показва се `model_raw`, брой части на модел
- `/brands/[brand]/models/[modelCode]/parts` — всички части за модела
  (JOIN `applications.model_code = X` → `products`), реизползва същия
  резултатен компонент като търсачката (карта/ред)

---

## 5. Резултатна карта/ред (споделен компонент)

Ползва се и в `/search`, и в `/brands/.../parts`:

- Миниатюра (от `/img/[barcode]`)
- Баркод, описание (по избран език), категория
- Наличност: зелено/червено индикатор от `stock_ath`/`stock_the` —
  **без бройки**, по политика на доставчика
- Цена: `sale_price`, показва `—` ако е NULL
- Бутон "Добави" (виж т.7)
- Линк към `/part/[barcode]`

---

## 6. Страница с детайли (`/part/[barcode]`)

- Голяма снимка
- Пълно описание (bg/en по `lid`)
- Всички OE номера (`oem_numbers`, дедупликирани)
- Сходни артикули (`cross_refs`, линкове към техни `/part/[barcode]`)
- Всички коли където се влага (`applications` — марка, модел, model_raw)
- Бутон "Добави"

---

## 7. Бутон "Добави" (postMessage, без TM1 проверка в MVP)

Клиентски компонент. При клик праща точния формат от
`NEXT_CATALOGUE_POSTMESSAGE_BASKET.md`:

```js
window.parent.postMessage(
  JSON.stringify({
    addPartsToBasket: [
      { wholesalerArticleNumber: `${barcode} GBG`, quantity: String(qty) }
    ]
  }),
  targetOrigin // '*' локално за MVP; конкретния TM1 origin при реална вградка
);
```

UI показва оптимистично потвърждение (тост "Добавено") — документирано е, че
`addPartsToBasket` няма гарантиран обратен `postMessage` отговор, за разлика
от `addCustomPartsToBasket`/`addOePartsToBasket`. Реална проверка в TM1 iframe
е следваща фаза, след хостване на приложението отвън.

---

## 8. Език (bg/en)

`lid` query param: `32` = български (по подразбиране), `4` = английски.

- Управлява статичен dictionary за UI стрингове (бутони, етикети, филтри)
- Описание на артикула: `gr_descr` е **гръцки**, не български — затова и за
  BG, и за EN засега се показва `products.eng_descr` (единствената надеждна
  колона за описание на двата езика, докато се намери по-добър вариант)

Многоезични описания от `TECDOC_DATA` по `GenArtNo` — **бъдеща фаза**, изисква
допълнително проучване на схемата на `TECDOC_DATA` (не е направено в тази
сесия). Това е и потенциалният бъдещ източник на коректно българско описание.

---

## 9. Продажна цена — markup правило

Динамично изчислена, **записана** в `products.sale_price` (не само в UI):

```sql
sale_price = ROUND(cost_price * 1.98, 2)
```

**Еднократен backfill** (изпълнява се веднъж върху текущите данни):

```sql
UPDATE dbo.products
SET sale_price = ROUND(cost_price * 1.98, 2)
WHERE sale_price IS NULL;
```

**Промяна в `usp_sync_from_buffer`** (`dbo/StoredProcedures/usp_sync_from_buffer.sql`,
секция 2, `WHEN NOT MATCHED BY TARGET THEN INSERT`): новите артикули, влизащи
за първи път, получават `sale_price = ROUND(s.price*1.98,2)` директно при
вмъкване. `WHEN MATCHED THEN UPDATE` клонът **не се променя** — `sale_price`
продължава да се пази непокътнат при последващи sync-ове (вече така е по
дизайн, за да не презаписва бъдещи ръчни/ERP цени).

---

## 10. Грешки

- SQL грешка при заявка → Next.js error boundary (генерична грешка, лог в конзолата)
- Липсваща снимка → placeholder икона в `/img/[barcode]`
- Празни резултати от търсене/browse → съобщение "няма намерени артикули"

---

## 11. Тестване

- Ръчно в браузъра: dev server (`npm run dev`), проверка на търсене, browse
  йерархия, детайли, снимки, бутон "Добави" (console log на postMessage payload)
- Unit тест за функцията, изчисляваща `sale_price` (markup формулата)
- Unit тест за SQL заявкостроителя на търсенето (правилни WHERE клаузи при
  различни видове вход: баркод, OE номер, текст)

---

## 12. Бъдещи фази (извън тази spec)

| № | Тема |
|---|---|
| 1 | Реална вградка в TM1 (iframe registration, `targetOrigin` проверка) |
| 2 | TecDoc KType мач част↔кола (основен план, Фаза 7) |
| 3 | Многоезични описания от `TECDOC_DATA` по GenArt ID |
| 4 | Ляв панел с филтри по категория |
| 5 | Автентикация/идентификация на дистрибутора в модула |
