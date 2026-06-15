export interface HbpRateRow {
  specialty: string;
  specialtyCode: string;
  hbp20PackageCode: string;
  hbp10PackageCode: string;
  packageName: string;
  procedureCode: string;
  procedureName: string;
  procedurePriceInr: number;
}

export interface HbpBenchmark {
  low: number;
  high: number;
  rowCount: number;
  matchLevel: "specialty" | "category" | "all";
}

export const HBP_RATE_LIST_URL = "https://ayushmanup.in/assets/doc/HBP-2.0-Rate-List.pdf";
export const HBP_RATE_LIST_LABEL = "AB PM-JAY HBP 2.0 rate list";

export const hbpRateRows: HbpRateRow[] = [
  row("Burns Management", "BM", "S1100001", "BM001", "Thermal burns", "BM001A", "% Total Body Surface Area Burns (TBSA) - any % not requiring admission", 7000),
  row("Burns Management", "BM", "S1100002", "BM001", "Thermal burns", "BM001B", "% Total Body Surface Area Burns (TBSA): Upto 40%", 40000),
  row("Burns Management", "BM", "S1100003", "BM001", "Thermal burns", "BM001C", "% Total Body Surface Area Burns (TBSA): 40% - 60%", 50000),
  row("Burns Management", "BM", "S1100004", "BM001", "Thermal burns", "BM001D", "% Total Body Surface Area Burns (TBSA): > 60%", 80000),
  row("Burns Management", "BM", "S1100001", "BM002", "Scald burns", "BM002A", "% Total Body Surface Area Burns (TBSA) - any % not requiring admission", 7000),
  row("Burns Management", "BM", "S1100002", "BM002", "Scald burns", "BM002B", "% Total Body Surface Area Burns (TBSA): Upto 40%", 40000),
  row("Burns Management", "BM", "S1100003", "BM002", "Scald burns", "BM002C", "% Total Body Surface Area Burns (TBSA): 40% - 60%", 50000),
  row("Burns Management", "BM", "S1100004", "BM002", "Scald burns", "BM002D", "% Total Body Surface Area Burns (TBSA): > 60%", 80000),
  row("Burns Management", "BM", "S1100005", "BM004", "Electrical contact burns", "BM004A", "Low voltage - without part of limb / limb loss", 30000),
  row("Burns Management", "BM", "S1100006", "BM004", "Electrical contact burns", "BM004B", "Low voltage - with part of limb / limb loss", 40000),
  row("Burns Management", "BM", "S1100008", "BM004", "Electrical contact burns", "BM004C", "High voltage - with part of limb / limb loss", 60000),
  row("Burns Management", "BM", "S1100007", "BM004", "Electrical contact burns", "BM004D", "High voltage - without part of limb / limb loss", 50000),
  row("Burns Management", "BM", "S1100009", "BM005", "Chemical burns", "BM005A", "Without significant facial scarring and/or loss of function", 40000),
  row("Burns Management", "BM", "S1100010", "BM005", "Chemical burns", "BM005B", "With significant facial scarring and/or loss of function", 60000),
  row("Emergency", "ER", "New Package", "ER001", "Laceration - Suturing / Dressing", "ER001A", "Laceration - Suturing / Dressing", 2000),
  row("Emergency", "ER", "M700001", "ER002", "Cardiopulmonary emergency", "ER002A", "Emergency with stable cardiopulmonary status", 2000),
  row("Emergency", "ER", "New Package", "ER002", "Cardiopulmonary emergency", "ER002B", "Emergency with unstable cardiopulmonary status with resuscitation", 10000),
  row("Emergency", "ER", "M700004", "ER003", "Animal bites (Excluding Snake Bite)", "ER003A", "Animal bites (Excluding Snake Bite)", 1700),
  row("Interventional Neuroradiology", "IN", "S900003", "IN001", "Dural AVMs / AVFs", "IN001A", "Dural AVMs per sitting with glue", 70000),
  row("Interventional Neuroradiology", "IN", "S900003", "IN001", "Dural AVMs / AVFs", "IN001B", "Dural AVFs per sitting with glue", 70000),
  row("Interventional Neuroradiology", "IN", "S900004", "IN001", "Dural AVMs / AVFs", "IN001C", "Dural AVMs per sitting with onyx", 150000),
  row("Interventional Neuroradiology", "IN", "S900004", "IN001", "Dural AVMs / AVFs", "IN001D", "Dural AVFs per sitting with onyx", 150000),
  row("Interventional Neuroradiology", "IN", "S900007", "IN002", "Cerebral & Spinal AVM embolization", "IN002A", "Cerebral AVM embolization using Histoacryl per sitting", 100000),
  row("Interventional Neuroradiology", "IN", "S900007", "IN002", "Cerebral & Spinal AVM embolization", "IN002B", "Spinal AVM embolization using Histoacryl per sitting", 100000),
  row("Interventional Neuroradiology", "IN", "S900001", "IN003", "Coil embolization for aneurysms", "IN003A", "Coil embolization for aneurysms", 100000),
  row("Interventional Neuroradiology", "IN", "S900012", "IN006", "Intracranial balloon angioplasty with stenting", "IN006A", "Intracranial balloon angioplasty with stenting", 160000),
  row("Interventional Neuroradiology", "IN", "S900013", "IN007", "Intracranial thrombolysis / clot retrieval", "IN007A", "Intracranial thrombolysis / clot retrieval", 160000),
  row("Cardiology", "MC", "New Package", "MC001", "Right / Left Heart Catheterization", "MC001A", "Right Heart Catheterization", 5000),
  row("Cardiology", "MC", "New Package", "MC001", "Right / Left Heart Catheterization", "MC001B", "Left Heart Catheterization", 5000),
  row("Cardiology, Interventional Radiology", "MC", "S1200039", "MC002", "Catheter directed Thrombolysis", "MC002A", "For Deep vein thrombosis (DVT)", 30800),
  row("Cardiology", "MC", "S1200012", "MC003", "Balloon Dilatation", "MC003A", "Coarctation of Aorta", 38600),
  row("Cardiology", "MC", "S1200004", "MC004", "Balloon Pulmonary / Aortic Valvotomy", "MC004A", "Balloon Pulmonary Valvotomy", 23400),
  row("Cardiology", "MC", "S1200003", "MC005", "Balloon Mitral Valvotomy", "MC005A", "Balloon Mitral Valvotomy", 35700),
  row("Cardiology", "MC", "S1200014", "MC007", "ASD Device Closure", "MC007A", "ASD Device Closure", 36900),
  row("Cardiology", "MC", "S1200024, S1200025", "MC011", "PTCA, inclusive of diagnostic angiogram", "MC011A", "PTCA, inclusive of diagnostic angiogram", 40600),
  row("Cardiology, CTVS", "MC", "S1200023", "MC015", "Single Chamber Permanent Pacemaker Implantation", "MC015A", "Permanent Pacemaker Implantation - Single Chamber", 24500),
  row("Cardiology, CTVS", "MC", "S1200022", "MC016", "Double Chamber Permanent Pacemaker Implantation", "MC016A", "Permanent Pacemaker Implantation - Double Chamber", 33000),
  row("Cardiology", "MC", "S1200013", "MC020", "Systemic Thrombolysis (for MI)", "MC020A", "Systemic Thrombolysis (for MI)", 17900),
  row("General Medicine, Pediatric Medical Management", "MG", "M100011", "MG001", "Acute febrile illness", "MG001A", "Acute febrile illness", 1800),
  row("General Medicine, Pediatric Medical Management", "MG", "M100055", "MG002", "Severe sepsis", "MG002A", "Severe sepsis", 1800),
  row("General Medicine, Pediatric Medical Management", "MG", "M100055", "MG002", "Severe sepsis", "MG002B", "Septic shock", 1800),
  row("General Medicine, Pediatric Medical Management", "MG", "M100014", "MG003", "Malaria", "MG003A", "Malaria", 1800),
  row("General Medicine, Pediatric Medical Management", "MG", "M100015, M200030", "MG004", "Dengue fever", "MG004A", "Dengue fever", 1800),
  row("General Medicine, Pediatric Medical Management", "MG", "M100019, M200003", "MG016", "Pneumonia", "MG016A", "Pneumonia", 1800),
  row("General Medicine, Pediatric Medical Management", "MG", "M100044", "MG040", "Respiratory failure", "MG040A", "Type 1 respiratory failure", 1800),
  row("General Medicine", "MG", "M100070, S100214", "MG072", "Haemodialysis / Peritoneal Dialysis", "MG072A", "Haemodialysis Dialysis", 1500),
  row("General Medicine, Pediatric Medical Management", "MG", "M100071, M200101", "MG075", "High end radiological diagnostic", "MG075A", "CT, MRI, Imaging including nuclear imaging", 5000),
  row("Mental Disorders", "MM", "M800003, M800010", "MM003", "Schizophrenia, schizotypal and delusional disorders", "MM003A", "Schizophrenia, schizotypal and delusional disorders", 1500),
  row("Mental Disorders", "MM", "M800005, M800012", "MM004", "Neurotic, stress-related and somatoform disorders", "MM004A", "Neurotic, stress-related and somatoform disorders", 1500),
  row("Mental Disorders", "MM", "M800015", "MM008", "Pre - ECT and Pre - TMS Package", "MM008A", "Pre - Electro Convulsive Therapy and Transcranial Magnetic Stimulation package", 10000),
  row("Mental Disorders", "MM", "M800016", "MM009", "Electro Convulsive Therapy (ECT) - per session", "MM009A", "Electro Convulsive Therapy (ECT) - per session", 3000),
  row("Neo - natal Care", "MN", "M300001", "MN001", "Basic neonatal care package", "MN001A", "Basic neonatal care package", 500),
  row("Neo - natal Care", "MN", "M300002", "MN002", "Special Neonatal Care Package", "MN002A", "Special Neonatal Care Package", 3000),
  row("Neo - natal Care", "MN", "M300003", "MN003", "Intensive Neonatal Care Package", "MN003A", "Intensive Neonatal Care Package", 5000),
  row("Neo - natal Care", "MN", "M300004", "MN004", "Advanced Neonatal Care Package", "MN004A", "Advanced Neonatal Care Package", 6000),
  row("Neo - natal Care", "MN", "M300005", "MN005", "Critical Care Neonatal Package", "MN005A", "Critical Care Neonatal Package", 7000),
  row("Medical Oncology", "MO", "New Package", "MO001", "CT for CA Breast", "MO001A", "Cyclophosphamide + Epirubcin", 7200),
  row("Medical Oncology", "MO", "New Package", "MO001", "CT for CA Breast", "MO001E", "Docetaxel + Cyclophosphamide", 19800),
  row("Medical Oncology", "MO", "New Package", "MO021", "CT for CA Brain", "MO021B", "Temozolamide", 67600),
  row("Medical Oncology", "MO", "New Package", "MO046", "CT for Acute Myeloid Leukemia", "MO046B", "Induction", 96000),
  row("Medical Oncology", "MO", "New Package", "MO047", "CT for Acute Lymphoblastic Leukemia", "MO047A", "Consolidation", 160000),
  row("Medical Oncology", "MO", "New Package", "MO062", "CT for Pediatric Acute Lymphoblastic Leukemia", "MO062A", "Consolidation", 208600),
  row("Radiation Oncology", "MR", "New Package", "MR001", "2D External Beam Radiotherapy (6 Fractions)", "MR001A", "Radical", 11000),
  row("Radiation Oncology", "MR", "M600001", "MR003", "2D External Beam Radiotherapy (25 Fractions)", "MR003A", "Radical", 20000),
  row("Radiation Oncology", "MR", "M600005", "MR006", "Linear Accelerator IMRT (20 Fractions)", "MR006A", "Radical", 70000),
  row("Radiation Oncology", "MR", "M600006", "MR008", "Linear Accelerator IGRT with 3D CRT or IMRT", "MR008A", "Radical", 90000),
  row("Radiation Oncology", "MR", "M600007", "MR010", "SRT / SBRT with IGRT", "MR010A", "SRT / SBRT with IGRT", 82000),
  row("Orthopedics, Emergency Room Packages", "SB", "New Package", "SB001", "Fracture - Conservative Management - Without plaster", "SB001A", "Fracture - Conservative Management - Without plaster", 2000),
  row("Orthopedics", "SB", "S500019", "SB020", "Ankle Fractures", "SB020A", "Open Reduction Internal Fixation", 14000),
  row("Orthopedics", "SB", "New Package", "SB022", "Dorsal and lumber spine fixation", "SB022A", "Anterior", 40000),
  row("Orthopedics", "SB", "S500091", "SB038", "Total Hip Replacement", "SB038A", "Cemented", 35000),
  row("Orthopedics", "SB", "S500092", "SB038", "Total Hip Replacement", "SB038B", "Cementless", 37000),
  row("Orthopedics", "SB", "S500096", "SB039", "Total Knee Replacement", "SB039A", "Primary - Total Knee Replacement", 25000),
  row("Orthopedics", "SB", "S500022", "SB040", "Bone Tumour Excision including GCT + Joint replacement", "SB040A", "Bone Tumour Excision including GCT + Joint replacement", 57000),
  row("Surgical Oncology", "SC", "New Package", "SC006", "Transthoracic esophagectomy: 2F / 3F", "SC006A", "Open", 60000),
  row("Surgical Oncology, Urology", "SC", "S700076", "SC024", "Radical cystectomy", "SC024A", "With continent diversion - Open", 98000),
  row("Surgical Oncology", "SC", "S1500027", "SC046", "Sleeve resection of lung cancer", "SC046A", "Sleeve resection of lung cancer", 70000),
  row("Surgical Oncology, CTVS, Plastic & Reconstructive Surgery", "SC", "New Package", "SC074", "Vascular reconstruction", "SC074A", "Vascular reconstruction", 57600),
  row("Ophthalmology", "SE", "S300029", "SE020", "Cataract surgery", "SE020A", "Phaco emulsification with foldable hydrophobic acrylic IOL", 4500),
  row("Ophthalmology", "SE", "S300030", "SE020", "Cataract surgery", "SE020B", "SICS with non-foldable IOL", 4000),
  row("Ophthalmology", "SE", "S300012", "SE027", "Glaucoma Surgery", "SE027B", "Trabeculectomy with or without Mitomycin C", 11000),
  row("Ophthalmology", "SE", "New Package", "SE027", "Glaucoma Surgery", "SE027D", "Pediatric Glaucoma Surgery", 15000),
  row("Ophthalmology", "SE", "S300028", "SE032", "Vitreoretinal Surgery", "SE032A", "Vitreoretinal Surgery with Silicon Oil Insertion", 17900),
  row("General Surgery, Pediatric Surgery", "SG", "S100003", "SG017", "Appendicectomy", "SG017A", "Open", 11000),
  row("General Surgery, Pediatric Surgery", "SG", "S100180", "SG017", "Appendicectomy", "SG017B", "Lap.", 11000),
  row("General Surgery, Pediatric Surgery", "SG", "S100181", "SG039", "Cholecystectomy", "SG039C", "Without Exploration of CBD - Lap.", 22800),
  row("General Surgery, Surgical Oncology", "SG", "S100106", "SG045", "PancreaticoDuodenectomy (Whipple's)", "SG045A", "PancreaticoDuodenectomy (Whipple's)", 30000),
  row("General Surgery", "SG", "New Package", "SG050", "Groin Hernia Repair", "SG050A", "Inguinal - Open", 14200),
  row("General Surgery, Pediatric Surgery, Obstetrics & Gynecology", "SG", "New Package", "SG096", "Biopsy", "SG096A", "Lymph Node", 5000),
  row("ENT", "SL", "S200038", "SL013", "Functional Endoscopic Sinus (FESS)", "SL013A", "Functional Endoscopic Sinus (FESS)", 11000),
  row("ENT, Surgical Oncology", "SL", "New Package", "SL020", "Excision of tumour of oral cavity / paranasal sinus / laryngopharynx", "SL020B", "With pedicled flap reconstruction", 36500),
  row("ENT, Surgical Oncology", "SL", "S200052", "SL030", "Advanced anterior skull base surgery", "SL030A", "Endoscopic Hypophysectomy", 39800),
  row("ENT, Oral & Maxillofacial Surgery, Plastic Surgery", "SL", "S200036", "SL034", "Open reduction and internal fixation of maxilla / mandible / zygoma", "SL034A", "Open reduction and internal fixation of maxilla", 14000),
  row("Oral & Maxillofacial Surgery", "SM", "S1600006", "SM001", "Extraction of impacted tooth under LA", "SM001A", "Extraction of impacted tooth under LA", 500),
  row("Oral & Maxillofacial Surgery", "SM", "S1600001", "SM004", "Fixation of fracture of jaw", "SM004A", "Closed reduction (1 jaw) using wires - under LA", 5000),
  row("Oral & Maxillofacial Surgery", "SM", "S1600002", "SM004", "Fixation of fracture of jaw", "SM004B", "Open reduction (1 jaw) and fixing of plates / wire under GA", 12000),
  row("Neurosurgery", "SN", "S800047", "SN001", "Depressed Fracture", "SN001A", "Depressed Fracture", 40000),
  row("Neurosurgery", "SN", "S800012", "SN009", "Surgery for Haematoma - Intracranial", "SN009A", "Head injuries", 55000),
  row("Neurosurgery", "SN", "S800056", "SN015", "Excision of Brain Tumor Supratentorial", "SN015E", "Supratentorial & others", 55000),
  row("Neurosurgery", "SN", "S800060", "SN023", "Aneurysm Clipping including angiogram", "SN023A", "Aneurysm Clipping including angiogram", 50000),
  row("Neurosurgery", "SN", "S800083", "SN054", "Gamma Knife radiosurgery / SRS", "SN054A", "Gamma Knife radiosurgery / SRS for tumours / AVM", 75000),
  row("Obstetrics & Gynecology", "SO", "New Package", "SO010", "Hysterectomy", "SO010A", "Abdominal Hysterectomy", 20000),
  row("Obstetrics & Gynecology", "SO", "S400036", "SO054", "High risk delivery", "SO054A", "Pre-mature delivery", 11500),
  row("Obstetrics & Gynecology", "SO", "S400038", "SO054", "High risk delivery", "SO054B", "Mothers with eclampsia / severe pre-eclampsia", 11500),
  row("Obstetrics & Gynecology", "SO", "S400034", "SO057", "Caesarean Delivery", "SO057A", "Caesarean Delivery", 11500),
  row("Plastic & Reconstructive Surgery", "SP", "S1000008", "SP001", "Pressure Sore - Surgery", "SP001A", "Pressure Sore - Surgery", 30000),
  row("Plastic & Reconstructive Surgery", "SP", "S1000005", "SP006", "Tissue Expander for disfigurement", "SP006A", "Tissue Expander for disfigurement following burns", 50000),
  row("Pediatric Surgery, Oral & Maxillofacial Surgery, Plastic & Reconstructive Surgery", "SS", "S1400034, S100145, S100146, S100147, S1600009", "SS001", "Cleft Lip and Palate Surgery", "SS001A", "Cleft Lip and Palate Surgery per stage", 15000),
  row("Pediatric Surgery", "SS", "S1400028", "SS005", "Ladds Procedure", "SS005A", "Ladds Procedure", 30000),
  row("Polytrauma, Orthopedics, Neurosurgery, General Surgery", "ST", "New Package", "ST001", "Conservative Management of Head Injury", "ST001A", "Severe", 1000),
  row("Polytrauma, Orthopedics, Neurosurgery, General Surgery", "ST", "S600007", "ST003", "Craniotomy and evacuation of Haematoma with fixation of fracture of long bone", "ST003C", "Subdural hematoma along with fixation of 2 or more long bone", 75000),
  row("Polytrauma, Orthopedics, Neurosurgery, General Surgery", "ST", "S600001", "ST009", "Management of Nerve Plexus / Tendon injuries", "ST009A", "Nerve Plexus injury repair", 50000),
  row("Urology", "SU", "S700024, S700025", "SU007", "PCNL (Percutaneous Nephrolithotomy)", "SU007A", "PCNL (Percutaneous Nephrolithotomy)", 35000),
  row("Urology, Pediatric Surgery", "SU", "S700069", "SU051", "Extrophy Bladder repair", "SU051A", "Extrophy Bladder repair including osteotomy if needed", 65000),
  row("Urology", "SU", "S700106", "SU078", "Radical prostatectomy", "SU078A", "Open", 50000),
  row("Urology", "SU", "S700093", "SU080", "TURP", "SU080A", "Monopolar", 27500),
  row("CTVS", "SV", "S1300024", "SV001", "Surgical Correction of Category - I Congenital Heart Disease", "SV001B", "Isolated Secundum Atrial Septal Defect (ASD) Repair", 100000),
  row("CTVS", "SV", "S1200015", "SV002", "Surgical Correction of Category - II Congenital Heart Disease", "SV002F", "VSD closure", 120000),
  row("CTVS", "SV", "S1300027", "SV003", "Surgical Correction of Category - III Congenital Heart Disease", "SV003U", "Tetralogy of Fallot Repair", 150000),
  row("CTVS", "SV", "S1300001", "SV004", "Coronary artery bypass grafting (CABG)", "SV004A", "Coronary artery bypass grafting (CABG)", 118100),
  row("CTVS", "SV", "New Package", "SV007", "Triple valve procedure", "SV007A", "Triple valve procedure", 170000),
  row("CTVS", "SV", "S1300040", "SV014", "Aortic Root Replacement Surgery", "SV014A", "Bental Procedure", 150000),
  row("CTVS", "SV", "S1300044", "SV018", "Pulmonary Embolectomy / Thromboendarterectomy", "SV018A", "Pulmonary Embolectomy", 141000),
  row("Unspecified Surgical Package", "US", "U100001", "US001", "Unspecified Surgical Package", "US001A", "Unspecified Surgical Package Upto 1 lakh", 100000),
];

