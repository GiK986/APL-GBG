# -*- coding: utf-8 -*-
"""
Нормализация на eng_descr от Pricelist_36078.txt.
Разглобява описанието на типизирани колони + канонично описание (descr_norm).
Употреба:
    python3 normalize_descr.py "AIRDUCT" "DOOR MIRROR" ...   # изброени категории
    python3 normalize_descr.py --top 30                      # топ N по брой части
Изход: CSV (;) + отчет за неразпознати токени на stdout.
"""
import csv, re, sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).parent
PRICELIST = HERE.parent / 'Pricelist_36078.txt'

# ---------- речници ----------
TYPOS = {
    'AIRCUCT': 'AIRDUCT', 'NTERCOOLER': 'INTERCOOLER', 'OUTTER': 'OUTER',
    'FRONF': 'FRONT', 'PRESURE': 'PRESSURE', 'WIPPER': 'WIPER',
    'BUMBER': 'BUMPER', 'ABSORVER': 'ABSORBER', 'BRUCKET': 'BRACKET',
    'PALSTIC': 'PLASTIC', 'EGINE': 'ENGINE', 'ROCCKER': 'ROCKER',
    'HANLDE': 'HANDLE', 'HADLE': 'HANDLE', 'MIROR': 'MIRROR',
    'ELECTRICAL': 'ELECTRIC', 'FOLDING': 'FOLDABLE', 'FOLD': 'FOLDABLE',
    'W/OUT': 'W/O', 'WOUT': 'W/O', 'OPENNER': 'OPENER', 'ELECTR': 'ELECTRIC',
    'ELECT': 'ELECTRIC', 'MOULDINGS': 'MOULDING', 'RADIATIATOR': 'RADIATOR',
    'FUN': 'FAN', 'FR': 'FRONT', 'FRONTBUMBER': 'FRONT BUMPER',
    'FOLTABLE': 'FOLDABLE', 'DAYLIGHT': 'DRL', 'BRACKETS': 'BRACKET',
    'BULBS': 'BULB', 'SNOWCHAINSS': 'SNOWCHAINS',
}
MULTIWORD = [
    ('A QUALITY', 'QUAL:A'), ('B QUALITY', 'QUAL:B'), ('AFTER MARKET', 'QUAL:AM'),
    ('HEAD LAMP', 'HEADLAMP'), ('TAIL LAMP', 'TAILLAMP'), ('CORNER LAMP', 'CORNERLAMP'),
    ('THIRD BRAKE LAMP', 'THIRDSTOPLAMP'), ('THIRD BREAK LAMP', 'THIRDSTOPLAMP'),
    ('DAYTIME RUNNING LIGHT', 'DRL'), ('DAYTIME RUNNING LAMP', 'DRL'),
    ('DAY LIGHT', 'DRL'), ('DAYTIME LAMP', 'DRL'),
    ('TOW HOOK', 'TOWHOOK'), ('GAS SPRING', 'GASSPRING'),
    ('WINDOW REGULATOR', 'WINDOWREGULATOR'), ('WHEEL ARCH', 'WHEELARCH'),
    ('LICENCE PLATE', 'LICENCEPLATE'), ('LICENSE PLATE', 'LICENCEPLATE'),
    ('CUTTING MARKS', 'CUTMARKS'), ('HOOD LATCH', 'HOODLATCH'),
    ('ROCKER PANEL', 'ROCKERPANEL'), ('SOUND INSULATION', 'INSULATION'),
    ('DOOR CHECK', 'DOORCHECK'), ('SPLASH GUARD', 'SPLASHGUARD'),
    ('SPLASH PANEL', 'SPLASHGUARD'), ('SUN VISOR', 'SUNVISOR'),
    ('SNOW CHAINS', 'SNOWCHAINS'), ('BULB HOLDER', 'BULBHOLDER'),
    ('WHEEL HOUSE', 'WHEELARCH'), ('TIRE PRESURE', 'TPMS'),
    ('TIRE PRESSURE', 'TPMS'), ('HEAD/SIGNAL', 'COLUMNSWITCH'),
    ('CROSS MEMBER', 'CROSSMEMBER'), ('SNOW CHAIN', 'SNOWCHAINS'),
    ('MUD FLAP', 'MUDFLAP'), ('COOLING FAN', 'COOLINGFAN'),
    ('BRAKE DISC', 'PUR:BRAKE'), ('FILLER NECK', 'FILLERNECK'),
    ('HEATER RADIATOR', 'HEATERRADIATOR'),
    ('AIR DUCT', 'AIRDUCT'), ('AIR GUIDE', 'AIRGUIDE'), ('AIR INTAKE', 'AIRINTAKE'),
    ('BLIND SPOT', 'BLIS'), ('S.W .', 'S.W.'), ('S. W.', 'S.W.'),
    ('TAIL GATE', 'TAILGATE'), ('AMG LINE', 'AMG-LINE'), ('S LINE', 'S-LINE'),
    ('M SPORT', 'M-SPORT'), ('R LINE', 'R-LINE'), ('F SPORT', 'F-SPORT'),
    ('5TH DOOR', 'TAILGATE'), ('KEY HOLE', 'KEYHOLE'), ('FOG LAMP', 'FOG-LAMP'),
    ('SIDE LAMP', 'SIDELAMP'), ('FOOT LAMP', 'FOOTLAMP'), ('GRAB HANDLE', 'HANDLE GRAB'),
    ('FRONT PART', 'SEG:FRONT-PART'), ('REAR PART', 'SEG:REAR-PART'),
    ('FENDER PART', 'SEG:FENDER-PART'), ('UPPER PART', 'SEG:UPPER-PART'),
    ('LOWER PART', 'SEG:LOWER-PART'), ('FOR THE BRAKE', 'PUR:BRAKE'),
    ('FOR RADIATOR', 'PUR:RADIATOR'), ('OIL COOLING', 'PUR:OIL'),
    ('AIR FILTER BOX', 'PUR:AIRFILTER'), ('NIGHT VISION', 'NIGHTVISION'),
]
BASE = ['AIRDUCT', 'AIRGUIDE', 'AIRINTAKE', 'SHUTTER', 'GRILLE', 'GRILLES',
        'MIRROR', 'HANDLE', 'GLASS', 'COVER', 'CAP', 'BRACKET', 'FRAME', 'BASE',
        'MOULDING', 'NET', 'NETS', 'VENT', 'SHROUD', 'ARM', 'SWITCH', 'ANTENNA',
        'LAMP', 'SPOILER', 'BODY', 'HEADLAMP', 'TAILLAMP', 'CORNERLAMP',
        'THIRDSTOPLAMP', 'DRL', 'GASSPRING', 'WINDOWREGULATOR', 'WHEELARCH',
        'FLARE', 'REFLECTOR', 'SUPPORT', 'REINFORCEMENT', 'LIP', 'ABSORBER',
        'STAY', 'INSULATION', 'LENS', 'RIM', 'HINGE', 'EMBLEM', 'TRIM',
        'STRIP', 'CROSSMEMBER', 'TANK', 'VALVE', 'PIPE', 'STEP', 'HOLDER',
        'LID', 'PILLAR', 'DOORCHECK', 'SPLASHGUARD', 'MUDFLAP', 'COOLINGFAN',
        'FILLERNECK', 'HEATERRADIATOR', 'BLADE', 'INSULATOR', 'FLAP', 'NECK',
        'MOUNT', 'ACTUATOR', 'GUIDE', 'ROLLER', 'SUNVISOR', 'SNOWCHAINS',
        'BULBHOLDER', 'AXLE', 'CYLINDER', 'FLOOR', 'STIFFENER']
