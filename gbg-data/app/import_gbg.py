#!/usr/bin/env python3
"""
GBG Body Parts — ZIP importer → MS SQL (GBG-BUFFER)

Flow:
  1. Find *.zip files directly in base_dir (configured in config.ini)
  2. Extract with 7z → base_dir/tmp/<stem>/
  3. Convert TXT (ISO-8859-7) → UTF-8 in memory
  4. TRUNCATE target table
  5. Bulk-insert via pyodbc fast_executemany (5 000 rows/batch)
  6. On success  → move ZIP to base_dir/done/
     On failure  → move ZIP to base_dir/failed/  + full rollback

Table mapping (matches deploy_all.sql):
  Pricelist_*.txt  → dbo.catalog
  Outofstock_*.txt → dbo.stock
  Genuine_*.txt    → dbo.oem_codes
  Refar_*.txt      → dbo.cross_ref

Cron (daily 03:00):
  0 3 * * * /usr/bin/python3 /mnt/gbg-data/app/import_gbg.py
"""

import re
import sys
import shutil
import logging
import subprocess
import configparser
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

try:
    import pyodbc
except ImportError:
    sys.exit("ERROR: pyodbc not installed — run: pip install pyodbc")

# ---------------------------------------------------------------------------
# Bootstrap paths from config
# ---------------------------------------------------------------------------
APP_DIR     = Path(__file__).resolve().parent
CONFIG_FILE = APP_DIR / "config.ini"


def _load_config() -> configparser.ConfigParser:
    cfg = configparser.ConfigParser()
    if not CONFIG_FILE.exists():
        sys.exit(f"ERROR: config.ini not found at {CONFIG_FILE}")
    cfg.read(CONFIG_FILE)
    return cfg


CFG         = _load_config()
BASE_DIR    = Path(CFG.get("paths", "base_dir", fallback=str(APP_DIR.parent)))
TMP_DIR     = BASE_DIR / "tmp"
DONE_DIR    = BASE_DIR / "done"
FAILED_DIR  = BASE_DIR / "failed"
LOG_DIR     = APP_DIR / "logs"
BATCH_SIZE  = CFG.getint("import", "batch_size", fallback=5000)
SRC_ENC     = CFG.get("import", "source_encoding", fallback="iso-8859-7")

# ---------------------------------------------------------------------------
# Logging  (monthly rotating file + stdout)
# ---------------------------------------------------------------------------
def _setup_logging() -> logging.Logger:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", "%Y-%m-%d %H:%M:%S")

    fh = RotatingFileHandler(
        LOG_DIR / f"import_{datetime.now():%Y-%m}.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=6,
    )
    fh.setFormatter(fmt)

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)

    logger = logging.getLogger("gbg")
    logger.setLevel(logging.INFO)
    logger.addHandler(fh)
    logger.addHandler(sh)
    return logger


log = _setup_logging()

# ---------------------------------------------------------------------------
# File-type definitions  →  table / column / parser
# ---------------------------------------------------------------------------
#
#  Pricelist field order (12 cols):
#   0 item_code | 1 genuine_code | 2 gr_descr | 3 eng_descr | 4 side
#   5 model_code | 6 brand | 7 model | 8 price | 9 category | 10 barcode | 11 weight
#
#  catalog column order (excl. IDENTITY id + DEFAULT imported_at):
#   item_code, genuine_code, barcode, gr_descr, eng_descr,
#   model_code, brand, model, category, side, price, weight

def _dec(v: str):
    """'5,46' → 5.46  |  empty / bad → None"""
    s = v.strip().replace(",", ".")
    try:
        return float(s) if s else None
    except ValueError:
        return None


def _bit(v: str):
    s = v.strip()
    return int(s) if s in ("0", "1") else None


def _s(v: str):
    return v.strip() or None


# Each parser receives (fields: list[str]) and returns a tuple
# matching the INSERT column list defined in FILE_TYPES below.

def _parse_pricelist(f):
    return (
        _s(f[0]),   # item_code
        _s(f[1]),   # genuine_code
        _s(f[10]),  # barcode       ← note: barcode is field 10 in file
        _s(f[2]),   # gr_descr
        _s(f[3]),   # eng_descr
        _s(f[5]),   # model_code
        _s(f[6]),   # brand
        _s(f[7]),   # model
        _s(f[9]),   # category
        _s(f[4]),   # side
        _dec(f[8]), # price
        _dec(f[11]),# weight
    )