const categoryToHbpSpecialties: Record<string, string[]> = {
  "Administration, Operations & Support Services": ["Emergency"],
  "Anesthesia & Pain Medicine": ["General Surgery", "Orthopedics", "Emergency"],
  "Cardiology & Cardiothoracic": ["Cardiology", "CTVS"],
  "Dental, Oral & Maxillofacial": ["Oral & Maxillofacial Surgery"],
  "Dermatology, Plastic & Aesthetic": ["Burns Management", "Plastic & Reconstructive Surgery"],
  "Diagnostics, Pathology & Laboratory": ["General Medicine"],
  "ENT, Head & Neck": ["ENT"],
  "Emergency, Trauma & Critical Care": ["Emergency", "Polytrauma"],
  "Endocrinology, Diabetes & Metabolic": ["General Medicine"],
  "Gastroenterology, Hepatobiliary & Colorectal": ["General Surgery"],
  "General Medicine, Family & Internal Medicine": ["General Medicine"],
  "General, Laparoscopic & Minimal Access Surgery": ["General Surgery"],
  "Geriatrics & Palliative Care": ["General Medicine", "Mental Disorders"],
  "Immunology, Allergy & Rheumatology": ["General Medicine", "Pediatric Medical Management"],
  "Infectious Disease & Public Health": ["General Medicine", "Pediatric Medical Management"],
  "Mental Health & Behavioral": ["Mental Disorders"],
  "Neurology & Neurosurgery": ["Interventional Neuroradiology", "Neurosurgery", "Pediatric Medical Management"],
  "Obstetrics, Gynecology & Fertility": ["Obstetrics & Gynecology"],
  "Oncology & Hematology": ["Medical Oncology", "Radiation Oncology", "Surgical Oncology"],
  "Ophthalmology": ["Ophthalmology"],
  "Orthopedics, Spine & Sports Medicine": ["Orthopedics", "Polytrauma"],
  "Pediatrics & Neonatology": ["Neo - natal Care", "Pediatric Surgery", "Pediatric Medical Management"],
  "Pulmonology & Respiratory": ["General Medicine", "CTVS"],
  "Radiology, Imaging & Nuclear Medicine": ["Radiation Oncology", "Interventional Neuroradiology"],
  "Rehabilitation, Physiotherapy & Allied Health": ["Burns Management", "Orthopedics"],
  "Urology, Nephrology & Transplant": ["Urology", "General Medicine"],
  "Vascular & Endovascular": ["CTVS", "Surgical Oncology", "Interventional Neuroradiology"],
};

