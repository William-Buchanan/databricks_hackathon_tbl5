#!/usr/bin/env python3
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECIALTIES = ROOT / "data" / "specialties_cleaned.csv"
SUMMARY = ROOT / "data" / "specialty_categories_summary.csv"
SOURCE_URL = "https://ayushmanup.in/assets/doc/HBP-2.0-Rate-List.pdf"
SOURCE_LABEL = "AB PM-JAY HBP 2.0 Rate List"

CATEGORY_COSTS_INR = {
    "Administration, Operations & Support Services": (1500, 10000, "Planning proxy"),
    "Alternative & Integrative Medicine": (2000, 7500, "HBP proxy"),
    "Anesthesia & Pain Medicine": (6500, 35000, "HBP proxy"),
    "Cardiology & Cardiothoracic": (5000, 45000, "HBP direct/proxy"),
    "Dental, Oral & Maxillofacial": (3000, 22000, "HBP proxy"),
    "Dermatology, Plastic & Aesthetic": (6500, 80000, "HBP direct/proxy"),
    "Diagnostics, Pathology & Laboratory": (1500, 13000, "HBP proxy"),
    "ENT, Head & Neck": (6500, 40000, "HBP proxy"),
    "Emergency, Trauma & Critical Care": (1500, 10000, "HBP direct/proxy"),
    "Endocrinology, Diabetes & Metabolic": (1500, 9000, "HBP proxy"),
    "Gastroenterology, Hepatobiliary & Colorectal": (6000, 60000, "HBP proxy"),
    "General Medicine, Family & Internal Medicine": (1500, 7500, "HBP direct/proxy"),
    "General, Laparoscopic & Minimal Access Surgery": (10000, 65000, "HBP proxy"),
    "Genetics & Reproductive Genomics": (5000, 25000, "Planning proxy"),
    "Geriatrics & Palliative Care": (2500, 13000, "HBP proxy"),
    "Immunology, Allergy & Rheumatology": (3000, 18000, "HBP proxy"),
    "Infectious Disease & Public Health": (1500, 8500, "HBP direct/proxy"),
    "Invalid / Non-specialty": (0, 0, "Invalid source value"),
    "Mental Health & Behavioral": (2000, 13000, "HBP proxy"),
    "Neurology & Neurosurgery": (30000, 160000, "HBP direct/proxy"),
    "Nutrition & Dietetics": (1000, 6500, "Planning proxy"),
    "Obstetrics, Gynecology & Fertility": (6500, 43000, "HBP proxy"),
    "Oncology & Hematology": (15000, 100000, "HBP proxy"),
    "Ophthalmology": (5000, 35000, "HBP proxy"),
    "Orthopedics, Spine & Sports Medicine": (15000, 82000, "HBP proxy"),
    "Other / Needs Review": (1500, 13000, "Planning proxy"),
    "Pediatrics & Neonatology": (2000, 40000, "HBP proxy"),
    "Pulmonology & Respiratory": (2000, 22000, "HBP proxy"),
    "Radiology, Imaging & Nuclear Medicine": (4000, 45000, "HBP proxy"),
    "Rehabilitation, Physiotherapy & Allied Health": (2000, 15000, "HBP proxy"),
    "Urology, Nephrology & Transplant": (6500, 75000, "HBP proxy"),
    "Vascular & Endovascular": (25000, 120000, "HBP proxy"),
}

FIELDNAMES = [
    "specialty",
    "category",
    "source_row_count",
    "hbp_estimated_cost_inr_low",
    "hbp_estimated_cost_inr_high",
    "hbp_cost_confidence",
    "hbp_cost_source_label",
    "hbp_cost_source_url",
]


def cost_for(category: str) -> tuple[int, int, str]:
    return CATEGORY_COSTS_INR.get(category, CATEGORY_COSTS_INR["Other / Needs Review"])


def enrich_row(row: dict[str, str]) -> dict[str, str]:
    low, high, confidence = cost_for(row["category"])
    return {
        "specialty": row["specialty"],
        "category": row["category"],
        "source_row_count": row["source_row_count"],
        "hbp_estimated_cost_inr_low": str(low),
        "hbp_estimated_cost_inr_high": str(high),
        "hbp_cost_confidence": confidence,
        "hbp_cost_source_label": SOURCE_LABEL,
        "hbp_cost_source_url": SOURCE_URL,
    }


def main() -> None:
    with SPECIALTIES.open(newline="", encoding="utf-8-sig") as f:
        rows = [enrich_row(row) for row in csv.DictReader(f)]

    with SPECIALTIES.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    with SUMMARY.open(newline="", encoding="utf-8-sig") as f:
        summary_rows = list(csv.DictReader(f))

    summary_fieldnames = [
        "category",
        "unique_specialty_count",
        "hbp_estimated_cost_inr_low",
        "hbp_estimated_cost_inr_high",
        "hbp_cost_confidence",
        "hbp_cost_source_label",
        "hbp_cost_source_url",
        "specialties",
    ]
    enriched_summary = []
    for row in summary_rows:
        low, high, confidence = cost_for(row["category"])
        enriched_summary.append({
            "category": row["category"],
            "unique_specialty_count": row["unique_specialty_count"],
            "hbp_estimated_cost_inr_low": str(low),
            "hbp_estimated_cost_inr_high": str(high),
            "hbp_cost_confidence": confidence,
            "hbp_cost_source_label": SOURCE_LABEL,
            "hbp_cost_source_url": SOURCE_URL,
            "specialties": row["specialties"],
        })

    with SUMMARY.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=summary_fieldnames)
        writer.writeheader()
        writer.writerows(enriched_summary)

    print(f"Updated {SPECIALTIES.relative_to(ROOT)} with INR HBP benchmark columns")
    print(f"Updated {SUMMARY.relative_to(ROOT)} with category INR HBP benchmark columns")


if __name__ == "__main__":
    main()
