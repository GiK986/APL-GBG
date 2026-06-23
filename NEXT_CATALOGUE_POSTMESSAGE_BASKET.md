# Next Catalogue (TM1) — postMessage API за външни модули

Документирано на 2026-06-23 чрез директно наблюдение (postMessage listener + Network tab) върху
`tm1.carparts-cat.com` с вграден модул **UniCat** (`unicat.tech-co.bg`), при клик на бутон "Купи",
и допълнително чрез разглеждане на минифицирания JS бъндъл
(`scripts/bundles.*.min.js`, webpack chunk близо до началото на файла) за откриване на пълния
набор от поддържани команди.

## Контекст

Next Catalogue (TM1, разработка на TecAlliance/TecDoc екосистема) вгражда външни доставчически
модули (напр. UniCat) в cross-origin `<iframe>`. Тъй като iframe-ът е на различен домейн, не може
директно да достъпва DOM/JS на родителската страница — комуникацията минава през `window.postMessage`.

Има два различни механизма в системата:

| Модул  | Тип                                                            | Механизъм за добавяне в кошница                                           |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| UniCat | cross-origin iframe (`unicat.tech-co.bg`)                      | `postMessage` → парсва се от родителя                                     |
| EDS    | вграден native SPA модул (същия домейн `tm1.carparts-cat.com`) | директен SPA routing (`mp`/`ms` query params) + REST API, без postMessage |

Този документ покрива само **UniCat / postMessage** варианта.

## Структура на съобщението

Изпраща се от iframe-а (или може да се симулира от всякакъв скрипт с достъп до `window`,
вкл. конзолата на родителската страница — виж "Забележка по сигурността" по-долу):

```js
window.postMessage(
  JSON.stringify({
    addPartsToBasket: [
      { wholesalerArticleNumber: "<артикулен номер на доставчика>", quantity: "<количество като string>" }
    ]
  }),
  "<targetOrigin>" // на практика приема и "*"
);
```

### Реален прихванат пример (OSRAM батерия)

```json
{"addPartsToBasket":[{"wholesalerArticleNumber":"OS BATTERY START 400","quantity":"1"}]}
```

### Полета

| Поле                      | Тип    | Задължително | Описание                                                                  |
| ------------------------- | ------ | ------------ | ------------------------------------------------------------------------- |
| `addPartsToBasket`        | array  | да           | Списък с артикули за добавяне; може да съдържа повече от един обект       |
| `wholesalerArticleNumber` | string | да           | Артикулният номер **на доставчика** (не OEM номер, не вътрешен ID на TM1) |
| `quantity`                | string | да           | Количество, изпратено като текст (`"1"`, `"2"`...), не като number        |

Не се изпраща цена, описание, валута, токен или сесийна информация в самото съобщение —
тези данни се дотеглят от TM1 бекенда по `wholesalerArticleNumber` след получаване на съобщението.

## Какво прави родителят (Next Catalogue) след получаване на съобщението

Верига от REST извиквания към `TM.Next.*` API (наблюдавани в Network tab):

1. `POST /data/TM.Next.WorkTasks/WorkTask/CreateWorkTask` — създава "работна задача" (поръчка/процес), ако няма активна за момента
2. `POST /data/TM.Next.Basket/Parts/AddWholesalerPartList` — реално добавяне на артикула в кошницата по `wholesalerArticleNumber`
3. `POST /data/TM.Next.ErpConnect/orderoptions/ShowOptionsByWorktask`
4. `POST /data/TM.Next.WorkTasks/WorkTask/SaveSelectedWorkTaskInfo`
5. `POST /data/TM.Next.ErpConnect/erpconnect/GetBasketErpInfos` — дотегля цена/наличност от ERP
6. `POST /data/TM.Next.Basket/Basket/CalculateWorkTaskBasket` — преизчислява общата сума
7. `GET /data/TM.Next.Basket/Basket/ShowWorkTaskBasket?workTaskId=...` — връща обновената кошница (визуализира се горе вдясно)

## Забележка по сигурността (важно за бъдеща интеграция)

При тест родителската страница **не валидира строго `event.origin`** на входящото съобщение —
съобщение, изпратено директно от top-level конзолата (без UniCat iframe да участва), също се
прихваща и обработва нормално:

```js
// Изпратено директно от родителската страница, не от UniCat iframe — проработи:
window.postMessage(
  JSON.stringify({ addPartsToBasket: [{ wholesalerArticleNumber: "54152 JBM", quantity: "2" }] }),
  "*"
);
```

Резултат: кошницата се увеличи коректно (+12,04 € = 2 × 6,02 € цена за артикула), без UniCat да е
"видял" това съобщение.

**Практическо следствие за нашата интеграция:** когато имплементираме собствен модул/iframe,
вероятно ще можем да разчитаме само на този формат на съобщението (без допълнителен auth токен
вътре в payload-а), но трябва:

- да изпращаме точния `wholesalerArticleNumber`, какъвто е регистриран при доставчика в TM1 (не OEM номер)
- да имаме предвид, че `targetOrigin` на практика не се проверява стриктно от страна на родителя,
  но **ние** трябва да го задаваме коректно (конкретния origin на `tm1.carparts-cat.com`, не `"*"`)
  от наша страна, за да не изпускаме данни към грешен frame в production.

## Централен dispatcher (как Next слуша съобщенията)

В bundle-а (`scripts/bundles.*.min.js`) има **един** общ `message` listener, регистриран през
React `useEffect`:

```js
useEffect(() => (
  window.addEventListener("message", X),
  () => window.removeEventListener("message", X)
), [X]);

function X(e) {
  const t = tryParseJson(e.data);     // ако e.data е string – JSON.parse; иначе го ползва както е
  if (!t) return;
  const keys = Object.keys(t);
  const ENVELOPE_KEYS = ["source", "data", "type"];           // напр. Redux DevTools / други extensions
  if (keys.some(k => ENVELOPE_KEYS.includes(k))) return;       // игнорира чужд postMessage шум
  if (keys.filter(k => k !== "sourceId").length === 0) {
    console.warn("API Call: No Command found.");
  }
  handlers.forEach(handler => handler({ props: P, data: t, source: e.source }));
}
```

Ключови изводи:

- Това **не** е dispatch по едно поле `type`/`command` — вместо това всеки регистриран `handler`
  сам проверява дали неговия специфичен ключ (`addPartsToBasket`, `openPartsList`, ...) присъства
  в `data`, и излиза рано (`return`), ако не е неговият.
- `sourceId` е "служебно" поле, прикачено към почти всички команди (идентифицира кой външен модул
  пита/праща, напр. `"Neimcke"` в наблюдаваните примери) — не се брои като "команда" сама по себе си.
- Съобщения, чиито единствени ключове са `source`/`data`/`type` (типичен envelope формат на други
  browser extensions / devtools), се игнорират мълчаливо — затова при честа поява в `__capturedMessages`
  на подобни ключове, те не идват от Next Catalogue логиката, а от друг скрипт на страницата.
- Ако подадеш ключ, който никой handler не разпознава (и няма друг валиден ключ освен `sourceId`),
  в конзолата ще видиш `"API Call: No Command found."`.

## Отговор от Next Catalogue обратно към iframe-а (response pattern)

За част от командите (потвърдено за `addCustomPartsToBasket` и `addOePartsToBasket`,
**не** за обикновения `addPartsToBasket`) Next Catalogue изпраща обратно `postMessage`
към `e.source` (т.е. към изпращащия frame) след приключване на операцията:

```js
// success:
e.source.postMessage({ name: "addCustomPartsToBasket", success: true,  parts: g.customParts }, "*");
// error:
e.source.postMessage({ name: "addCustomPartsToBasket", success: false, parts: g.customParts }, "*");
```

Т.е. ако имплементираме команда от тип `addCustomPartsToBasket`/`addOePartsToBasket`, можем (и
би трябвало) да слушаме за съобщение с `{name: "<нашата команда>", success, ...}` обратно в нашия
модул, за да покажем потвърждение на потребителя. За чист `addPartsToBasket` (UniCat случая) **няма**
гаранция за обратен отговор — затова UniCat вероятно разчита само на видимата промяна в кошницата.

## Пълен списък откритите команди (ключове в data)

Извлечени чрез grep на `bundles.*.min.js` за дестрuktуриране от `data` обект във всеки handler.
Статус "потвърден" = видяна е реалната деструктуризация на полетата в кода; "частичен" = ключът е
видян, но не всички полета на payload-а са напълно изяснени.