export function hbpRowsForCategory(category: string): HbpRateRow[] {
  const specialtyMatches = categoryToHbpSpecialties[category] ?? [];
  if (!specialtyMatches.length) return hbpRateRows;
  return hbpRateRows.filter((rateRow) => specialtyMatches.some((specialty) => rateRow.specialty.toLowerCase().includes(specialty.toLowerCase())));
}

export function hbpRowsForProfile(category: string, specialty: string): { rows: HbpRateRow[]; matchLevel: HbpBenchmark["matchLevel"] } {
  const categoryRows = hbpRowsForCategory(category);
  const directRows = rowsMatchingSpecialty(specialty, categoryRows);
  if (directRows.length) return { rows: directRows, matchLevel: "specialty" };
  if (categoryRows.length) return { rows: categoryRows, matchLevel: categoryToHbpSpecialties[category]?.length ? "category" : "all" };
  return { rows: hbpRateRows, matchLevel: "all" };
}

export function hbpBenchmarkForCategory(category: string): HbpBenchmark {
  const rows = hbpRowsForCategory(category);
  return benchmarkForRows(rows, categoryToHbpSpecialties[category]?.length ? "category" : "all");
}

export function hbpBenchmarkForProfile(category: string, specialty: string): HbpBenchmark {
  const { rows, matchLevel } = hbpRowsForProfile(category, specialty);
  return benchmarkForRows(rows, matchLevel);
}

