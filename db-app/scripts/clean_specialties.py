#!/usr/bin/env python3
import csv
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "Virtue_Foundation_Dataset_Exploration.csv"
OUTPUT = ROOT / "data" / "specialties_cleaned.csv"
SUMMARY = ROOT / "data" / "specialty_categories_summary.csv"

CATEGORY_RULES = [
    ("Emergency, Trauma & Critical Care", ["emergency", "trauma", "critical care", "criticalcare", "intensive care", "icu", "intensivist", "accident"]),
    ("Cardiology & Cardiothoracic", ["cardio", "cardiac", "heart", "electrophysiology", "ctvs", "cvts", "coronary"]),
    ("Obstetrics, Gynecology & Fertility", ["obstetric", "gynec", "gynaec", "maternity", "ivf", "fertility", "infertility", "reproductive", "endometriosis", "andrology", "egg donation", "blastocyst", "endometrial", "antenatal", "postnatal", "pregnancy", "pcos", "menopause", "menstrual", "midwifery", "lactation", "oocyte", "ovulation", "iui", "icsi", "tesa", "pgta", "pgtm", "pgd", "test tube", "sperm", "semen", "obg", "obgy", "well women"]),
    ("Pediatrics & Neonatology", ["pediatric", "paediatric", "neonat", "new born", "child", "adolescent", "pedodont", "paedodont"]),
    ("Oncology & Hematology", ["onco", "cancer", "tumor", "tumour", "hematology", "haematology", "haematologist", "hematologist", "bone marrow", "malignan", "car t cell", "targeted therap"]),
    ("Neurology & Neurosurgery", ["neuro", "movement disorder", "skull base", "brain", "stroke", "spinal cord"]),
    ("Orthopedics, Spine & Sports Medicine", ["orthopedic", "orthopaedic", "orthoped", "ortho", "spine", "spondyl", "slipped disc", "arthro", "arthritis", "sports medicine", "sports injury", "bone", "joint", "shoulder", "elbow", "hip", "knee", "limb", "fracture", "podiatry", "podiary", "osteoporosis"]),
    ("Ophthalmology", ["ophthalm", "opthalm", "retina", "retino", "vitreo", "lasik", "vision", "cornea", "kerato", "eye", "oculoplasty", "occuloplasty", "ocular", "uvea", "uveitis", "squint", "armd", "glaucoma", "macular", "myopia", "optometry", "optical", "cataract", "chalazion", "strabismus", "ptosis", "pterygium", "rop", "icl"]),
    ("ENT, Head & Neck", ["ent", "otorhino", "otolaryngology", "otology", "rhinology", "laryngology", "ear nose throat", "head neck", "audiolog", "audiometry", "hearing", "dysphonia", "voice", "swallow", "tongue tie", "parotid"]),
    ("Dental, Oral & Maxillofacial", ["dental", "dentistry", "dentist", "orthodont", "periodont", "peridont", "periondont", "endodont", "prosthodont", "implant", "tooth", "teeth", "oral", "maxillofacial", "maxillo", "braces", "aligner", "invisalign", "crown", "bridge", "denture", "cavity", "filling", "scaling", "smile", "gum", "gingivo", "veneers", "tmj", "hypnodont"]),
    ("Dermatology, Plastic & Aesthetic", ["dermat", "venereology", "venerology", "skin", "cosmet", "aesthetic", "plastic", "scar", "birthmark", "burn", "sweating", "hair", "mole", "nail", "vitiligo", "psoriasis", "melasma", "pruritus", "tattoo", "stretch marks", "liposuction", "rhinoplasty", "breast reduction"]),
    ("Gastroenterology, Hepatobiliary & Colorectal", ["gastro", "hepato", "liver", "billiary", "biliary", "colorectal", "coloproctology", "proctology", "endoscopy", "laproscopy", "laparoscopic", "laparoscopy", "anal", "anorectal", "piles", "fissure", "fistula", "constipation", "ibs", "esophageal", "stomach", "gallbladder", "hernia", "appendicitis", "whipple", "rectal", "prolapse"]),
    ("Urology, Nephrology & Transplant", ["urology", "urolog", "urogyne", "kidney", "renal", "nephro", "dialysis", "transplant", "hydrocele", "lithotripsy", "prostate", "bph", "urethra", "urinary", "cystolith", "erectile", "circumcision"]),
    ("Endocrinology, Diabetes & Metabolic", ["endocrin", "diabet", "metabolic", "bariatric", "thyroid", "obesity"]),
    ("Pulmonology & Respiratory", ["pulmon", "respir", "chest", "asthma", "lung"]),
    ("Mental Health & Behavioral", ["psychiat", "psycholog", "counsel", "anxiety", "depression", "behavior", "behaviour"]),
    ("Immunology, Allergy & Rheumatology", ["allerg", "immunology", "immunologist", "rheumatology", "rheumatologist", "inflammatory", "ankylosing"]),
    ("Diagnostics, Pathology & Laboratory", ["pathology", "laboratory", "lab", "biochemistry", "bio chemistry", "cytology", "histopath", "diagnostic", "testing", "bacteriology", "microbiology", "serology", "virology", "mycology", "parasitology", "flow cytometry", "coagulation", "immunoassay", "karyotyping", "blood bank", "blood storage", "blood centre", "chemistry", "toxicology", "pharmacology"]),
    ("Radiology, Imaging & Nuclear Medicine", ["radiology", "radiodiagnosis", "imaging", "x ray", "x-ray", "sonography", "sonology", "ultrasound", "doppler", "dexa", "mri", "scan", "mammography", "angiogram", "angiography", "angioplasty", "radiofrequency", "nuclear medicine"]),
    ("Anesthesia & Pain Medicine", ["anesthesia", "anaesthesia", "anesthesiology", "anaesthesiology", "anesthesiologist", "anaesthesiologist", "pain", "nerve block"]),
    ("General, Laparoscopic & Minimal Access Surgery", ["general surgery", "general surgeon", "surgery", "surgeries", "minimal access", "minimally invasive", "robotic"]),
    ("General Medicine, Family & Internal Medicine", ["general medicine", "internal medicine", "family medicine", "physician", "adult", "medicine"]),
    ("Geriatrics & Palliative Care", ["geriatric", "geriatrician", "old age", "palliative", "home care", "home visits"]),
    ("Rehabilitation, Physiotherapy & Allied Health", ["rehab", "physio", "occupational", "speech", "therapy", "prosthetics", "prosthesis", "orthotics", "biofeedback", "special education", "learning disability"]),
    ("Nutrition & Dietetics", ["nutrition", "dietet", "dietician", "dietitian"]),
    ("Alternative & Integrative Medicine", ["ayurveda", "ayurvedic", "homeopathy", "homeopath", "homoeopath", "homoeopathy", "naturopathy", "acupressure", "yoga", "panchakarma", "chikitsa", "tantra", "unani", "holistic"]),
    ("Genetics & Reproductive Genomics", ["genetic", "cytogenetic", "dna"]),
    ("Vascular & Endovascular", ["vascular", "endovascular"]),
    ("Infectious Disease & Public Health", ["infectious", "infection", "community", "public health", "epidem", "epidemiology", "global health", "vaccinology", "tuberculosis", "leprosy"]),
    ("Administration, Operations & Support Services", ["administration", "engineering", "maintenance", "tourism", "ambulance", "outpatient", "health checkup", "health checkups", "home collection", "pharmacy", "optical shop", "multispeciality", "superspeciality", "all specialities", "other specialties", "specialist consultation"]),
]

