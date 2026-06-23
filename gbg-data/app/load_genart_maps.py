#!/usr/bin/env python3
"""
GBG Body Parts — зареждане на GenArt мапинг таблиците в GBG-BODYPARTS.

Източници (gbg-genart/ в проектната папка, подават се като аргументи):
  14_article_genart.csv      -> dbo.map_genart_article  (TRUNCATE + bulk insert)
  10_category_genart_v3.csv  -> dbo.map_category_genart (TRUNCATE + bulk insert)

dbo.map_genart_manual НЕ се пипа от този скрипт.

Употреба:
  python3 load_genart_maps.py gbg-genart/14_article_genart.csv gbg-genart/10_category_genart_v3.csv

Връзката се чете от config.ini (секция [database]), database се заменя
с GBG-BODYPARTS. Изпълнява се при промяна на правилата или след седмичния
пасинг върху genart_unmapped. Двете таблици се заливат в една транзакция.
"""

import csv
import sys
import configparser
from pathlib import Path

try:
    import pyodbc
except ImportError:
    sys.exit("ERROR: pyodbc not installed — run: pip install pyodbc")

APP_DIR = Path(__file__).resolve().parent
CONFIG_FILE = APP_DIR / "config.ini"
TARGET_DB = "GBG-BODYPARTS"
BATCH = 5000


def connect():
    cfg = configparser.ConfigParser()
    if not CONFIG_FILE.exists():
        sys.exit(f"ERROR: config.ini not found at {CONFIG_FILE}")
    cfg.read(CONFIG_FILE)
    d = cfg["database"]
    conn_str = (
        f"DRIVER={{{d['driver']}}};"
        f"SERVER={d['server']},{d.get('port', '1433')};"
        f"DATABASE={TARGET_DB};"
        f"UID={d['username']};PWD={d['password']};"
        "TrustServerCertificate=yes;"
    )
    cn = pyodbc.connect(conn_str, autocommit=False)
    cn.cursor().fast_executemany = True
    return cn


def load_article(cur, path):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            rows.append((
                r["category"][:100],
                r["descr_raw"][:200],
                (r["side"] or "")[:2],
                int(r["genart_id"]) if r["genart_id"] else None,
                r["source"][:40],
            ))
    # PK защита: SQL Server е case-insensitive (CI колация), затова
    # дедупликацията тук е по UPPER ключ. При конфликт на genart_id
    # между регистрови близнаци -> предупреждение, печели първият.
    seen = {}
    uniq = []
    conflicts = 0
    for row in rows:
        k = (row[0].upper(), row[1].upper(), row[2].upper())
        if k not in seen:
            seen[k] = row
            uniq.append(row)
        elif seen[k][3] != row[3]:
            conflicts += 1
            print(f"WARN: genart конфликт при {k}: "
                  f"{seen[k][3]} (запазен) срещу {row[3]} (пропуснат)")
    cur.execute("TRUNCATE TABLE dbo.map_genart_article;")
    cur.fast_executemany = True
    sql = ("INSERT INTO dbo.map_genart_article "
           "(category_raw, eng_descr, side, genart_id, [source]) "
           "VALUES (?, ?, ?, ?, ?)")
    for i in range(0, len(uniq), BATCH):
        cur.executemany(sql, uniq[i:i + BATCH])
    return len(uniq), len(rows) - len(uniq)


def load_category(cur, path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter=";"):
            note = f"[{r['confidence']}] {r['note']}".strip()[:200]
            rows.append((
                r["category_raw"][:100],
                int(r["genart_id"]) if r["genart_id"] else None,
                note,
            ))
    cur.execute("TRUNCATE TABLE dbo.map_category_genart;")
    cur.fast_executemany = True
    sql = ("INSERT INTO dbo.map_category_genart (category_raw, genart_id, note) "
           "VALUES (?, ?, ?)")
    cur.executemany(sql, rows)
    return len(rows)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    art_csv, cat_csv = Path(sys.argv[1]), Path(sys.argv[2])
    for p in (art_csv, cat_csv):
        if not p.exists():
            sys.exit(f"ERROR: {p} not found")

    cn = connect()
    cur = cn.cursor()
    try:
        n_art, dups = load_article(cur, art_csv)
        n_cat = load_category(cur, cat_csv)
        cn.commit()
        print(f"OK: map_genart_article={n_art} реда"
              + (f" ({dups} дубликата пропуснати)" if dups else ""))
        print(f"OK: map_category_genart={n_cat} реда")
        print("Следваща стъпка: EXEC dbo.usp_sync_from_buffer; за презапис на products.genart_id")
    except Exception:
        cn.rollback()
        raise
    finally:
        cn.close()


if __name__ == "__main__":
    main()