export function costTierForBenchmark(high: number): 1 | 2 | 3 | 4 | 5 {
  if (high <= 0) return 1;
  if (high <= 10000) return 1;
  if (high <= 35000) return 2;
  if (high <= 75000) return 3;
  if (high <= 125000) return 4;
  return 5;
}

export function costTierForProfile(category: string, specialty: string, benchmark: HbpBenchmark): 1 | 2 | 3 | 4 | 5 {
  const benchmarkTier = costTierForBenchmark(benchmark.high);
  const heuristicTier = specialtyCostTier(category, specialty);
  return Math.max(benchmarkTier, heuristicTier) as 1 | 2 | 3 | 4 | 5;
}

function benchmarkForRows(rows: HbpRateRow[], matchLevel: HbpBenchmark["matchLevel"]): HbpBenchmark {
  if (!rows.length) return { low: 0, high: 0, rowCount: 0, matchLevel };
  return {
    low: Math.min(...rows.map((rateRow) => rateRow.procedurePriceInr)),
    high: Math.max(...rows.map((rateRow) => rateRow.procedurePriceInr)),
    rowCount: rows.length,
    matchLevel,
  };
}

export function formatInrRange(low: number, high: number): string {
  if (!low && !high) return "No HBP benchmark";
  if (low === high) return `₹${low.toLocaleString("en-IN")}`;
  return `₹${low.toLocaleString("en-IN")}-₹${high.toLocaleString("en-IN")}`;
}

