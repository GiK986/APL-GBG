# -*- coding: utf-8 -*-
"""
DVSE NEXT export — генерира трите submission файла за TecDoc DSN 3323 (GBG).

Изходни файлове (записани в ROOT):
  TM_Article_Details_GBG.xlsx   — всички active продукти
  TM_Product_Groups_GBG.xlsx    — продуктите с валиден GenArt ID
  TM_References_GBG.xlsx        — Reference Type 2 (barcode) и Type 4 (OEM)

Бележка за Reference Brand (Type 4):
  Полето е оставено празно — попълни BRAND_MAP по-долу при нужда.
  Напр.: BRAND_MAP = {'MERCEDES': 15, 'VW': 16, 'BMW': 10}
"""

import csv
import pandas as pd
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent

SUPPLIER_ID = 3323
BRAND_MAP = {}   # brand_name -> TecDoc numeric brand ID


# ── Зареждане на данни ────────────────────────────────────────────────────────

def load_canonical():
    rows = []
    with open(ROOT / 'Pricelist_36078.txt', encoding='iso-8859-7') as f:
        for line in f:
            p = line.rstrip('\r\n').split(';')
            if len(p) < 11:
                continue
            bc = p[10].strip()
            if p[0].strip() != bc or not bc:
                continue
            rows.append({
                'barcode': bc,
                'descr': p[3].strip(),
                'side': p[4].strip(),
                'category': p[9].strip(),
                'brand': p[6].strip(),
            })
    return rows


def load_genart_map():
    ag = {}
    with open(HERE / '14_article_genart.csv', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f, delimiter=';'):
            k = (r['category'], r['descr_raw'].strip().upper(), r['side'].strip())
            ag[k] = r['genart_id'].strip()
    return ag


def load_cat_fallback():
    cm = {}
    with open(HERE / '10_category_genart_v3.csv', encoding='utf-8') as f:
        for r in csv.DictReader(f, delimiter=';'):
            if r.get('genart_id', '').strip():
                cm[r['category_raw']] = r['genart_id'].strip()
    return cm


def load_genuine_oem(canonical_set):
    oem = {}
    with open(ROOT / 'Genuine_36078.txt', encoding='iso-8859-1') as f:
        for line in f:
            p = line.rstrip('\r\n').split(';')
            if len(p) < 2:
                continue
            bc = p[0].strip()
            code = p[1].strip()
            if bc in canonical_set and code:
                oem.setdefault(bc, []).append(code)
    return oem


def art_num(bc):
    return f'{bc} GBG'


def write_xlsx(df, path, sheet_name):
    """Записва DataFrame в xlsx с хедър стил."""
    with pd.ExcelWriter(path, engine='xlsxwriter') as ew:
        df.to_excel(ew, sheet_name=sheet_name, index=False)
        wb = ew.book
        ws = ew.sheets[sheet_name]
        hdr = wb.add_format({
            'bold': True, 'font_name': 'Arial', 'font_size': 10,
            'font_color': '#FFFFFF', 'bg_color': '#1F4E79',
            'align': 'center', 'valign': 'vcenter', 'border': 1,
        })
        for col_idx, col_name in enumerate(df.columns):
            ws.write(0, col_idx, col_name, hdr)
        ws.freeze_panes(1, 0)
        ws.set_row(0, 20)


# ── Генериране на файловете ──────────────────────────────────────────────────

def main():
    print('Зарежда данни ...')
    canonical = load_canonical()
    print(f'  Canonical редове: {len(canonical):,}')

    ag_map = load_genart_map()
    cat_fb = load_cat_fallback()
    print(f'  GenArt map: {len(ag_map):,} ключа, category fallback: {len(cat_fb):,}')

    canonical_set = {r['barcode'] for r in canonical}
    oem_map = load_genuine_oem(canonical_set)
    print(f'  Genuine OEM barcodes: {len(oem_map):,}')
    print()

    # ── 1. Article Details ────────────────────────────────────────────────────
    print('TM_Article_Details_GBG.xlsx ...')
    ad = pd.DataFrame({
        'Supplier': SUPPLIER_ID,
        'Supplier Article Number': [art_num(r['barcode']) for r in canonical],
        'Trader Article Number':   [art_num(r['barcode']) for r in canonical],
        'Additional Description':  [r['descr'] for r in canonical],
        'Pole Position': 0,
        'Stock article': 0,
    })
    path_ad = ROOT / 'TM_Article_Details_GBG.xlsx'
    write_xlsx(ad, path_ad, 'Article Details')
    print(f'  -> {path_ad.name}  {len(ad):,} реда')

    # ── 2. Product Groups ─────────────────────────────────────────────────────
    print('TM_Product_Groups_GBG.xlsx ...')
    pg_rows = []
    unmapped = 0
    for r in canonical:
        k = (r['category'], r['descr'].upper(), r['side'])
        gid = ag_map.get(k) or cat_fb.get(r['category'], '')
        if gid:
            pg_rows.append([SUPPLIER_ID, art_num(r['barcode']), int(gid)])
        else:
            unmapped += 1

    pg = pd.DataFrame(pg_rows, columns=['Supplier', 'Supplier Article Number', 'TecDoc GenArt ID'])
    path_pg = ROOT / 'TM_Product_Groups_GBG.xlsx'
    write_xlsx(pg, path_pg, 'Product Groups')
    print(f'  -> {path_pg.name}  {len(pg):,} реда  ({unmapped} без GenArt пропуснати)')

    # ── 3. References ─────────────────────────────────────────────────────────
    print('TM_References_GBG.xlsx ...')
    ref_rows = []
    t2 = t4 = 0
    for r in canonical:
        art = art_num(r['barcode'])
        brand_id = BRAND_MAP.get(r['brand']) or None

        # Type 2 — barcode (utility number)
        ref_rows.append([SUPPLIER_ID, art, 2, None, r['barcode'], 0])
        t2 += 1

        # Type 4 — OEM кодове от Genuine файла
        for oem in oem_map.get(r['barcode'], []):
            ref_rows.append([SUPPLIER_ID, art, 4, brand_id, oem, 0])
            t4 += 1

    ref_cols = ['Supplier', 'Supplier Article Number', 'Reference Type',
                'Reference Brand', 'Reference Number', 'Show in Article List']
    ref = pd.DataFrame(ref_rows, columns=ref_cols)

    ref_types = pd.DataFrame([
        [2, 'Utility number (barcode)'],
        [4, 'OE number'],
    ], columns=['TecDoc ID', 'Description'])

    path_ref = ROOT / 'TM_References_GBG.xlsx'
    with pd.ExcelWriter(path_ref, engine='xlsxwriter') as ew:
        ref.to_excel(ew, sheet_name='References', index=False)
        ref_types.to_excel(ew, sheet_name='Reference Types', index=False)
        wb = ew.book
        hdr = wb.add_format({
            'bold': True, 'font_name': 'Arial', 'font_size': 10,
            'font_color': '#FFFFFF', 'bg_color': '#1F4E79',
            'align': 'center', 'valign': 'vcenter', 'border': 1,
        })
        for sheet_name, df in [('References', ref), ('Reference Types', ref_types)]:
            ws = ew.sheets[sheet_name]
            for col_idx, col_name in enumerate(df.columns):
                ws.write(0, col_idx, col_name, hdr)
            ws.freeze_panes(1, 0)
            ws.set_row(0, 20)

    print(f'  -> {path_ref.name}  {t2:,} Type-2  +  {t4:,} Type-4  =  {t2+t4:,} реда')
    print('\nГотово.')


if __name__ == '__main__':
    main()
