# Medical Desert Remediation Platform
**Databricks for Good Hackathon - Team Table 5**

---

## 🎯 Project Purpose

This project addresses one of India's most critical healthcare challenges: **medical deserts** — regions where access to specialized healthcare services is severely limited or non-existent. While India has made significant strides in expanding healthcare infrastructure, vast geographic and specialty-specific gaps remain, particularly in rural and underserved areas.

### The Challenge

Medical deserts create:
* **Delayed or missed diagnoses** for conditions requiring specialized care
* **Increased mortality and morbidity** due to lack of timely intervention
* **Economic burden** on families who must travel long distances or relocate for treatment
* **Inequitable health outcomes** across states, districts, and socioeconomic groups
* **Inefficient resource allocation** due to lack of granular, data-driven insights

### Our Mission

We built a comprehensive **Medical Desert Remediation Platform** that:
1. **Identifies medical deserts** at granular geographic levels (state, district, sub-district, postal code)
2. **Quantifies healthcare gaps** by specialty and capability (diagnostic, outpatient, inpatient, surgical)
3. **Provides actionable intelligence** for health ministry planners, NGOs, and policymakers
4. **Enables evidence-based planning** for new facility construction, mobile clinic deployment, and resource allocation

---

## 🧹 Data Cleaning: Facility Accuracy Confidence Scoring

### The Data Quality Problem

The Databricks Virtue Foundation Dataset contains over **14,000 healthcare facilities** across India, sourced from multiple channels (Google Business Profile, hospital directories, government registries). However, this data exhibited significant quality issues:

* **Semantic mismatches** — Facilities named "Eye Hospital" without ophthalmology in their specialty list
* **Missing or outdated information** — Incomplete contact details, stale update timestamps
* **Duplicate entries** — Same facility appearing multiple times with slight name variations
* **Questionable scale claims** — Single-doctor clinics claiming 15+ specialties

### Our Solution: 6-Component Accuracy Confidence Scoring System

We developed a **110-point accuracy confidence score** that evaluates every facility across six weighted dimensions:

#### 1️⃣ Semantic Consistency (40 points)
Checks whether a facility's name aligns with its declared specialties.
* **Perfect Match (40 pts)**: "ABC Eye Hospital" + specialties include "ophthalmology"
* **Generic Name with Specialties (30 pts)**: "City Medical Center" + valid specialty list
* **Generic Name Only (20 pts)**: "Healthcare Clinic" + no specialties listed
* **Mismatch (10 pts)**: "Dental Care" but specialties list cardiology

#### 2️⃣ Recent Activity Score (20 points)
Assesses recency of page updates as a proxy for operational status.
* Updated within last 6 months → 20 points
* Updated 6-12 months ago → 15 points
* Updated 1-2 years ago → 10 points
* Updated 2+ years ago or missing → 0 points

#### 3️⃣ Data Completeness (20 points)
Rewards facilities with comprehensive information:
* Complete address, phone, website, email → 20 points
* Partial contact information → 10-15 points
* Minimal information → 5 points

#### 4️⃣ Source Quality (10 points)
Higher trust for facilities appearing in multiple authoritative sources:
* Present in hospital directories + Google → 10 points
* Single source → 5 points

#### 5️⃣ Hospital Directory Validation (10 points)
Bonus for facilities validated against external hospital directories:
* Found in external directory → 10 points
* Not found → 0 points

#### 6️⃣ Scale-Specialty Plausibility (10 points)
Detects implausible claims (e.g., 1 doctor, 15 specialties):
* Plausible ratio → 10 points
* Questionable ratio → 3 points
* Highly implausible → 0 points

### Scoring Results

After scoring all 14,823 facilities:

| Confidence Category | Facilities | Percentage | Avg Score |
|---------------------|------------|------------|----------|
| **Very High (80-100)** | 14,362 | 96.9% | 86.7 |
| **High (60-79)** | 424 | 2.9% | 75.8 |
| **Medium (40-59)** | 34 | 0.2% | 49.6 |
| **Low (20-39)** | 3 | <0.1% | 36.3 |