function row(
  specialty: string,
  specialtyCode: string,
  hbp20PackageCode: string,
  hbp10PackageCode: string,
  packageName: string,
  procedureCode: string,
  procedureName: string,
  procedurePriceInr: number,
): HbpRateRow {
  return {
    specialty,
    specialtyCode,
    hbp20PackageCode,
    hbp10PackageCode,
    packageName,
    procedureCode,
    procedureName,
    procedurePriceInr,
  };
}

function rowsMatchingSpecialty(specialty: string, rows: HbpRateRow[]): HbpRateRow[] {
  const searchTerms = specialtySearchTerms(specialty);
  if (!searchTerms.length) return [];
  return rows.filter((rateRow) => {
    const haystack = normalizeText(`${rateRow.specialty} ${rateRow.packageName} ${rateRow.procedureName}`);
    return searchTerms.some((term) => haystack.includes(term));
  });
}

function specialtySearchTerms(specialty: string): string[] {
  const normalized = normalizeText(specialty);
  const aliases: Record<string, string[]> = {
    "24 hours diagnostics": ["diagnostic", "ct mri imaging"],
    "cataract surgery": ["cataract"],
    "chest medicine": ["pneumonia", "respiratory failure"],
    "dialysis": ["dialysis", "haemodialysis", "peritoneal dialysis"],
    "emergency cardiology": ["cardiopulmonary emergency", "systemic thrombolysis", "ptca"],
    "emergency medicine": ["emergency"],
    "ent otolaryngology": ["ent"],
    "general dentistry": ["oral maxillofacial", "extraction", "jaw"],
    "general surgery": ["general surgery", "appendicectomy", "cholecystectomy", "hernia"],
    "high risk pregnancy care": ["high risk delivery", "caesarean", "eclampsia"],
    "interventional cardiology": ["ptca", "catheter", "balloon", "pacemaker"],
    "maternal icu": ["high risk delivery", "caesarean", "eclampsia"],
    "mri and ct": ["ct mri imaging"],
    "neonatal icu": ["neo natal", "neonatal"],
    "non invasive cardiology": ["right left heart catheterization", "cardiology"],
    "oncology infusion": ["medical oncology", "chemotherapy", "radiation oncology"],
    "orthopedic trauma": ["orthopedics", "fracture", "polytrauma"],
    "palliative care": ["general medicine", "mental disorders"],
    "pediatric emergency medicine": ["pediatric", "emergency"],
    "physiotherapy and rehabilitation": ["orthopedics", "burns"],
    "trauma care": ["polytrauma", "emergency"],
    "ultrasound and x ray": ["diagnostic", "ct mri imaging"],
    "vascular surgery": ["vascular", "ctvs", "interventional neuroradiology"],
  };
  const terms = aliases[normalized] ?? [];
  return [...terms, ...tokensForSearch(normalized)].filter((term, index, list) => term.length >= 3 && list.indexOf(term) === index);
}