BASE_CANON = {'GRILLES': 'GRILLE', 'NETS': 'NET', 'AIRGUIDE': 'AIR GUIDE',
              'AIRINTAKE': 'AIR INTAKE', 'HEADLAMP': 'HEAD LAMP',
              'TAILLAMP': 'TAIL LAMP', 'CORNERLAMP': 'CORNER LAMP',
              'THIRDSTOPLAMP': 'THIRD BRAKE LAMP', 'GASSPRING': 'GAS SPRING',
              'WINDOWREGULATOR': 'WINDOW REGULATOR', 'WHEELARCH': 'WHEEL ARCH',
              'DOORCHECK': 'DOOR CHECK', 'SPLASHGUARD': 'SPLASH GUARD',
              'MUDFLAP': 'MUD FLAP', 'COOLINGFAN': 'COOLING FAN',
              'FILLERNECK': 'FILLER NECK', 'HEATERRADIATOR': 'HEATER RADIATOR',
              'SUNVISOR': 'SUN VISOR', 'SNOWCHAINS': 'SNOW CHAINS',
              'BULBHOLDER': 'BULB HOLDER'}
CARRIER = ['BUMPER', 'FENDER', 'HOOD', 'PANEL', 'DOOR', 'TAILGATE', 'TRUNK',
           'ROOF', 'GATE', 'WING', 'CAB', 'TOWHOOK', 'SILL', 'WHEEL',
           'LICENCEPLATE', 'MIRROR', 'ROCKERPANEL', 'APRON', 'WINDSCREEN',
           'WIPER', 'UNDERBODY', 'TIRE', 'STEERING']