def _parse_outofstock(f):
    return (
        _s(f[0]),   # item_code
        _s(f[1]),   # barcode
        _bit(f[2]), # ath
        _bit(f[3]), # the
    )


def _net_oem(code: str) -> str | None:
    """Strips all non-alphanumeric chars — matches the net_oem_code convention."""
    net = re.sub(r"[^A-Za-z0-9]", "", code)
    return net or None


def _parse_genuine(f) -> list[tuple] | None:
    """Returns a list of (product_code, oem_code, net_oem_code) tuples.

    Some Genuine rows carry two OEM codes joined by a comma
    (e.g. "7841J2,7841-J4").  We split them into separate rows so that
    oem_code never contains a comma and stays within the 50-char column limit.
    Deduplication across rows in the same file is handled in _import_txt via
    the 'dedup_cols' setting for this file type.
    """
    product_code = _s(f[0])
    oem_raw = f[1].strip()
    if not oem_raw:
        return None

    if "," not in oem_raw:
        # Single code — keep net_oem_code from file as-is
        return [(product_code, oem_raw, _s(f[2]))]

    # Multiple codes joined with comma → split into individual rows
    parts = [p.strip() for p in oem_raw.split(",") if p.strip()]
    return [(product_code, part, _net_oem(part)) for part in parts]


def _parse_refar(f):
    return (
        _s(f[0]),   # basic_code
        _s(f[1]),   # similar_code
    )