ACRONYMS = {
    "ent": "ENT",
    "ivf": "IVF",
    "icu": "ICU",
    "gi": "GI",
    "ctvs": "CTVS",
    "cvts": "CVTS",
    "mri": "MRI",
    "ct": "CT",
    "dna": "DNA",
    "x": "X",
    "ray": "Ray",
    "aboi": "ABOi",
    "cbct": "CBCT",
    "dexa": "DEXA",
    "hipec": "HIPEC",
}

SYNONYMS = {
    "Anaesthesia": "Anesthesia",
    "Anaesthesiology": "Anesthesiology",
    "Ent": "ENT",
    "Ear Nose Throat ENT Specialist": "ENT Specialist",
    "ENT Otorhinolaryngologist": "ENT / Otorhinolaryngology",
    "ENT Otolaryngology": "ENT / Otolaryngology",
    "ENT Otorhinolaryngology": "ENT / Otorhinolaryngology",
    "Gynaecology": "Gynecology",
    "Paediatrics": "Pediatrics",
    "Dietics": "Dietetics",
    "Dietician": "Dietitian",
    "Dietitian Nutritionist": "Dietitian / Nutritionist",
    "3d4d Sonography": "3D/4D Sonography",
    "24 Hrs Digital X Ray": "24 Hours Digital X-Ray",
    "24 Hrs Diagnostics": "24 Hours Diagnostics",
}