PURPOSE = ['RADIATOR', 'INTERCOOLER', 'BRAKE', 'ENGINE', 'OIL', 'AIRFILTER',
           'WASHER', 'EXHAUST', 'A/C', 'REVERSE', 'FOG', 'GEARBOX',
           'ALTERNATOR', 'DYNAMO', 'CONDENSER', 'HEATER', 'FUEL']
POSITION = ['FRONT', 'REAR', 'INNER', 'OUTER', 'UPPER', 'LOWER', 'MIDDLE',
            'SIDE', 'CENTER', 'CENTRAL', 'VERTICAL', 'LEFT', 'RIGHT', 'TAIL',
            'CORNER', 'UNDER', 'TOP', 'END']
BODY = ['2D', '3D', '4D', '5D', '2/3D', '3/5D', '4/5D', '4D/S.W.', '5D/S.W.',
        'S.W.', 'S.W', 'SW', 'SDN', 'SEDAN', 'CABRIO', 'COUPE', 'H/B',
        'HATCHBACK', 'PICKUP', 'VAN', 'LONG', 'SHORT', 'SPORTBACK',
        'COMPACT', 'SLIDING']
MATERIAL = ['PLASTIC', 'STEEL', 'ALUMINIUM', 'ALUMINUM', 'CARBON', 'ALU',
            'COTTON', 'FELT', 'TEXTILE']
ENGINE_WORDS = ['CRDI', 'DCI', 'TFSI', 'HDI', 'TD', 'CDI', 'TSI', 'JTD',
                'CDTI', 'D4D', 'VVTI', 'DTI', 'TDDI', 'SDI', 'MULTIJET',
                'CRDI/DIESEL', 'DI']
FINISH = ['CHROME', 'PRIMED', 'BLACK', 'WHITE', 'GRAY', 'GREY', 'SILVER',
          'SMOKE', 'GLOSS', 'MAT', 'MATT', 'MAT-BLACK', 'PAINTED', 'BRONZE',
          'CLEAR', 'YELLOW', 'BLUE', 'RED', 'TEXTURED', 'CARBON-LOOK', 'DARK',
          'POLISHED', 'BEIGE']