function tokensForSearch(normalized: string): string[] {
  const stopWords = new Set(["and", "care", "clinic", "department", "disease", "diseases", "management", "medicine", "services", "specialty", "surgery"]);
  return normalized.split(" ").filter((token) => token.length >= 4 && !stopWords.has(token));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function specialtyCostTier(category: string, specialty: string): 1 | 2 | 3 | 4 | 5 {
  const text = normalizeText(`${category} ${specialty}`);

  if (hasAny(text, ["bone marrow", "stem cell transplant", "organ transplant", "transplantation", "transplant surgery", "lung transplant", "pancreas transplant", "multi visceral", "multiorgan"])) {
    return 5;
  }
  if (hasAny(text, ["ctvs", "cvts", "cardiothoracic", "cardio thoracic", "cardiovascular thoracic", "cath lab", "gamma knife", "aneurysm", "interventional neuroradiology"])) {
    return 5;
  }
  if (hasAny(text, ["robotic", "tertiary", "advanced anterior skull base", "intracranial", "linear accelerator", "radiosurgery"])) {
    return 5;
  }

  if (hasAny(text, ["icu", "critical care", "intensive", "interventional", "invasive", "catheter", "catheterisation", "angiography", "angioplasty", "electrophysiology", "pacemaker", "vascular", "endovascular"])) {
    return 4;
  }
  if (hasAny(text, ["mri", "ct ", "computed tomography", "neurosurgery", "neuro surgery", "oncology", "chemotherapy", "radiotherapy", "dialysis", "high risk", "laparoscopic", "minimal access"])) {
    return 4;
  }

  if (hasAny(text, ["surgery", "surgical", "orthopedic", "orthopaedic", "fracture", "anesthesia", "anaesthesia", "endoscopy", "radiology", "emergency", "trauma"])) {
    return 3;
  }

  if (hasAny(text, ["diagnostic", "pathology", "laboratory", "ophthalmology", "cataract", "ent", "psychiatry", "mental", "dermatology", "palliative", "family medicine", "general medicine"])) {
    return 2;
  }

  return 1;
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}