FILE_TYPES = {
    "pricelist": {
        "table":    "dbo.catalog",
        "columns":  "item_code, genuine_code, barcode, gr_descr, eng_descr, "
                    "model_code, brand, model, category, side, price, weight",
        "n_fields": 12,
        "parser":   _parse_pricelist,
    },
    "outofstock": {
        "table":    "dbo.stock",
        "columns":  "item_code, barcode, ath, the",
        "n_fields": 4,
        "parser":   _parse_outofstock,
    },
    "genuine": {
        "table":      "dbo.oem_codes",
        "columns":    "product_code, oem_code, net_oem_code",
        "n_fields":   3,
        "parser":     _parse_genuine,
        "dedup_cols": (0, 1),   # deduplicate on (product_code, oem_code)
    },
    "refar": {
        "table":    "dbo.cross_ref",
        "columns":  "basic_code, similar_code",
        "n_fields": 2,
        "parser":   _parse_refar,
    },
}

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
def _connect() -> pyodbc.Connection:
    db = CFG["database"]
    conn_str = (
        f"DRIVER={{{db['driver']}}};"
        f"SERVER={db['server']},{db.get('port', '1433')};"
        f"DATABASE={db['database']};"
        f"UID={db['username']};"
        f"PWD={db['password']};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str, autocommit=False)


def _bulk_insert(cursor, insert_sql: str, rows: list) -> None:
    cursor.fast_executemany = True
    cursor.executemany(insert_sql, rows)

# ---------------------------------------------------------------------------
# 7z extraction
# ---------------------------------------------------------------------------
def _extract(zip_path: Path, dest: Path) -> bool:
    dest.mkdir(parents=True, exist_ok=True)
    cmd = ["7z", "e", str(zip_path), f"-o{dest}", "-y"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        log.error("7z error:\n%s", r.stderr.strip())
        return False
    return True

# ---------------------------------------------------------------------------
# Detect file type from filename stem
# ---------------------------------------------------------------------------
def _file_type(path: Path) -> str | None:
    stem = path.stem.lower()
    for key in FILE_TYPES:
        if stem.startswith(key):
            return key
    return None

# ---------------------------------------------------------------------------
# Import one TXT file into SQL (TRUNCATE → bulk INSERT)
# ---------------------------------------------------------------------------
def _import_txt(txt_path: Path, ftype: str, cursor) -> int:
    cfg   = FILE_TYPES[ftype]
    table = cfg["table"]
    n_exp = cfg["n_fields"]
    parse = cfg["parser"]
    cols  = cfg["columns"]
    ph    = ", ".join(["?"] * len(cols.split(",")))
    sql   = f"INSERT INTO {table} ({cols}) VALUES ({ph})"

    log.info("TRUNCATE %s", table)
    cursor.execute(f"TRUNCATE TABLE {table}")

    dedup_cols = cfg.get("dedup_cols")   # tuple of col indices forming unique key, or None
    seen: set[tuple] = set()             # used only when dedup_cols is set

    total, skipped, deduped = 0, 0, 0
    batch: list[tuple] = []

    with open(txt_path, "r", encoding=SRC_ENC, errors="replace") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.rstrip("\r\n")
            if not line:
                continue

            fields = line.split(";")
            if len(fields) < n_exp:
                log.warning("Line %d skipped (%d fields, expected %d): %.120s",
                            lineno, len(fields), n_exp, line)
                skipped += 1
                continue

            try:
                result = parse(fields[:n_exp])
            except Exception as exc:
                log.warning("Line %d parse error — %s: %.120s", lineno, exc, line)
                skipped += 1
                continue

            if result is None:
                skipped += 1
                continue

            # Parser may return a single tuple or a list of tuples (e.g. comma-split OEM)
            rows = result if isinstance(result, list) else [result]

            for row in rows:
                if dedup_cols:
                    key = tuple(row[i] for i in dedup_cols)
                    if key in seen:
                        deduped += 1
                        continue
                    seen.add(key)
                batch.append(row)

            if len(batch) >= BATCH_SIZE:
                _bulk_insert(cursor, sql, batch)
                total += len(batch)
                batch.clear()

    if batch:
        _bulk_insert(cursor, sql, batch)
        total += len(batch)

    extra = f"  (deduplicated {deduped})" if deduped else ""
    log.info("Inserted %d rows into %s (skipped %d lines%s)", total, table, skipped, extra)
    return total

# ---------------------------------------------------------------------------
# Process one ZIP file
# ---------------------------------------------------------------------------
def _process_zip(zip_path: Path, conn: pyodbc.Connection) -> bool:
    extract_dir = TMP_DIR / zip_path.stem
    log.info("Extracting %s", zip_path.name)

    try:
        if not _extract(zip_path, extract_dir):
            return False

        txt_files = sorted(extract_dir.glob("*.[tT][xX][tT]"))
        if not txt_files:
            log.error("No TXT files found inside %s", zip_path.name)
            return False

        cursor = conn.cursor()
        for txt in txt_files:
            ftype = _file_type(txt)
            if ftype is None:
                log.warning("Unrecognised file %s — skipped", txt.name)
                continue
            log.info("Importing %s → %s", txt.name, FILE_TYPES[ftype]["table"])
            _import_txt(txt, ftype, cursor)

        conn.commit()
        cursor.close()
        return True

    except Exception as exc:
        conn.rollback()
        log.error("Error processing %s: %s", zip_path.name, exc, exc_info=True)
        return False

    finally:
        if extract_dir.exists():
            shutil.rmtree(extract_dir, ignore_errors=True)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    log.info("=" * 60)
    log.info("GBG import started  |  base_dir=%s", BASE_DIR)

    zip_files = sorted(BASE_DIR.glob("*.[zZ][iI][pP]"))
    if not zip_files:
        log.info("No ZIP files found in %s — nothing to do.", BASE_DIR)
        return

    log.info("Found %d ZIP(s): %s", len(zip_files), [z.name for z in zip_files])

    try:
        conn = _connect()
        log.info("Connected to %s / %s",
                 CFG["database"]["server"], CFG["database"]["database"])
    except pyodbc.Error as exc:
        log.error("Cannot connect to SQL Server: %s", exc)
        sys.exit(1)

    ok, fail = 0, 0
    DONE_DIR.mkdir(parents=True, exist_ok=True)
    FAILED_DIR.mkdir(parents=True, exist_ok=True)

    for zip_path in zip_files:
        log.info("--- %s ---", zip_path.name)
        if _process_zip(zip_path, conn):
            shutil.move(str(zip_path), DONE_DIR / zip_path.name)
            log.info("OK  → done/%s", zip_path.name)
            ok += 1
        else:
            shutil.move(str(zip_path), FAILED_DIR / zip_path.name)
            log.warning("FAIL → failed/%s", zip_path.name)
            fail += 1

    conn.close()
    log.info("Finished — success: %d  failed: %d", ok, fail)
    log.info("=" * 60)


if __name__ == "__main__":
    main()