FEATURES = ['ELECTRIC', 'HEATED', 'MANUAL', 'FOLDABLE', 'MEMORY', 'MOTOR',
            'ACTIVE', 'LED', 'CAMERA', 'BLIS', 'NIGHTVISION', 'SENSOR',
            'AUTOMATIC', 'CONVEX', 'ASPHERICAL', 'BLUE-TINTED', 'DIMMING',
            'PUDDLE', 'DEFOGGER', 'FLAT', 'PDC', 'PDS', 'ACC', 'KEYHOLE',
            'CABLE', 'SIDELAMP', 'FOOTLAMP', 'FOG-LAMP', 'KEY', 'KEYS',
            'LIGHT', 'GRAB', 'BLADES', 'SHUTTER-CTRL', 'DRL', 'REGULATOR',
            'LOCK', 'ASSIST', 'POSITION', 'ROUND', 'WINDOW', 'SEAT',
            'XENON', 'BI-XENON', 'HALOGEN', 'CUTMARKS', 'COMFORT', 'LATCH',
            'HOODLATCH', 'AT', 'MT', 'A/T', 'M/T', '+AC', '-AC', '+/-AC',
            'BRAZED', 'MECHANICAL', 'SONAR', 'ADDITIONAL', 'TUBE', 'TUBES',
            'DIAGONAL', 'AC', 'AUTO', 'FAN', 'S.LAMP', 'F.LAMP', 'AFS',
            'SQUARE', 'TWIN', 'PROJECTOR', 'FIXED', 'PLUG', 'PLUGS', 'SPRAY',
            'NOZZLE', 'MANUAL/AUTOMATIC+/-AC', 'MANUAL/AUTOMATIC+/-',
            'MANUAL/AUTOMATIC+', 'MANUAL/AUTOMATIC', '+/-A/C', '+/-AC', '+/-',
            'AUXILIARY', 'REPAIR', 'DYNAMIC', 'INSTALLATION', 'PARKING',
            'SKIN', 'CONTROL', 'TPMS', 'ALARM', 'DRUM', '+A/C', '-A/C',
            'COLUMNSWITCH', 'SIGNAL', 'BULB', 'MOTOR+FAN', 'MATRIX']
PACKAGING = ['SET', 'KIT', 'PAIR', 'PCS', 'PC', 'ASSY', 'COMPLETE']
MAKER = ['DEPO', 'TYC', 'VALEO', 'MARELLI', 'HELLA', 'ULO', 'NRF', 'KOYO',
         'NISSENS', 'ALGO', 'ROLCAR', 'VISTEON', 'MAHLE', 'BEHR', 'DENSO',
         'EAGLE', 'EYES', 'AL', 'ZKW', 'AUTOMOTIVE', 'LIGHTING', 'CZECH',
         'KOREAN', 'TAIWAN', 'CHINA', 'TURKEY', 'THAILAND']
VARIANT = ['M-SPORT', 'M-TECH', 'M-PACK', 'M-AERODYNAMIC', 'AMG', 'AMG-LINE',
           'S-LINE', 'R-LINE', 'F-SPORT', 'JCW', 'GT4', 'GTI', 'GT',
           'RS4', 'RS', 'WRX', 'ABARTH', 'TURBO', 'DIESEL', 'PETROL', 'HYBRID',
           'SPORT', 'SPORT-LINE', 'LUXURY-LINE', 'SHADOW', 'LUXURY', 'BASIS',
           'CO2', 'TDI', 'TDCI', 'ECOBOOST', 'QUATERN', 'DOUBLE', 'SUPERCHARGED',
           'R-DYNAMIC', 'X', 'OUTBACK', 'S/JCW', 'M/M-SPORT', 'AERO', 'PKG',
           'M3', 'M', 'JAPAN', 'EUROPE', 'USA', 'AVANTGARDE', 'ELEGANCE',
           'CLASSIC', 'F', 'SINGLE', 'ST-LINE', 'GLOSSY', 'EXCLUSIVE', 'PURE',
           '4WD', '2WD', 'STEPWAY', 'PETROL-DIESEL', 'PETROL-',
           'MANUAL-AUTOMATIC', 'GT/F07', 'GT-LINE', 'X-LINE', 'S-LINE/SQ7',
           'C63', 'TRAILHAWK', 'OFFROAD', 'URBAN', 'EXCELLENCE', 'F45',
           'MULTIVAN', 'LEXUS', 'PREMIUM']