def split_words(value: str) -> str:
    value = value.strip().replace("\ufeff", "")
    value = re.sub(r"([a-z])([A-Z])", r"\1 \2", value)
    value = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", value)
    value = re.sub(r"[/_+|]+", " ", value)
    value = re.sub(r"[()]+", " ", value)
    value = re.sub(r"\s*&\s*", " and ", value)
    value = re.sub(r"\s+", " ", value).strip(" -")
    return value


def title_specialty(value: str) -> str:
    words = split_words(value).split()
    titled = []
    for word in words:
        cleaned = re.sub(r"[^A-Za-z0-9-]", "", word)
        low = cleaned.lower()
        if low in ACRONYMS:
            titled.append(ACRONYMS[low])
        elif re.fullmatch(r"\d+d\d+d", low):
            titled.append(low.upper().replace("D", "D/"))
        elif cleaned:
            titled.append(cleaned[:1].upper() + cleaned[1:].lower())
    result = " ".join(titled)
    result = re.sub(r"\bAnd\b", "and", result)
    result = re.sub(r"\bOf\b", "of", result)
    result = re.sub(r"\bFor\b", "for", result)
    result = result.replace("X Ray", "X-Ray")
    return SYNONYMS.get(result, result)


def category_for(cleaned: str) -> str:
    if not cleaned or cleaned.lower() == "null" or re.fullmatch(r"\d+", cleaned) or cleaned.lower().startswith("coordinates"):
        return "Invalid / Non-specialty"
    haystack = f" {cleaned.lower()} "
    for category, terms in CATEGORY_RULES:
        if any(term_matches(haystack, term) for term in terms):
            return category
    return "Other / Needs Review"


def term_matches(haystack: str, term: str) -> bool:
    term = term.lower().strip()
    if len(term) <= 3 and term.isalnum():
        return re.search(rf"\b{re.escape(term)}\b", haystack) is not None
    return term in haystack


def main() -> None:
    counts = Counter()
    with INPUT.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if "specialty_clean" not in (reader.fieldnames or []):
            raise SystemExit("Expected a 'specialty_clean' column.")
        for row in reader:
            raw = (row.get("specialty_clean") or "").strip()
            cleaned = title_specialty(raw)
            counts[cleaned] += 1

    rows = []
    for cleaned, count in sorted(counts.items(), key=lambda item: (category_for(item[0]), item[0])):
        rows.append({
            "specialty": cleaned,
            "category": category_for(cleaned),
            "source_row_count": count,
        })

    with OUTPUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["specialty", "category", "source_row_count"])
        writer.writeheader()
        writer.writerows(rows)

    by_category = defaultdict(list)
    for row in rows:
        by_category[row["category"]].append(row["specialty"])

    with SUMMARY.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["category", "unique_specialty_count", "specialties"])
        writer.writeheader()
        for category in sorted(by_category):
            writer.writerow({
                "category": category,
                "unique_specialty_count": len(by_category[category]),
                "specialties": "; ".join(by_category[category]),
            })

    print(f"Input rows: {sum(counts.values())}")
    print(f"Unique cleaned specialties: {len(rows)}")
    print(f"Wrote: {OUTPUT.relative_to(ROOT)}")
    print(f"Wrote: {SUMMARY.relative_to(ROOT)}")
    for category in sorted(by_category):
        print(f"{category}: {len(by_category[category])}")


if __name__ == "__main__":
    main()
