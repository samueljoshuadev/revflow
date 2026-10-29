"""Converte os espelhos de vendas recebidos em PDF para o payload de import_sales_table."""
import json
import re
import sys
from decimal import Decimal, ROUND_HALF_UP
from pypdf import PdfReader

OUT = sys.argv[1]


def text(path):
    return "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)


def money(raw):
    raw = raw.replace("R$", "").replace(".", "").replace(",", ".").strip()
    if raw in {"", "-"}:
        return None
    return Decimal(raw)


def num(v):
    return None if v is None else float(v)


def pct(part, total):
    if part is None or not total:
        return None
    return float((part / total * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def per_m2(price, area):
    if price is None or not area:
        return None
    return float((price / Decimal(str(area))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


# ---------------------------------------------------------------- Reserva do Lago
RESERVA_ROW = re.compile(
    r"\n\s*(\d{2})\s*\n\s*(\d+)\s*m²\s*\n\s*([\d.,]+)\s*m²\s*\n\s*(Dispon[íi]vel|Vendido)\s*\n"
    r"\s*R\$\s*([\d.,]+)\s*\n\s*R\$\s*([\d.,]+)\s*\n\s*R\$\s*([\d.,]+)\s*\n"
    r"\s*R\$\s*([\d.,]+)\s*\n\s*R\$\s*([\d.,]+)",
    re.IGNORECASE,
)
STATUS = {"disponível": "available", "disponivel": "available", "vendido": "sold"}


def reserva_do_lago(path):
    units = []
    for m in RESERVA_ROW.finditer(text(path)):
        code, area, lote, status, valor, ato, mensal, anual, fin = m.groups()
        price = money(valor)
        area_m2 = float(area)
        units.append({
            "code": f"CASA-{code}",
            "title": f"Casa {code} — Reserva do Lago Residencial",
            "status": STATUS[status.lower()],
            "property_type": "house",
            "area_m2": area_m2,
            "land_area_m2": float(money(lote)),
            "bedrooms": 2,
            "parking_spaces": None,
            "list_price": num(price),
            "price_per_m2": per_m2(price, area_m2),
            "down_payment": num(money(ato)),
            "down_payment_percent": pct(money(ato), price),
            "monthly_installment": num(money(mensal)),
            "monthly_installment_count": 36,
            "annual_installment": num(money(anual)),
            "annual_installment_count": 2,
            "keys_payment": None,
            "financing_amount": num(money(fin)),
            "financing_percent": pct(money(fin), price),
        })
    assert len({u["code"] for u in units}) == len(units), "código duplicado"
    return units


# ---------------------------------------------------------------- Key West
KEYWEST_ROW = re.compile(
    r"^(\d{2,3})\s+(\d+)\s+(\d+)\s+(-|[\d.,]+)R\$\s+(-|[\d.,]+)R\$\s+(-|[\d.,]+)R\$\s+"
    r"(-|[\d.,]+)R\$\s+(-|[\d.,]+)R\$\s+(-|[\d.,]+)R\$",
    re.MULTILINE,
)


def key_west(path):
    units = []
    for m in KEYWEST_ROW.finditer(text(path)):
        code, metragem, vagas, valor, sinal, parcela, anual, chaves, fin = m.groups()
        price = money(valor)
        area_m2 = float(metragem)
        floor = int(code[:-1])
        units.append({
            "code": f"AP-{code}",
            "title": f"Apartamento {code} — Residencial Key West Jardim",
            # Unidade sem valor na tabela recebida não está sendo comercializada.
            "status": "available" if price is not None else "inactive",
            "property_type": "apartment",
            "area_m2": area_m2,
            "land_area_m2": None,
            "unit_floor": floor,
            "bedrooms": None,
            "parking_spaces": int(vagas),
            "list_price": num(price),
            "price_per_m2": per_m2(price, area_m2),
            "down_payment": num(money(sinal)),
            "down_payment_percent": pct(money(sinal), price),
            "monthly_installment": num(money(parcela)),
            "monthly_installment_count": 36,
            "annual_installment": num(money(anual)),
            "annual_installment_count": 2,
            "keys_payment": num(money(chaves)),
            "financing_amount": num(money(fin)),
            "financing_percent": pct(money(fin), price),
        })
        if price is None:
            units[-1]["description"] = "Unidade sem valor na tabela de vendas recebida."
    assert len({u["code"] for u in units}) == len(units), "código duplicado"
    return units


SOURCES = {
    "reserva-do-lago": {
        "development": {
            "slug": "reserva-do-lago",
            "name": "Reserva do Lago Residencial",
            "property_type": "house",
            "city": "Cabreúva",
            "state": "SP",
            "neighborhood": "Jacaré",
            "total_units": 45,
            "bedrooms": 2,
            "private_area_m2": 51,
            "payment_plan_label": "Plano 36x",
            "sales_table_reference": "tabela-vendas-reserva-do-lago.pdf",
            "notes": "45 casas, 2 dormitórios, 51 m² privativos. Status conforme arquivo recebido.",
        },
        "parser": reserva_do_lago,
        "pdf": "pdfs/reserva-do-lago.pdf",
    },
    "key-west-jardim": {
        "development": {
            "slug": "key-west-jardim",
            "name": "Residencial Key West Jardim",
            "property_type": "apartment",
            "city": "Santo André",
            "state": "SP",
            "neighborhood": None,
            "total_units": 72,
            "bedrooms": None,
            "private_area_m2": 76,
            "parking_spaces": 1,
            "payment_plan_label": "Sinal 6% + 36x + anuais (12 e 24) + chaves + financiamento 70%",
            "sales_table_reference": "Catequese_Tabela_Nov_26.pdf",
            "notes": "72 apartamentos de 76 m² com 1 vaga, 18 pavimentos. Tabela de novembro/2026.",
        },
        "parser": key_west,
        "pdf": "pdfs/catequese.pdf",
    },
}

for slug, cfg in SOURCES.items():
    units = cfg["parser"](cfg["pdf"])
    payload = {
        "development": cfg["development"],
        "source_reference": cfg["development"]["sales_table_reference"],
        "units": units,
    }
    with open(f"{OUT}/{slug}.json", "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    priced = [u for u in units if u["list_price"] is not None]
    print(
        f"{slug}: {len(units)} unidades, {len(priced)} com preço, "
        f"disponíveis={sum(1 for u in units if u['status']=='available')}, "
        f"vendidas={sum(1 for u in units if u['status']=='sold')}, "
        f"inativas={sum(1 for u in units if u['status']=='inactive')}"
    )