| Команда (ключ в `data`)           | Категория      | Статус         | Payload поля (известни)                                                                                                                                                | Какво прави                                                                                                                                                                              |
| --------------------------------- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addPartsToBasket`                | Кошница        | потвърден      | `[{wholesalerArticleNumber, quantity}]`                                                                                                                                | Добавя артикул на доставчик в кошницата (виж секциите по-горе). Без отговор.                                                                                                             |
| `addOePartsToBasket`              | Кошница        | потвърден      | `[{oeNumber, manufacturerId, manufacturer, description?, information?, quantity?, price?, wholesalerArticleNumber?, vinNumber?}]`, `sourceId`, `vehicleIdentification` | Добавя OE артикул(и). `manufacturer`(име, текст) е **задължително**, иначе 400. Виж секция по-долу — отговорът е ненадежден (винаги `success:true`).                                     |
| `addCustomPartsToBasket`          | Кошница        | потвърден      | `[{articleNumber, description, purchasePrice, retailPrice, quantityValue, additionalDescription?, rebate?, surcharge?, memo?}]`, `sourceId`                            | Добавя "custom" (извън каталога) артикул. **Не подавай `vatRate`** — винаги дава 400; ДДС се прилага автоматично. Отговорът `{name, success, parts}` е коректен (success/fail различни). |
| `addCustomRepairTimesToBasket`    | Кошница / труд | потвърден      | `{division, provider, repairTimes:[...]}`                                                                                                                              | Добавя ремонтни нормо-часове в кошницата.                                                                                                                                                |
| `getArticlesBySupplierArticleNos` | Справка        | частичен       | (не изяснени напълно полета)                                                                                                                                           | Връща артикули по списък от номера на доставчик.                                                                                                                                         |
| `openPartsDetails`                | Навигация      | потвърден      | `{traderArticleNo}` ИЛИ `{supplierId, productGroupId, supplierArticleNo}`, `quantity?`                                                                                 | Отваря детайли на артикул (`openArticleDetails`). Препоръчан заместител на `openArticleByPartNumber`.                                                                                    |
| `openArticleByPartNumber`         | Навигация      | **deprecated** | същия формат като `openPartsDetails`                                                                                                                                   | ⚠️ Маркиран `deprecated` в кода — ползвай `openPartsDetails`.                                                                                                                          |
| `openPartsErpInfo`                | Навигация      | потвърден      | същия формат като `openPartsDetails`                                                                                                                                   | Като `openPartsDetails`, но отваря директно таб "stocks" (наличности).                                                                                                                   |
| `openPartsList`                   | Навигация      | потвърден      | `{query}` (тествано самостоятелно) или `{productGroupIds, supplierArticleNo, supplierIds}`                                                                             | Отваря списък с артикули. Подаден само `query` → general търсене, отворено като глобален модал `part-alternatives` (виж бележката по-долу).                                              |
| `openPromoPartsList`              | Навигация      | частичен       | `{telesalesCustomerNo}` + др.                                                                                                                                          | Отваря списък с промо/препоръчани артикули.                                                                                                                                              |
| `openOeAftermarket`               | Навигация      | потвърден      | `{oeNumber}` (единствено задължително), опц. `altOeNumber, manufacturerIds, manufacturerId, vinNumber, vehicleIdentification, quantity`                                | Търсене на aftermarket алтернативи по OE номер. Отваря същия глобален модал `part-alternatives` (виж бележката по-долу).                                                                 |
| `openOffersModule`                | Навигация      | потвърден      | булева/truthy флага                                                                                                                                                    | Навигира към `/<workTaskId>/offers`.                                                                                                                                                     |
| `openInternalModule`              | Навигация      | потвърден      | `{module, newWorkTask?, workTaskId?}`                                                                                                                                  | Навигира към друг вътрешен модул на TM1 (`/<id>/<module>` или `/r/<module>`).                                                                                                            |
| `openMemoInfo`                    | UI / модал     | потвърден      | truthy флага (използва се и `workTaskId` от `props`)                                                                                                                   | Отваря модал с бележка/мемо инфо.                                                                                                                                                        |
| `openMemoTechicalNotes`           | UI / модал     | частичен       | (не изяснени напълно полета)                                                                                                                                           | Вероятно отваря технически бележки (бел.: правописна грешка "Techical" е в самия код).                                                                                                   |
| `openRapidCalculationList`        | Навигация      | частичен       | (не изяснени напълно полета)                                                                                                                                           | Вероятно отваря списък за бърза калкулация на труд/части.                                                                                                                                |
| `openStartPage`                   | Навигация      | частичен       | (не изяснени напълно полета)                                                                                                                                           | Вероятно навигира към начален екран.                                                                                                                                                     |
| `openInSelectedWorkTask`          | Навигация      | частичен       | (не изяснени напълно полета)                                                                                                                                           | Вероятно отваря нещо в контекста на текущо избраната работна задача.                                                                                                                     |

### Бележка: route механизъм на `openPartsList` / `openOeAftermarket`

Потвърдено директно в кода, че тези две команди отварят резултата като **глобален модал** на TM1
(route име `part-alternatives`, с тире, ед.ч.), а не през вътрешния route на EDS модула
(`/parts/alternatives`, мн.ч., без тире — ползва се само при нативен клик на лупата вътре в EDS).

Механизмът: TM1 има generic "stack modal on top of current route" логика — взима целевия път,
заменя `/modal/` с `/modal^/`, и го праща в служебния query-параметър `(1)` на текущия URL (докато
премахва `mp`/`ms`, които са служебни само за EDS-овия micro-router):

```js
// псевдо-код от bundle-а:
const targetPath = renderRoute(matchedPath, params).replace("/modal/", "/modal^/");
params.set("(1)", `${targetPath}?${searchParams}`);
params.delete("mp");
params.delete("ms");
```

Затова при `openPartsList`/`openOeAftermarket` виждаме в адреса нещо като:

```text
...?(1)=/<workTaskId>/modal^/part-alternatives/list/alternatives?query=...
```

— независимо дали EDS модулът е бил отворен преди това или не, защото модалът се отваря на
глобалния (TM1) router слой, не в EDS-овия.

Допълнително, в друг (несвързан) webpack chunk беше открит **отделен** протокол за "Telematics"/
ремонтни-времена модул с ключове: `addArticle`, `addOEArticle`, `openOEArticleList`, `addRepairTime`,
`getRepairTimes`, `deleteRepairTime` — но той използва различен namespace (`"Telematics"`, `"WORKTASK"`)
и не е потвърдено, че минава през същия `window.addEventListener("message", ...)` dispatcher; нужна е
отделна проверка, ако ни потрябва.

## Детайли: `addCustomPartsToBasket`

Структурата на всеки елемент е намерена директно в кода на ръчната UI форма "Добави извънкаталожен
артикул" (handler-ът просто `spread`-ва входния обект като `customPart`, без преименуване):

```js
window.postMessage(JSON.stringify({
  addCustomPartsToBasket: [{
    articleNumber: "TEST-CUSTOM-001",   // задължително
    description: "Тестов custom артикул",
    purchasePrice: 5.5,                  // покупна цена
    retailPrice: 9.9,                    // продажна цена
    quantityValue: 1                     // количество
  }],
  sourceId: "ClaudeTest"
}), "*");
```

| Поле                    | Задължително   | Бележка                                                                                                                                                                      |
| ----------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `articleNumber`         | да             | custom артикулен номер (текст, по избор на подателя)                                                                                                                         |
| `description`           | препоръчано    | по подразбиране `""` ако липсва                                                                                                                                              |
| `additionalDescription` | не             |                                                                                                                                                                              |
| `purchasePrice`         | не             | покупна цена                                                                                                                                                                 |
| `retailPrice`           | не             | продажна цена — показва се директно в кошницата                                                                                                                              |
| `quantityValue`         | не             | количество, по подразбиране умножава `retailPrice`                                                                                                                           |
| `rebate` / `surcharge`  | не             | отстъпка/надценка %                                                                                                                                                          |
| `memo`                  | не             | бележка; backend-ът я допълва автоматично с контекст от работната задача дори ако не подадем нищо                                                                            |
| `vatRate`               | **НЕ ПОДАВАЙ** | ⚠️ Всеки опит (`20`, `0.2`, `"20"`) връща `400 Bad Request`: `{"vatRate":["Invalid data format."]}`. Изпуснат изцяло → backend сам прилага стандартната ставка на клиента. |

**Backend endpoint:** `POST /data/TM.Next.Basket/Parts/AddCustomPartList`
Body: `{workTaskId, customParts:[...], log:{...}, usePercentageValues:true}`

**Response postMessage (коректен, success/fail различни):**
```json
{"name":"addCustomPartsToBasket","success":true,"parts":[{...}]}
```

**Поведение при добавяне на втори custom артикул с различен `articleNumber`:** създава се **нов отделен
ред** в кошницата (без merge), с коректно изчислена `retailPrice × quantityValue` като крайна цена.

## Детайли: `addOePartsToBasket`

```js
window.postMessage(JSON.stringify({
  addOePartsToBasket: [{
    oeNumber: "04E115561AC",      // задължително
    manufacturerId: 106,           // задължително (числов ID)
    manufacturer: "Skoda",         // задължително (текстово име!) — без него сървъра дава 400
    description: "oil filter",
    quantity: 1,
    price: 12.5                    // опционално, показва се като "Обща цена на дребно" в кошницата
  }],
  sourceId: "ClaudeTest"
}), "*");
```

**Мапиране на полета** (postMessage вход → реален REST body към `AddOePartList`):

| Вход (`postMessage`)                          | Изход (REST body)                                                                                      | Бележка                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `oeNumber`                                    | `oeArticleNumber`                                                                                      | задължително                                                                                                                               |
| `manufacturerId`                              | `vehicleManufacturerId`                                                                                | задължително                                                                                                                               |
| `manufacturer`                                | `vehicleManufacturerName`                                                                              | **задължително** — пропускането му дава `400`: `{"oeParts[0].VehicleManufacturerName":["'Vehicle Manufacturer Name' must not be empty."]}` |
| `description`                                 | `description`                                                                                          |                                                                                                                                            |
| `information`                                 | `additionalDescription`                                                                                | опц.                                                                                                                                       |
| `quantity`                                    | `quantityValue`                                                                                        |                                                                                                                                            |
| `price` (само ако `> 0`)                      | `oePriceValue`                                                                                         | опц.                                                                                                                                       |
| `wholesalerArticleNumber`                     | `wholesalerArticleNumber`                                                                              | опц.                                                                                                                                       |
| —                                             | `currencyCode`                                                                                         | хардкоднато `"EUR"`                                                                                                                        |
| `vinNumber` (от **първия** елемент на масива) | използва се само за идентификация на превозното средство, не се праща директно като поле в `oeParts[]` |                                                                                                                                            |

**Backend endpoint:** `POST /data/TM.Next.Basket/Parts/AddOePartList`

**⚠️ Критичен бъг/quirk — `postMessage` отговорът е ненадежден за откриване на грешки:**
В кода извикването е `addOePartList(T).then(b, b)` — **една и съща** callback функция `b` се ползва
и за `resolve`, и за `reject` на промиса, и тя **винаги** праща:
```json
{"name":"addOePartsToBasket","success":true,"parts":[...]}
```
Потвърдено на живо: заявка без `manufacturer` реално се провали с `400` от сървъра (артикулът НЕ е
добавен), но `postMessage` отговорът въпреки това върна `"success":true`. **Никога не разчитай само
на този response за да установиш дали добавянето е минало** — нужен е собствен начин за проверка
(напр. следене на действителното съдържание на кошницата).

**Поведение при добавяне на вече съществуващ `oeNumber` в кошницата:** редовете се **merge-ват** по
`oeArticleNumber` + `workTaskId` — количествата се сумират, но ако първото добавяне е било без `price`,
обединеният ред остава **без показана крайна цена** дори ако второ добавяне е подадено с `price`.
Артикул с **нов** `oeNumber` създава отделен ред с коректно показана `price` като "Обща цена на дребно".

## Открито още (за справка)

- Cross-origin iframe на UniCat има `src`, който се блокира от Chrome extension логването, защото
  съдържа credentials в query string (`username`, `password`, `customerTV` и др.) — пример:
  `https://unicat.tech-co.bg/?customerTV=...&username=...&password=...&SID=...&SPRN=...&appid=23`
- `wholesalerArticleNumber` за тестваните артикули:
  - `OS BATTERY START 400` → OSRAM Външна батерия за стартиране 16800mAh
  - `54152 JBM` → JBM Нитрилни ръкавици L-5MIL, 100 броя