NOISE = ['FOR', 'THE', 'WITH', 'WITHOUT', '&', '-', '+', 'O', 'E', 'S',
         'PIECE', 'OPENING', 'OPEN', 'CLOSE', 'TYPE', 'STYLING', 'LOOK',
         'HOLE', 'HOLES', 'R/L', 'LH=RH', 'RH=LH', 'R=L', 'ONLY', 'ETC', ':',
         'W/', 'W', 'PART', 'FULL', 'ALL', 'OBLONG', 'SIDES', 'PIECES',
         'MARKS', 'CUTTING', 'QUALITY', 'A', 'B', 'D', 'L', 'R', 'MODEL',
         'MODELS', 'LINE', 'QUICK', 'FIT', 'ON', 'SMALL', '5TH', 'CHASSIS',
         'SCREW', 'HALF', 'DIAMETER', 'DISC', 'SOFT', 'ITEM', 'ITEMS',
         'DISTANCE', 'CROSS', 'No', 'NO']

# --- vocab_extra.csv: добавки към речника БЕЗ да пипаш кода -----------------
# Формат (;): token;class[;extra]
#   class: base|carrier|purpose|position|body|material|finish|features|
#          packaging|variant|maker|engine|noise|typo|multiword
#   extra: за typo = замяна; за multiword = замяна; за base = канонично име
_VOCAB_CLASS = {'base': BASE, 'carrier': CARRIER, 'purpose': PURPOSE,
                'position': POSITION, 'body': BODY, 'material': MATERIAL,
                'finish': FINISH, 'features': FEATURES, 'packaging': PACKAGING,
                'variant': VARIANT, 'maker': MAKER, 'engine': ENGINE_WORDS,
                'noise': NOISE}
_extra = Path(__file__).parent / 'vocab_extra.csv'
if _extra.exists():
    with open(_extra, encoding='utf-8-sig') as _f:
        for _line in _f:
            _line = _line.strip()
            if not _line or _line.startswith('#'):
                continue
            _p = _line.split(';')
            _tok, _cls = _p[0].strip().upper(), _p[1].strip().lower()
            _ex = _p[2].strip().upper() if len(_p) > 2 and _p[2].strip() else None
            if _cls == 'typo':
                TYPOS[_tok] = _ex or _tok
            elif _cls == 'multiword':
                MULTIWORD.append((_tok, _ex or _tok.replace(' ', '')))
            elif _cls in _VOCAB_CLASS:
                _VOCAB_CLASS[_cls].append(_tok)
                if _cls == 'base' and _ex:
                    BASE_CANON[_tok] = _ex
            else:
                raise ValueError(f'vocab_extra.csv: непознат клас {_cls!r} за {_tok!r}')

CLASSES = [('base', BASE), ('carrier', CARRIER), ('purpose', PURPOSE),
           ('position', POSITION), ('body', BODY), ('material', MATERIAL),
           ('finish', FINISH), ('features', FEATURES),
           ('packaging', PACKAGING), ('variant', VARIANT), ('maker', MAKER),
           ('engine', ENGINE_WORDS)]

RE_YEAR = re.compile(r'(?:\b(\d{4})\s*-\s*(\d{4})\b|\b(\d{4})-(?!\d)|(?<!\d)-(\d{4})\b)')
RE_ENGINE = re.compile(r'\b\d+[.,]\d+\s?[A-Z]{0,5}\b')
RE_PIN = re.compile(r'\(?\s*(\d+)\s*\+?\s*\d*\s*PINS?\s*\)?', re.I)
RE_DIM = re.compile(r'\b\d+\s?X\s?\d+(?:\s?X\s?\d+)?\b|\b\d+\s?(?:MM|CM|KW|MHZ|W|V)\b')
RE_FORCE = re.compile(r'\b\d+L\s*-\s*\d+N\b')         # газови амортисьори 443L-380N
RE_BULB = re.compile(r'\b(?:H\d{1,2}|HB\d|HIR\d|D\d[SR]|PY?\d+W|W\d+W|T\d+)\b')


def classify(t):
    """Връща име на клас или None."""
    if t.startswith('SEG:'):
        return 'segment'
    if t.startswith('PUR:'):
        return 'purpose'
    if t.startswith('QUAL:'):
        return 'quality'
    if t.isdigit():
        return 'noise'
    for name, vocab in CLASSES:
        if t in vocab:
            return name
    if t in NOISE:
        return 'noise'
    return None