**Key Insight**: 96.9% of facilities scored "Very High Confidence," indicating the Virtue Foundation dataset is fundamentally sound. The remaining 3.1% require manual review or exclusion from critical planning decisions.

### Data Enrichment

Beyond cleaning, we enriched the facility data with:
* **H3 geospatial indexing** (resolution 7) for efficient spatial queries
* **Population density overlays** from WorldPop 2025 (1km resolution)
* **Specialty standardization** using a curated medical specialty taxonomy
* **Duplicate detection** via normalized names and phonetic matching (Soundex)

---

## 🏥 Goals: Solving Medical Deserts in India

### 1. Geographic Precision

Identify medical deserts at **granular administrative levels**:
* **State-level** — Macro trends for policy setting
* **District-level** — Resource allocation for district hospitals
* **Sub-district/Tehsil-level** — Community Health Centre planning
* **Postal code-level** — Primary Health Centre and mobile clinic routing

### 2. Specialty-Specific Gap Analysis

Not all medical deserts are equal. We analyze gaps across **14 specialty categories** and **60+ sub-specialties**, including:
* **High-mortality specialties**: Cardiology, oncology, critical care
* **Essential services**: Obstetrics/gynecology, pediatrics, emergency medicine
* **Chronic disease management**: Endocrinology (diabetes), nephrology (dialysis), pulmonology
* **Underserved specialties**: Mental health, palliative care, geriatrics

### 3. Capability-Level Planning

Differentiate between four healthcare capability tiers:
* **Diagnostic Only** — Labs, imaging centers (X-ray, ultrasound, CT/MRI)
* **Outpatient** — Consultations, minor procedures, vaccinations
* **Inpatient** — Hospitalization, overnight monitoring, post-surgical care
* **Surgical** — Operating rooms, anesthesia, ICU support

This enables planners to ask: *"Where do we need a full surgical facility vs. a diagnostic center?"*

### 4. Evidence-Based Budget Allocation

Integrate **PM-JAY Health Benefit Package (HBP) rates** to:
* Estimate **per-capita specialty demand** based on package utilization data
* Calculate **budget requirements** for establishing new facilities
* Compare **cost-effectiveness** of different intervention strategies (e.g., permanent facility vs. mobile clinic)

### 5. Equity and Fairness

Prioritize interventions in regions with:
* **High population, low facility density** — Absolute need
* **Poor health outcomes** — NFHS-5 indicators (MMR, IMR, institutional deliveries)
* **Underserved demographics** — Tribal areas, SC/ST populations, urban slums

---

## 💻 Application: Medical Desert Planning Tool

### Technology Stack

