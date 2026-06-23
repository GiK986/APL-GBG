# GBG-BODYPARTS Catalog

Проект: GK-bodyparts (едрогабаритни авточасти). Доставчик Georgakopoulos (код 36078).
Продукционна база: `GBG-BODYPARTS` (MS SQL). Цел: захранване на DVSE NEXT (TecDoc DSN 3323)
и собствен уеб каталог.

**За пълна картина на базата (схема, обеми, GenArt пайплайн, кой път е активен за
NEXT експорта) виж [DB_STATE_AND_GENART_PIPELINE.md](DB_STATE_AND_GENART_PIPELINE.md)
преди да пипаш базата или `gbg-genart/`.**

Други документи:
- `GBG-BODYPARTS_PLAN.md` — оригинален план/архитектура
- `EDI_STRUCTURE_REFERENCE.md` — структура на изворните файлове от доставчика
- `HANDOFF_CLAUDE_CODE.md` — стъпки за първоначален деплой (връзката към сървъра вътре е остаряла, виж DB_STATE файла за текущия контекст)
- `gbg-genart/GENART_MAINTENANCE.md` — поддръжка на GenArt мапинга, дърво на решенията

`extracts/` съдържа временни резултати — не е устойчив източник на истина.