def put(out, cls, t, neg=False):
    if cls == 'noise':
        return
    if t.startswith('SEG:') or t.startswith('PUR:'):
        t = t[4:]
    elif t.startswith('QUAL:'):
        t = t[5:]
    if cls == 'base':
        t = BASE_CANON.get(t, t)
    if cls == 'features' and neg:
        t = 'NO-' + t
    out[cls].append(t)


def parse(descr):
    d = ' ' + descr.upper() + ' '
    for a, b in TYPOS.items():
        d = re.sub(r'\b' + re.escape(a) + r'\b', b, d)
    for a, b in MULTIWORD:
        d = d.replace(a, b)

    out = defaultdict(list)

    years = RE_YEAR.search(d)
    if years:
        g = years.groups()
        out['years'].append(f"{g[0]}-{g[1]}" if g[0] else (f"{g[2]}-" if g[2] else f"-{g[3]}"))
        d = RE_YEAR.sub(' ', d)
    for m in RE_PIN.findall(d):
        out['features'].append(f"{m}PIN")
    d = RE_PIN.sub(' ', d)
    for m in RE_ENGINE.findall(d):
        out['engine'].append(m.strip())
    d = RE_ENGINE.sub(' ', d)
    for m in RE_FORCE.findall(d):
        out['dimension'].append(m.replace(' ', ''))
    d = RE_FORCE.sub(' ', d)
    for m in RE_DIM.findall(d):
        out['dimension'].append(m)
    d = RE_DIM.sub(' ', d)
    for m in RE_BULB.findall(d):
        out['features'].append(m)
    d = RE_BULB.sub(' ', d)

    d = re.sub(r'[()]', ' ', d)
    d = re.sub(r'\bW/O\b', 'WITHOUT', d)
    d = re.sub(r'\bW/\s*', 'WITH ', d)   # W/SENSOR и "W/ SENSOR" -> WITH SENSOR

    toks = [t.strip('` \'".,:/') for t in d.split()]
    toks = [t for t in toks if t]
    neg = False
    for t in toks:
        if t == 'WITHOUT':
            neg = True
            continue
        cls = classify(t)
        if cls:
            put(out, cls, t, neg)
        elif '/' in t:
            parts = t.split('/')
            pcls = [classify(p) for p in parts]
            if all(pcls):
                for p, c in zip(parts, pcls):
                    put(out, c, p, neg)
            else:
                out['residual'].append(t)
        else:
            out['residual'].append(t)
        neg = False

    # без разпозната глава: частта Е носителят (FRONT BUMPER) или целта (RADIATOR)
    if not out['base']:
        if out['carrier']:
            out['base'].append(out['carrier'][0])
        elif out['purpose']:
            out['base'].append(out['purpose'][0])
    base = out['base'][0] if out['base'] else ''
    norm = ' | '.join(x for x in [
        base,
        '+'.join(dict.fromkeys(out['carrier'])),
        '+'.join(dict.fromkeys(out['purpose'])),
        ' '.join(dict.fromkeys(out['position']))] if x)
    return out, norm


def top_categories(n):
    seen = set()
    c = Counter()
    with open(PRICELIST, encoding='iso-8859-7') as f:
        for line in f:
            p = line.rstrip('\r\n').split(';')
            if len(p) < 12:
                continue
            cat, bc = p[9].strip(), p[10].strip()
            if p[0].strip() != bc:          # само canonical редове (ITEM CODE = BARCODE)
                continue
            if (cat, bc) not in seen:
                seen.add((cat, bc))
                c[cat] += 1
    return [cat for cat, _ in c.most_common(n)]