* **Frontend**: React 19 + TypeScript + Vite
* **Mapping**: H3 geospatial indexing (Uber's Hexagonal Hierarchical Spatial Index)
* **Backend API**: Databricks SQL warehouse (serverless compute)
* **Data Storage**: Unity Catalog (Bronze/Silver/Gold medallion architecture)
* **Deployment**: Databricks Apps (containerized React app)

### Core Features

#### 🗺️ 1. Interactive Geospatial Map

* **H3 hexagon-based visualization** — Each hexagon represents a geographic cell at resolution 7 (~5km² area)
* **Color-coded risk zones**:
  * 🔴 **Critical Desert** — Zero facilities for selected specialty + high population
  * 🟠 **Severe Gap** — Minimal coverage (1-2 facilities, high demand)
  * 🟡 **Moderate Gap** — Partial coverage, room for expansion
  * 🟢 **Adequate** — Meets or exceeds minimum coverage thresholds
* **Pan and zoom** — Navigate from state-level overview to neighborhood-level detail
* **Hover tooltips** — Instant statistics (population, facility count, gap score)

#### 🔍 2. Multi-Dimensional Filtering

**Geographic Filters**:
* State → District → Sub-District → Postal Code (cascading dropdowns)
* Keyword search (facility names, cities)

**Clinical Filters**:
* Capability level (Diagnostic / Outpatient / Inpatient / Surgical)
* Specialty category (14 options: Cardiology, Oncology, Orthopedics, etc.)
* Specialty subcategory (60+ fine-grained options)

**Budget Filters**:
* Budget band (₹10L-₹1Cr, ₹1-5Cr, ₹5-15Cr, ₹15Cr+)
* Auto-calculated based on selected specialty and capability level

#### 📊 3. Risk Matrix Dashboard

A **2x2 decision matrix** plotting regions by:
* **X-axis**: Population density (demand proxy)
* **Y-axis**: Facility availability (supply)

Quadrants:
* **Top-Left (Critical)**: High population + low facilities → **Immediate intervention needed**
* **Bottom-Left (Watch)**: Low population + low facilities → Monitor for growth
* **Top-Right (Saturated)**: High population + high facilities → Adequate coverage
* **Bottom-Right (Over-provisioned)**: Low population + high facilities → Possible resource reallocation

#### 📝 4. Region Inspection Panel

Click any region to view:
* **Facility inventory** — List of all facilities in the region with confidence scores
* **Population statistics** — Total, density, projected growth
* **Health indicators** — NFHS-5 data (if available at district level)
* **Gap analysis** — Specific specialty/capability shortfalls
* **Budget estimates** — Capital and operational costs for remediation

#### 🚩 5. Flagging and Scenario Planning

**Flagging Workflow**:
1. Identify high-priority regions on the map
2. Click 🚩 **Flag** button to add to watchlist
3. Review all flagged regions in sidebar
4. Export flagged regions as CSV for offline planning

**Scenario Builder**:
* **"What-if" analysis** — Simulate adding a new 50-bed cardiology center in Region X
* **Impact preview** — See updated risk scores and coverage radius
* **Save scenarios** — Compare multiple intervention strategies side-by-side
* **Budget rollup** — Total capital expenditure across all scenarios

#### 🤖 6. AI-Powered Planning Assistant

* **Natural language queries** — "Show me districts with zero oncology facilities but >500k population"
* **Conversational insights** — "Why is this region flagged as critical?"
* **Recommendation engine** — "Which 5 regions should we prioritize for cardiology expansion?"

#### 📈 7. Audit Logging and Analytics

All user interactions are logged to Unity Catalog (`workspace.default.user_logs`) for:
* **Usage analytics** — Most-searched specialties, frequently flagged regions
* **Collaboration** — Track which planners reviewed which regions
* **Compliance** — Audit trail for budget allocation decisions

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PlannerMap   │  │ RiskMatrix   │  │ Inspection   │     │
│  │ (H3 hexes)   │  │ (scatter)    │  │ Panel        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Filters      │  │ Scenarios    │  │ Ask AI       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓ API requests
┌─────────────────────────────────────────────────────────────┐
│              Databricks SQL Warehouse (Serverless)          │
│  - /api/facilities (fetch gold.facilities_with_confidence)  │
│  - /api/regions (aggregate by H3 + specialty)               │
│  - /api/hbp_rates (PM-JAY package benchmarks)               │
└─────────────────────────────────────────────────────────────┘
                            ↓ reads from
┌─────────────────────────────────────────────────────────────┐
│                    Unity Catalog Tables                      │
│  🥉 Bronze: workspace.bronze.*                               │
│     - Raw facility data, census population, NFHS indicators │
│  🥈 Silver: workspace.silver.*                               │
│     - facilities_with_confidence_score (cleaned, enriched)  │
│  🥇 Gold: workspace.gold.*                                   │
│     - Aggregated regional statistics, H3 indexed            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Data Pipeline

### Ingestion (Bronze Layer)

**Sources documented in [data_ingestion notebook](./data_ingestion):**

1. **WHO GHO OData API** — DALYs by cause, mortality indicators
2. **IHME GBD + ICMR** — State-level disease burden (India-specific)
3. **NFHS-5** — National Family Health Survey district indicators
4. **HMIS** — Health Management Information System (facility-level activity)
5. **Nikshay** — Tuberculosis notification data
6. **PM-JAY HBP** — Health Benefit Package rates (treatment costs)
7. **GeM** — Government e-Marketplace equipment prices
8. **IPHS 2022** — Indian Public Health Standards (facility norms)
9. **WorldPop 2025** — 1km resolution population density rasters

### Transformation (Silver Layer)

**Notebooks**:
* [Virtue Foundation Dataset Exploration](./Virtue%20Foundation%20Dataset%20Exploration) — Initial data profiling
* [Facility Data Accuracy Confidence Scoring](./Facility%20Data%20Accuracy%20Confidence%20Scoring) — Quality scoring pipeline
* [specialty_mapping](./specialty_mapping) — Standardize specialty names

**Key Transformations**:
1. **Deduplication** — Normalized name matching, phonetic clustering
2. **Geocoding validation** — Flag suspicious lat/long (e.g., (0,0) coordinates)
3. **H3 indexing** — Assign hexagon IDs at resolution 7
4. **Population joins** — Enrich facilities with 1km² population density
5. **Confidence scoring** — Apply 110-point rubric

### Aggregation (Gold Layer)

* **Region-level rollups** — Total facilities, average confidence, population per facility
* **Specialty-specific views** — Pre-compute cardiology deserts, oncology gaps, etc.
* **Time-series ready** — Date partitions for tracking facility growth over time

---

## 📊 Impact and Use Cases

### For Government Planners (State Health Departments)

* **Annual budget allocation** — Identify top 10 districts for new Community Health Centres
* **Ayushman Bharat compliance** — Ensure PM-JAY empaneled facilities meet geographic distribution norms
* **Disaster preparedness** — Map trauma care and ICU capacity in flood/earthquake-prone zones

### For NGOs and Philanthropic Organizations

* **Mobile clinic routing** — Optimize routes to reach maximum population in medical deserts
* **Specialty camp planning** — Schedule eye surgery camps, cardiac screening camps in underserved taluks
* **Grant prioritization** — Target funding to regions with highest need-to-resource ratio

### For Healthcare Investors and Developers

* **Site selection** — Identify profitable yet underserved markets for new hospitals
* **Competitive intelligence** — Analyze competitor facility density by specialty
* **PPP opportunities** — Find districts where public-private partnerships are most needed

### For Researchers and Academics

* **Health equity studies** — Quantify urban-rural disparities in specialty access
* **Policy impact analysis** — Measure effects of PM-JAY, Ayushman Bharat PMJAY on coverage
* **Machine learning** — Predict future medical desert emergence based on demographic trends

---

## 🚀 Quick Start

### Prerequisites

* Databricks workspace with Unity Catalog enabled
* Serverless SQL warehouse
* Access to `databricks_virtue_foundation_dataset_dais_2026` catalog

### Setup

1. **Run data ingestion notebooks** (in order):
   ```
   1. Virtue Foundation Dataset Exploration
   2. Facility Data Accuracy Confidence Scoring
   3. specialty_mapping
   ```

2. **Deploy the Databricks App**:
   ```bash
   cd db-app
   databricks apps deploy medical-desert-planner
   ```

3. **Access the app**:
   Navigate to the app URL provided after deployment (typically `https://<workspace>.databricks.com/apps/<app-name>`)

---

## 📖 Project Structure

```
databricks_hackathon_tbl5/
├── README.md                                          # Brief project overview
├── README_DETAILED.md                                 # This file
├── data_ingestion.ipynb                               # Data source documentation
├── Virtue Foundation Dataset Exploration.ipynb        # Initial data profiling
├── Facility Data Accuracy Confidence Scoring.ipynb    # Quality scoring pipeline
├── specialty_mapping.ipynb                            # Specialty standardization
├── Expenditure_by_State_Analysis.ipynb               # Budget analysis (WIP)
└── db-app/                                            # React application
    ├── app.yaml                                       # Databricks App config
    ├── package.json                                   # Node.js dependencies
    ├── src/
    │   ├── App.tsx                                    # Main application component
    │   ├── components/                                # React components
    │   │   ├── PlannerMap.tsx                        # H3 hexagon map
    │   │   ├── RiskMatrix.tsx                        # 2x2 risk dashboard
    │   │   ├── InspectionPanel.tsx                   # Region detail view
    │   │   ├── RegionFilters.tsx                     # Geographic filters
    │   │   ├── SpecialtyPlanningControls.tsx         # Specialty/capability selectors
    │   │   ├── ScenarioSidebar.tsx                   # Scenario builder
    │   │   ├── AskAiPanel.tsx                        # AI assistant
    │   │   └── ...
    │   ├── lib/                                       # Utility functions
    │   │   ├── scoring.ts                            # Gap analysis algorithms
    │   │   └── auditLog.ts                           # Event logging
    │   └── data/                                      # Static reference data
    │       ├── specialtyPlanning.ts                  # Specialty profiles
    │       └── hbpRateList.ts                        # PM-JAY benchmarks
    └── DESIGN.md                                      # UI design system (ElevenLabs-inspired)
```

---

## 🏆 Achievements and Impact

* ✅ **14,823 healthcare facilities** scored and validated
* ✅ **96.9% data quality** (Very High Confidence)
* ✅ **Geospatial precision** down to ~5km² (H3 resolution 7)
* ✅ **14 specialty categories, 60+ sub-specialties** analyzed
* ✅ **4 capability levels** (Diagnostic → Surgical) for nuanced planning
* ✅ **PM-JAY budget integration** for cost-aware recommendations
* ✅ **Interactive planning tool** with AI assistant and scenario modeling
* ✅ **Audit logging** for governance and compliance

---

## 🔮 Future Roadmap

### Phase 2: Enhanced Analytics
* **Temporal trend analysis** — Track medical desert evolution over 5-10 years
* **Predictive modeling** — Forecast future gaps based on population projections
* **Real-time data integration** — Ingest HMIS monthly reports automatically

### Phase 3: Advanced Features
* **Multi-objective optimization** — Balance equity, efficiency, and budget constraints
* **Referral pathway analysis** — Model patient flow from PHC → CHC → District Hospital
* **Telemedicine integration** — Include virtual care as a desert remediation strategy

### Phase 4: National Scale
* **All-India deployment** — Expand beyond initial pilot states
* **Ministry dashboard** — Executive summary for NHM/NITI Aayog decision-makers
* **Public API** — Open data for researchers, journalists, activists

---

## 👥 Team

**Team Table 5** — Databricks for Good Hackathon 2026

*Building data-driven solutions for healthcare equity in India.*

---

## 📞 Contact

For questions, collaboration, or demo requests:
* Teams Chat: [Join our channel](https://teams.live.com/l/invite/FBAE7_HBKGhbWexIA?v=g1)
* GitHub Issues: [Open an issue](../../issues)

---

## 📄 License

**MIT License** — Free to use, modify, and distribute with attribution.

---

## 🙏 Acknowledgments

* **Databricks Virtue Foundation** — For curating and sharing the India healthcare facilities dataset
* **IHME / GBD** — Global Burden of Disease state-level data
* **NFHS-5** — National Family Health Survey district indicators
* **NHA / PM-JAY** — Health Benefit Package rate benchmarks
* **WorldPop** — High-resolution population density data
* **Databricks Platform Team** — For Databricks Apps, Unity Catalog, and serverless compute

---

*Last updated: 2026-01-16*