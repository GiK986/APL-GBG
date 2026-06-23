# -*- coding: utf-8 -*-
"""
GenArt мапинг на ниво артикул върху нормализираните описания.

Логика:
  1. За категориите в TARGET (SKIP, REVIEW и смесените) се прилагат правила
     върху колоните base_type / carrier / purpose / position / features.
     Първото съвпаднало правило печели.
  2. За всички останали категории важи категорийният мапинг от
     10_category_genart_v3.csv (той е проверен по описания и е надежден).
  3. Без правило и без категориен мапинг -> празно (за преглед).

Вход:  13_descr_norm_all.csv, 10_category_genart_v3.csv, 08_genart_list.csv
Изход: 14_article_genart.csv + статистика на stdout
"""
import csv
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent

# Категориите-цели и правилата се четат от конфиг файлове (редактирай ТЯХ):
#   genart_target_categories.csv - категории под артикулни правила
#   genart_rules.csv             - правила (редът = приоритет, първото печели)
NOGENART = 'NOGENART'

def load_target():
    out = set()
    for line in open(HERE / 'genart_target_categories.csv', encoding='utf-8-sig'):
        line = line.strip()
        if line and not line.startswith('#'):
            out.add(line)
    return out


def load_rules():
    rules = []
    with open(HERE / 'genart_rules.csv', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f, delimiter=';'):
            conds = {fld: r[fld].strip()
                     for fld in ('base_type', 'carrier', 'purpose',
                                 'position', 'features')
                     if r.get(fld, '').strip()}
            if not conds:
                raise ValueError(f"Правило без условия: {r['rule_id']}")
            gid = r['genart_id'].strip() or NOGENART
            rules.append((r['rule_id'], conds, gid))
    return rules


TARGET = load_target()
RULES = load_rules()



def has(field_val, token):
    if '&' in token:
        return all(has(field_val, t) for t in token.split('&'))
    segments = field_val.split('+')           # многословни глави: 'HEAD LAMP'
    words = field_val.replace('+', ' ').split()
    return token in segments or token in words


def apply_rules(row):
    for rid, conds, gid in RULES:
        ok = True
        for field, token in conds.items():
            neg = token.startswith('!')
            t = token[1:] if neg else token
            present = has(row[field], t) if t not in (row[field],) else True
            present = present or t == row[field]
            if neg == present:
                ok = False
                break
        if ok:
            return rid, gid
    return None, None


def main():
    genart = {}
    with open(HERE / '08_genart_list.csv', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f, delimiter=';'):
            if r.get('Delete', '0') == '1':
                continue          # пропускаме изтрити GenArt
            genart[r['GenArtNo']] = r['genart_en']

    # проверка: всички GenArt от правилата съществуват
    bad = [g for _, _, g in RULES if g != NOGENART and g not in genart]
    assert not bad, f'Невалидни GenArt в правилата: {bad}'

    # map_genart_manual.csv: (category, descr_raw) -> genart_id (най-висок приоритет)
    manual_map = {}
    _manual = HERE / 'map_genart_manual.csv'
    if _manual.exists():
        with open(_manual, encoding='utf-8-sig') as f:
            for r in csv.DictReader(f, delimiter=';'):
                key = (r['category'].strip(), r['descr_raw'].strip().upper())
                gid = r['genart_id'].strip()
                if key[0] and key[1] and gid:
                    manual_map[key] = gid

    cat_map = {}
    with open(HERE / '10_category_genart_v3.csv', encoding='utf-8') as f:
        for r in csv.DictReader(f, delimiter=';'):
            cat_map[r['category_raw']] = (r['genart_id'], r['confidence'])

    rows_out = []
    stats = Counter()
    rule_hits = Counter()
    with open(HERE / '13_descr_norm_all.csv', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f, delimiter=';'):
            n = int(r['parts'])
            cat = r['category']
            cat_gid, cat_conf = cat_map.get(cat, ('', 'MISSING'))
            rid, gid = (None, None)
            # Приоритет 1: ръчен мапинг по (category, descr_raw)
            manual_key = (cat, r['descr_raw'].strip().upper())
            if manual_key in manual_map:
                rid, gid = 'MANUAL', manual_map[manual_key]
            elif cat in TARGET:
                rid, gid = apply_rules(r)
            if rid:
                source = f'rule:{rid}'
                final = '' if gid == NOGENART else gid
                rule_hits[rid] += n
                if cat_conf in ('SKIP', 'REVIEW', 'MISSING') or not cat_gid:
                    stats['спасени от SKIP/REVIEW' if final else 'правило: няма GenArt'] += n
                elif final and final != cat_gid:
                    stats['коригирани спрямо категорията'] += n
                elif final:
                    stats['потвърдени от правило'] += n
            else:
                source = 'category'
                final = cat_gid
                if cat in TARGET and not final:
                    stats['TARGET без правило и без категория'] += n
            stats['общо части'] += n
            if final:
                stats['мапнати'] += n
            rows_out.append({
                'category': cat, 'parts': n, 'side': r['side'],
                'descr_raw': r['descr_raw'], 'descr_norm': r['descr_norm'],
                'genart_id': final,
                'genart_en': genart.get(final, ''),
                'source': source,
            })

    # diff срещу предишния файл: какво ще се промени, ПРЕДИ да заредиш в базата
    out_path = HERE / '14_article_genart.csv'
    if out_path.exists():
        old = {}
        with open(out_path, encoding='utf-8-sig') as f:
            for r in csv.DictReader(f, delimiter=';'):
                old[(r['category'], r['descr_raw'], r['side'])] = r['genart_id']
        changed = Counter()
        added = 0
        for r in rows_out:
            k = (r['category'], r['descr_raw'], r['side'])
            if k not in old:
                added += r['parts']
            elif old[k] != r['genart_id']:
                changed[(r['category'][:35], old[k] or 'БЕЗ',
                         r['genart_id'] or 'БЕЗ', r['source'])] += r['parts']
        if changed or added:
            print(f"\nDIFF спрямо предишния 14-файл: "
                  f"{sum(changed.values())} части сменят GenArt, {added} нови")
            for (cat, o, nw, srcc), cnt in changed.most_common(15):
                print(f"  {cnt:5d}  {cat}: {o} -> {nw}  [{srcc}]")
        else:
            print("\nDIFF: няма промени спрямо предишния 14-файл")

    with open(out_path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()), delimiter=';')
        w.writeheader()
        w.writerows(rows_out)

    tot = stats['общо части']
    print(f"Записани {len(rows_out)} реда -> 14_article_genart.csv\n")
    for k in ('общо части', 'мапнати', 'спасени от SKIP/REVIEW',
              'коригирани спрямо категорията', 'потвърдени от правило',
              'правило: няма GenArt', 'TARGET без правило и без категория'):
        if stats.get(k):
            pct = f" ({stats[k] / tot:.1%})" if k != 'общо части' else ''
            print(f"  {k}: {stats[k]}{pct}")
    print("\nТоп 20 правила по брой части:")
    for ridd, n in rule_hits.most_common(20):
        print(f"  {n:5d}  {ridd}")


if __name__ == '__main__':
    main()