def main(categories, out_name='11_descr_norm_pilot.csv'):
    seen, rows = set(), []
    cnt = defaultdict(Counter)
    with open(PRICELIST, encoding='iso-8859-7') as f:
        for line in f:
            p = line.rstrip('\r\n').split(';')
            if len(p) < 12:
                continue
            cat, bc = p[9].strip(), p[10].strip()
            if p[0].strip() != bc:          # само canonical редове (ITEM CODE = BARCODE)
                continue
            if cat in categories and (cat, bc) not in seen:
                seen.add((cat, bc))
                # UPPER: SQL Server (CI колация) така или иначе слива
                # 'Bi-XENON' и 'BI-XENON' в един PK ključ
                cnt[cat][(p[3].strip().upper(), p[4].strip())] += 1

    residual_stat = Counter()
    per_cat = defaultdict(lambda: [0, 0])
    norms = defaultdict(Counter)
    side_conflict = Counter()
    for cat in categories:
        for (descr, side), n in cnt[cat].most_common():
            out, norm = parse(descr)
            up = ' ' + descr.upper() + ' '
            both_sides = any(m in up for m in ('R=L', 'RH=LH', 'LH=RH', 'R/L', 'L/R'))
            if side in ('LE', 'RI') and both_sides:
                side_conflict['SIDE зададен, текст казва двустранна'] += n
            elif not side and (' LEFT ' in up or ' RIGHT ' in up):
                side_conflict['SIDE празен, текст казва страна'] += n
            rows.append({
                'category': cat, 'parts': n, 'side': side, 'descr_raw': descr,
                'base_type': '+'.join(dict.fromkeys(out['base'])),
                'carrier': '+'.join(dict.fromkeys(out['carrier'])),
                'purpose': '+'.join(dict.fromkeys(out['purpose'])),
                'position': ' '.join(dict.fromkeys(out['position'])),
                'body': ' '.join(dict.fromkeys(out['body'])),
                'material': ' '.join(dict.fromkeys(out['material'])),
                'finish': ' '.join(dict.fromkeys(out['finish'])),
                'features': ' '.join(dict.fromkeys(out['features'])),
                'maker': ' '.join(dict.fromkeys(out['maker'])),
                'segment': ' '.join(dict.fromkeys(out['segment'])),
                'quality': ' '.join(dict.fromkeys(out['quality'])),
                'variant': ' '.join(dict.fromkeys(out['variant'])),
                'years': ' '.join(out['years']),
                'engine': ' '.join(out['engine']),
                'dimension': ' '.join(out['dimension']),
                'packaging': ' '.join(dict.fromkeys(out['packaging'])),
                'residual': ' '.join(out['residual']),
                'descr_norm': norm,
            })
            per_cat[cat][1] += n
            norms[cat][norm] += n
            if not out['residual']:
                per_cat[cat][0] += n
            for t in out['residual']:
                residual_stat[t] += n

    out_file = HERE / out_name
    with open(out_file, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=';')
        w.writeheader()
        w.writerows(rows)

    print(f"Записани {len(rows)} уникални описания -> {out_file.name}\n")
    print("Покритие (части без неразпознати токени):")
    for cat, (ok, tot) in sorted(per_cat.items(), key=lambda x: x[1][0] / x[1][1]):
        print(f"  {ok / tot:4.0%}  {cat}  ({ok}/{tot}, descr_norm групи: {len(norms[cat])})")
    tot_ok = sum(v[0] for v in per_cat.values())
    tot_all = sum(v[1] for v in per_cat.values())
    print(f"  ОБЩО: {tot_ok}/{tot_all} = {tot_ok / tot_all:.0%}")
    if side_conflict:
        print("\nПротиворечия SIDE колона срещу текст:")
        for k, n in side_conflict.items():
            print(f"  {n:5d} части: {k}")
    print("\nТоп 25 неразпознати токени (по брой части):")
    for t, n in residual_stat.most_common(25):
        print(f"  {n:5d}  {t}")


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--all':
        main(set(top_categories(10000)), out_name='13_descr_norm_all.csv')
    elif args and args[0] == '--top':
        n = int(args[1]) if len(args) > 1 else 30
        main(set(top_categories(n)), out_name=f'12_descr_norm_top{n}.csv')
    else:
        cats = args or ['AIRDUCT', 'DOOR MIRROR', 'DOOR HANDLES',
                        'BUMPER GRILLES/FRAMES - AIRDUCTS']
        main(set(cats))
