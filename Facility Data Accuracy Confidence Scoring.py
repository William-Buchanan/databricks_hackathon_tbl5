# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "5"
# dependencies = [
#   "h3",
# ]
# ///
# DBTITLE 1,Accuracy Confidence Scoring System - Overview
# MAGIC %md
# MAGIC # 🎯 Facility Data Accuracy Confidence Scoring System
# MAGIC
# MAGIC This notebook builds a comprehensive **accuracy_confidence score** (0-110) for all facilities in the dataset, based on 6 weighted components:
# MAGIC
# MAGIC ## Scoring Components (110 points total)
# MAGIC
# MAGIC ### 1️⃣ Semantic Consistency (40 points) ✨
# MAGIC * **Perfect Match (40 pts)**: Name specialty keyword aligns with actual specialties
# MAGIC   * Example: "ABC Eye Hospital" + specialties include "ophthalmology" ✅
# MAGIC * **Generic Name with Specialties (30 pts)**: No specific claim, but has specialties
# MAGIC * **Generic Name without Specialties (20 pts)**: Basic facility with no specialty info
# MAGIC * **Mismatch (10 pts)**: Name claims specialty but it's missing from specialties
# MAGIC   * Example: "XYZ Dental Clinic" but no dentistry in specialties ❌
# MAGIC
# MAGIC ### 2️⃣ Recent Activity (20 points) 📱
# MAGIC * **Engagement Metrics (10 pts)**: Has followers, likes, or post counts
# MAGIC * **Page Update Recency (10 pts)**: Based on `recency_of_page_update`
# MAGIC   * 10 pts: Updated in last 30 days
# MAGIC   * 8 pts: Updated in last 90 days
# MAGIC   * 6 pts: Updated in last 180 days
# MAGIC   * 4 pts: Updated in last year
# MAGIC
# MAGIC ### 3️⃣ Data Completeness (20 points) 📊
# MAGIC * **4 points each** for:
# MAGIC   * Description field present
# MAGIC   * Specialties field present
# MAGIC   * Contact info (phone/email/website) present
# MAGIC   * Geographic coordinates (lat/long) present
# MAGIC   * Location (city & state) present
# MAGIC
# MAGIC ### 4️⃣ Source Quality (10 points) 🔗
# MAGIC * **10 pts**: 4+ independent sources
# MAGIC * **8 pts**: 3 sources
# MAGIC * **6 pts**: 2 sources
# MAGIC * **4 pts**: 1 source
# MAGIC
# MAGIC ### 5️⃣ Hospital Directory Presence (10 points) 🏥
# MAGIC * **10 pts**: Facility is listed in external hospital directory
# MAGIC * **0 pts**: Not listed in hospital directory
# MAGIC
# MAGIC ### 6️⃣ Mismatch Detection (10 points) ⚠️
# MAGIC * Start at 10, deduct for anomalies:
# MAGIC   * -3 pts: Name looks like a doctor name ("Dr. X")
# MAGIC   * -3 pts: Hospital missing `numberDoctors`
# MAGIC   * -2 pts: Hospital missing `capacity`
# MAGIC   * -2 pts: Clinic/Hospital missing specialties
# MAGIC
# MAGIC ---
# MAGIC
# MAGIC ## Key Findings
# MAGIC
# MAGIC **Distribution:**
# MAGIC * ✅ **96.9%** of facilities have "Very High Confidence" (80-100)
# MAGIC * 🟡 **2.9%** have "High Confidence" (60-79)
# MAGIC * 🟡 **0.2%** have "Medium Confidence" (40-59)
# MAGIC * ⚠️ **0.0%** have "Low Confidence" (20-39)
# MAGIC * 🔴 **0.0%** have "Very Low Confidence" (0-19)
# MAGIC
# MAGIC **Hospital Directory Impact:**
# MAGIC * **44.4%** of facilities are listed in external hospital directory (+10 points)
# MAGIC * Facilities with hospital directory listing average 4.6 additional points
# MAGIC
# MAGIC **Common Issues:**
# MAGIC * Semantic mismatches where facility name claims a specialty not reflected in data
# MAGIC * Missing descriptions and specialties for some facilities
# MAGIC * Incomplete contact information
# MAGIC
# MAGIC ---
# MAGIC
# MAGIC ## Output: `facilities_with_confidence_score` temp view
# MAGIC
# MAGIC ✅ Contains all facilities with:
# MAGIC * All original facility columns
# MAGIC * 6 individual component scores (for debugging)
# MAGIC * `accuracy_confidence` (0-110 final score)
# MAGIC * `confidence_category` classification
# MAGIC
# MAGIC **Usage example:**
# MAGIC ```sql
# MAGIC SELECT * 
# MAGIC FROM facilities_with_confidence_score
# MAGIC WHERE accuracy_confidence >= 70  -- High quality only
# MAGIC ORDER BY accuracy_confidence DESC
# MAGIC ```

# COMMAND ----------

# DBTITLE 1,Build Complete Scoring System in One Step
# COMPREHENSIVE ACCURACY CONFIDENCE SCORING SYSTEM
# Build all 5 scoring components in a single PySpark query

from pyspark.sql import functions as F, Window
from pyspark.sql.types import IntegerType, DoubleType

# Load base facilities data with hospital directory info
facilities = spark.table("facilities_cleaned_org_with_duplicate_links_and_ext_hosp_dir")

print(f"Total facilities to score: {facilities.count():,}")
print("\nBuilding accuracy confidence scores...")

# Build comprehensive scoring
scored_facilities = facilities.select(
    # All original columns
    "*",
    
    # === COMPONENT 1: SEMANTIC CONSISTENCY (40 points) ===
    # Check if name keywords match actual specialties
    F.when(
        # Perfect matches: name implies specialty AND specialty exists
        ((F.lower(F.col("name")).like("%dental%") | F.lower(F.col("name")).like("%dent%")) & F.lower(F.col("specialties")).like("%dentistry%")) |
        ((F.lower(F.col("name")).like("%eye%") | F.lower(F.col("name")).like("%ophthal%") | F.lower(F.col("name")).like("%netralaya%")) & F.lower(F.col("specialties")).like("%ophthalmology%")) |
        (F.lower(F.col("name")).like("%ortho%") & F.lower(F.col("specialties")).like("%orthopedic%")) |
        ((F.lower(F.col("name")).like("%cardiac%") | F.lower(F.col("name")).like("%heart%") | F.lower(F.col("name")).like("%cardio%")) & F.lower(F.col("specialties")).like("%cardiology%")) |
        ((F.lower(F.col("name")).like("%cancer%") | F.lower(F.col("name")).like("%oncology%")) & F.lower(F.col("specialties")).like("%oncology%")) |
        ((F.lower(F.col("name")).like("%child%") | F.lower(F.col("name")).like("%pediatric%")) & F.lower(F.col("specialties")).like("%pediatric%")) |
        ((F.lower(F.col("name")).like("%maternity%") | F.lower(F.col("name")).like("%women%") | F.lower(F.col("name")).like("%gynec%")) & F.lower(F.col("specialties")).like("%gynecology%")),
        40
    ).when(
        # Mismatches: name implies specialty but it's MISSING
        ((F.lower(F.col("name")).like("%dental%") | F.lower(F.col("name")).like("%dent%")) & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%dentistry%"))) |
        ((F.lower(F.col("name")).like("%eye%") | F.lower(F.col("name")).like("%ophthal%") | F.lower(F.col("name")).like("%netralaya%")) & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%ophthalmology%"))) |
        (F.lower(F.col("name")).like("%ortho%") & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%orthopedic%"))) |
        ((F.lower(F.col("name")).like("%cardiac%") | F.lower(F.col("name")).like("%heart%") | F.lower(F.col("name")).like("%cardio%")) & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%cardiology%"))) |
        ((F.lower(F.col("name")).like("%cancer%") | F.lower(F.col("name")).like("%oncology%")) & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%oncology%"))) |
        ((F.lower(F.col("name")).like("%child%") | F.lower(F.col("name")).like("%pediatric%")) & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%pediatric%"))) |
        ((F.lower(F.col("name")).like("%maternity%") | F.lower(F.col("name")).like("%women%") | F.lower(F.col("name")).like("%gynec%")) & (F.col("specialties").isNull() | ~F.lower(F.col("specialties")).like("%gynecology%"))),
        10  # Low score for semantic mismatch
    ).when(
        # Generic name with specialties
        F.col("specialties").isNotNull() & (F.trim(F.col("specialties")) != ""),
        30
    ).when(
        # Generic name without specialties
        F.col("specialties").isNull() | (F.trim(F.col("specialties")) == ""),
        20
    ).otherwise(25).alias("semantic_consistency_score"),
    
    # === COMPONENT 2: RECENT ACTIVITY (20 points) ===
    # Engagement & post activity (10 points)
    (F.when((F.col("engagement_metrics_n_followers").isNotNull()) | 
            (F.col("engagement_metrics_n_likes").isNotNull()) |
            (F.col("post_metrics_post_count").isNotNull()), 10)
     .otherwise(0) +
    # Page update recency (10 points) - using expr with try_cast
    F.when(F.col("recency_of_page_update").isNull(), 0)
     .when(F.expr("try_cast(recency_of_page_update as int)") <= 30, 10)
     .when(F.expr("try_cast(recency_of_page_update as int)") <= 90, 8)
     .when(F.expr("try_cast(recency_of_page_update as int)") <= 180, 6)
     .when(F.expr("try_cast(recency_of_page_update as int)") <= 365, 4)
     .when(F.expr("try_cast(recency_of_page_update as int)") <= 730, 2)
     .otherwise(0)).alias("recent_activity_score"),
    
    # === COMPONENT 3: DATA COMPLETENESS (20 points) ===
    (
        F.when((F.col("description").isNotNull()) & (F.trim(F.col("description")) != ""), 4).otherwise(0) +
        F.when((F.col("specialties").isNotNull()) & (F.trim(F.col("specialties")) != ""), 4).otherwise(0) +
        F.when(
            ((F.col("phone_numbers").isNotNull()) & (F.trim(F.col("phone_numbers")) != "")) |
            ((F.col("officialPhone").isNotNull()) & (F.trim(F.col("officialPhone")) != "")) |
            ((F.col("email").isNotNull()) & (F.trim(F.col("email")) != "")) |
            ((F.col("officialWebsite").isNotNull()) & (F.trim(F.col("officialWebsite")) != "")),
            4
        ).otherwise(0) +
        F.when((F.col("latitude").isNotNull()) & (F.col("longitude").isNotNull()), 4).otherwise(0) +
        F.when((F.col("address_city").isNotNull()) & (F.col("address_stateOrRegion").isNotNull()), 4).otherwise(0)
    ).alias("data_completeness_score"),
    
    # === COMPONENT 4: SOURCE QUALITY (10 points) ===
    F.when(F.col("source_types").isNull() | (F.trim(F.col("source_types")) == ""), 0)
     .when(F.size(F.split(F.col("source_types"), ",")) >= 4, 10)
     .when(F.size(F.split(F.col("source_types"), ",")) == 3, 8)
     .when(F.size(F.split(F.col("source_types"), ",")) == 2, 6)
     .when(F.size(F.split(F.col("source_types"), ",")) == 1, 4)
     .otherwise(0).alias("source_quality_score"),
    
    # === COMPONENT 5: HOSPITAL DIRECTORY PRESENCE (10 points) ===
    F.when(F.col("in_hospital_directory") == 1, 10).otherwise(0).alias("hospital_directory_score"),
    
    # === COMPONENT 6: MISMATCH DETECTION (10 points) ===
    (10 -
        # Deduct 3 if name looks like doctor name
        F.when((F.col("name").like("Dr.%")) | (F.col("name").like("Dr %")), 3).otherwise(0) -
        # Deduct 3 if hospital missing doctor count
        F.when(
            F.col("numberDoctors").isNull() & 
            ((F.col("name").like("%Hospital%")) | (F.col("name").like("%Medical Center%")) | (F.col("name").like("%Medical Centre%"))),
            3
        ).otherwise(0) -
        # Deduct 2 if hospital missing capacity
        F.when(F.col("capacity").isNull() & F.col("name").like("%Hospital%"), 2).otherwise(0) -
        # Deduct 2 if clinic/hospital missing specialties
        F.when(
            ((F.col("specialties").isNull()) | (F.trim(F.col("specialties")) == "")) &
            ((F.col("name").like("%Hospital%")) | (F.col("name").like("%Clinic%"))),
            2
        ).otherwise(0)
    ).alias("mismatch_detection_score")
)

# Calculate final accuracy confidence score (0-110)
final_scored = scored_facilities.withColumn(
    "accuracy_confidence",
    (F.col("semantic_consistency_score") +
     F.col("recent_activity_score") +
     F.col("data_completeness_score") +
     F.col("source_quality_score") +
     F.col("hospital_directory_score") +
     F.col("mismatch_detection_score"))
).withColumn(
    "confidence_category",
    F.when(F.col("accuracy_confidence") >= 80, "Very High Confidence (80-100)")
     .when(F.col("accuracy_confidence") >= 60, "High Confidence (60-79)")
     .when(F.col("accuracy_confidence") >= 40, "Medium Confidence (40-59)")
     .when(F.col("accuracy_confidence") >= 20, "Low Confidence (20-39)")
     .otherwise("Very Low Confidence (0-19)")
)

# Create temp view for exploration
print("\nCreating temp view: facilities_with_confidence_score...")
final_scored.createOrReplaceTempView("facilities_with_confidence_score")

print("\n✅ Scoring complete!")
print(f"✅ Temp view created: facilities_with_confidence_score")
print(f"✅ Total facilities scored: {final_scored.count():,}")

# Display sample
print("\n📊 Sample of scored facilities:")
display(final_scored.select(
    "name", "address_city", "address_stateOrRegion",
    "semantic_consistency_score", "recent_activity_score", "data_completeness_score",
    "source_quality_score", "hospital_directory_score", "mismatch_detection_score",
    "accuracy_confidence", "confidence_category"
).orderBy(F.col("accuracy_confidence").desc()).limit(20))

# COMMAND ----------

# DBTITLE 1,Distribution Analysis
# MAGIC %sql
# MAGIC -- Analyze the distribution of accuracy confidence scores across all facilities
# MAGIC
# MAGIC SELECT 
# MAGIC   confidence_category,
# MAGIC   COUNT(*) AS facility_count,
# MAGIC   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage,
# MAGIC   ROUND(AVG(accuracy_confidence), 1) AS avg_score,
# MAGIC   ROUND(MIN(accuracy_confidence), 1) AS min_score,
# MAGIC   ROUND(MAX(accuracy_confidence), 1) AS max_score,
# MAGIC   
# MAGIC   -- Average component scores by category
# MAGIC   ROUND(AVG(semantic_consistency_score), 1) AS avg_semantic,
# MAGIC   ROUND(AVG(recent_activity_score), 1) AS avg_activity,
# MAGIC   ROUND(AVG(data_completeness_score), 1) AS avg_completeness,
# MAGIC   ROUND(AVG(source_quality_score), 1) AS avg_sources,
# MAGIC   ROUND(AVG(hospital_directory_score), 1) AS avg_directory,
# MAGIC   ROUND(AVG(mismatch_detection_score), 1) AS avg_mismatch
# MAGIC   
# MAGIC FROM facilities_with_confidence_score
# MAGIC WHERE accuracy_confidence IS NOT NULL
# MAGIC GROUP BY confidence_category
# MAGIC ORDER BY 
# MAGIC   CASE confidence_category
# MAGIC     WHEN 'Very High Confidence (80-100)' THEN 1
# MAGIC     WHEN 'High Confidence (60-79)' THEN 2
# MAGIC     WHEN 'Medium Confidence (40-59)' THEN 3
# MAGIC     WHEN 'Low Confidence (20-39)' THEN 4
# MAGIC     WHEN 'Very Low Confidence (0-19)' THEN 5
# MAGIC   END

# COMMAND ----------

# DBTITLE 1,Semantic Mismatch Examples
# MAGIC %sql
# MAGIC -- Examples of SEMANTIC MISMATCHES detected by the scoring system
# MAGIC -- These are facilities where the name implies a specialty but specialties don't match
# MAGIC
# MAGIC SELECT 
# MAGIC   name,
# MAGIC   specialties,
# MAGIC   address_city,
# MAGIC   address_stateOrRegion,
# MAGIC   semantic_consistency_score,
# MAGIC   accuracy_confidence,
# MAGIC   
# MAGIC   CASE 
# MAGIC     WHEN lower(name) LIKE '%dental%' OR lower(name) LIKE '%dent%' THEN 'Name implies: Dental'
# MAGIC     WHEN lower(name) LIKE '%eye%' OR lower(name) LIKE '%ophthal%' OR lower(name) LIKE '%netralaya%' THEN 'Name implies: Eye Care'
# MAGIC     WHEN lower(name) LIKE '%ortho%' THEN 'Name implies: Orthopedics'
# MAGIC     WHEN lower(name) LIKE '%cardiac%' OR lower(name) LIKE '%heart%' OR lower(name) LIKE '%cardio%' THEN 'Name implies: Cardiac'
# MAGIC     WHEN lower(name) LIKE '%cancer%' OR lower(name) LIKE '%oncology%' THEN 'Name implies: Cancer/Oncology'
# MAGIC     WHEN lower(name) LIKE '%child%' OR lower(name) LIKE '%pediatric%' THEN 'Name implies: Pediatrics'
# MAGIC     WHEN lower(name) LIKE '%maternity%' OR lower(name) LIKE '%women%' OR lower(name) LIKE '%gynec%' THEN 'Name implies: Maternity/Gynecology'
# MAGIC     ELSE 'Other'
# MAGIC   END AS name_specialty_claim
# MAGIC   
# MAGIC FROM facilities_with_confidence_score
# MAGIC WHERE semantic_consistency_score <= 10  -- Low semantic consistency (mismatch)
# MAGIC   AND (
# MAGIC     lower(name) LIKE '%dental%' OR lower(name) LIKE '%dent%' OR
# MAGIC     lower(name) LIKE '%eye%' OR lower(name) LIKE '%ophthal%' OR lower(name) LIKE '%netralaya%' OR
# MAGIC     lower(name) LIKE '%ortho%' OR
# MAGIC     lower(name) LIKE '%cardiac%' OR lower(name) LIKE '%heart%' OR lower(name) LIKE '%cardio%' OR
# MAGIC     lower(name) LIKE '%cancer%' OR lower(name) LIKE '%oncology%' OR
# MAGIC     lower(name) LIKE '%child%' OR lower(name) LIKE '%pediatric%' OR
# MAGIC     lower(name) LIKE '%maternity%' OR lower(name) LIKE '%women%' OR lower(name) LIKE '%gynec%'
# MAGIC   )
# MAGIC ORDER BY semantic_consistency_score ASC, name
# MAGIC LIMIT 30

# COMMAND ----------

# DBTITLE 1,Lowest Confidence Facilities
# MAGIC %sql
# MAGIC -- View facilities with LOWEST accuracy confidence scores
# MAGIC -- These facilities have significant data quality issues
# MAGIC
# MAGIC SELECT 
# MAGIC   name,
# MAGIC   address_city,
# MAGIC   address_stateOrRegion,
# MAGIC   
# MAGIC   -- Individual component scores (showing where issues exist)
# MAGIC   semantic_consistency_score AS semantic_40,
# MAGIC   recent_activity_score AS activity_20,
# MAGIC   data_completeness_score AS completeness_20,
# MAGIC   source_quality_score AS sources_10,
# MAGIC   hospital_directory_score AS directory_10,
# MAGIC   mismatch_detection_score AS mismatch_10,
# MAGIC   
# MAGIC   -- Final score
# MAGIC   accuracy_confidence,
# MAGIC   confidence_category,
# MAGIC   
# MAGIC   -- Diagnostic fields
# MAGIC   CASE WHEN name LIKE 'Dr.%' OR name LIKE 'Dr %' THEN 'YES' ELSE 'No' END AS looks_like_doctor,
# MAGIC   CASE WHEN specialties IS NULL OR trim(specialties) = '' THEN 'Missing' ELSE 'Present' END AS has_specialties,
# MAGIC   CASE WHEN description IS NULL OR trim(description) = '' THEN 'Missing' ELSE 'Present' END AS has_description
# MAGIC   
# MAGIC FROM facilities_with_confidence_score
# MAGIC WHERE accuracy_confidence IS NOT NULL
# MAGIC ORDER BY accuracy_confidence ASC
# MAGIC LIMIT 30

# COMMAND ----------

# DBTITLE 1,Optional: Save to Permanent Table
# OPTIONAL: Save the scored facilities to a permanent table
# Uncomment the line below to save to a permanent table

spark.table("facilities_with_confidence_score").write.mode("overwrite").saveAsTable("silver.facilities_with_confidence_score")

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from silver.facilities_with_confidence_score limit 10

# COMMAND ----------

# MAGIC %pip install h3

# COMMAND ----------

dbutils.library.restartPython()

# COMMAND ----------

import h3

# COMMAND ----------



# COMMAND ----------

# DBTITLE 1,Add H3 Index to Facilities
from pyspark.sql import functions as F
import h3

# UDF to compute h3 index at resolution 7
@F.udf("string")
def h3_index_7(lat, lon):
    if lat is not None and lon is not None:
        # h3 v4+ uses latlng_to_cell instead of geo_to_h3
        return h3.latlng_to_cell(lat, lon, 7)
    return None

# Add h3 index column and overwrite table
df = spark.table("silver.facilities_with_confidence_score") \
    .withColumn("h3_index_7", h3_index_7(F.col("latitude"), F.col("longitude")))

df.write.mode("overwrite").saveAsTable("silver.facilities_with_confidence_score_and_h3")

# COMMAND ----------

# MAGIC %pip install rasterio
# MAGIC %pip install geopandas
# MAGIC %pip install shapely

# COMMAND ----------

import rasterio
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

# Read raster data
with rasterio.open("/Volumes/workspace/bronze/census_raw/ind_pop_2025_CN_1km_R2025A_UA_v1.tif") as src:
    band = src.read(1)
    rows, cols = band.shape
    transform = src.transform

    # Flatten raster and build DataFrame with coordinates and values
    data = []
    for row in range(rows):
        for col in range(cols):
            value = band[row, col]
            if value is not None:
                lon, lat = rasterio.transform.xy(transform, row, col, offset='center')
                data.append({'latitude': lat, 'longitude': lon, 'population': value})

df = pd.DataFrame(data)
gdf = gpd.GeoDataFrame(df, geometry=[Point(lon, lat) for lon, lat in zip(df['longitude'], df['latitude'])], crs=src.crs)

# Convert to Spark DataFrame and save as Delta table
spark_df = spark.createDataFrame(gdf.drop(columns='geometry'))
spark_df.write.format("delta").mode("overwrite").saveAsTable("bronze.ind_pop_2025_CN_1km")

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT 
# MAGIC   population,
# MAGIC   COUNT(*) AS count
# MAGIC FROM bronze.ind_pop_2025_CN_1km
# MAGIC GROUP BY population
# MAGIC ORDER BY population asc

# COMMAND ----------

# MAGIC %sql
# MAGIC select count(*) from bronze.ind_pop_2025_CN_1km where population < 0

# COMMAND ----------

from pyspark.sql import functions as F
import h3

@F.udf("string")
def h3_index_7(lat, lon):
    if lat is not None and lon is not None:
        return h3.latlng_to_cell(lat, lon, 7)
    return None

df = spark.table("bronze.ind_pop_2025_CN_1km") \
    .withColumn("h3_index_7", h3_index_7(F.col("latitude"), F.col("longitude")))

df.write.mode("overwrite").saveAsTable("bronze.ind_pop_2025_CN_1km_h3")

# COMMAND ----------

from pyspark.sql import functions as F
import h3

df = spark.table("bronze.ind_pop_2025_CN_1km_h3").filter(F.col("population") >= 0)

# UDF to get area of h3 index at resolution 7 (in km^2)
@F.udf("double")
def h3_area_km2(h3_index):
    if h3_index:
        return h3.cell_area(h3_index, unit='km^2')
    return None

# Calculate population sum and area per h3 index
pop_density_by_h3 = df.groupBy("h3_index_7").agg(
    F.sum("population").alias("population_sum")
).withColumn(
    "h3_area_km2", h3_area_km2(F.col("h3_index_7"))
).withColumn(
    "population_density_per_km2",
    F.col("population_sum") / F.col("h3_area_km2")
)

pop_density_by_h3.write.mode("overwrite").saveAsTable("silver.ind_pop_2025_CN_1km_h3_density")

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from silver.ind_pop_2025_CN_1km_h3_density limit 5

# COMMAND ----------

from pyspark.sql import functions as F

facilities = spark.table("silver.facilities_with_confidence_score_and_h3")
pop_density = spark.table("silver.ind_pop_2025_CN_1km_h3_density")

# Join on h3_index_7 to add population_density_per_km2
joined = facilities.join(
    pop_density.select("h3_index_7", "population_density_per_km2"),
    on="h3_index_7",
    how="left"
)

joined.write.mode("overwrite").saveAsTable("silver.facilities_with_confidence_score_and_h3_w_density")

# COMMAND ----------

spark.read.csv("/Workspace/Shared/raw_csv/specialty_mapping.csv", header=True) \
    .write.format("delta").mode("overwrite").saveAsTable("bronze.specialty_to_category_mapping_v2")

# COMMAND ----------

# MAGIC %sql
# MAGIC select count(*) from silver.unique_id_specialty_mapping_w_category

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from bronze.specialty_to_category_mapping_v2 limit 10

# COMMAND ----------

# MAGIC %sql
# MAGIC select count(*) from silver.unique_id_specialty_mapping_w_category where category is null

# COMMAND ----------

# MAGIC %sql
# MAGIC CREATE OR REPLACE TABLE silver.unique_id_specialty_mapping_w_category AS
# MAGIC WITH exploded AS (
# MAGIC   SELECT
# MAGIC     unique_id,
# MAGIC     EXPLODE(cleaned_specialties) AS specialty_exploded
# MAGIC   FROM bronze.unique_id_specialty_mapping
# MAGIC )
# MAGIC SELECT
# MAGIC   e.unique_id,
# MAGIC   e.specialty_exploded AS specialty,
# MAGIC   b.category
# MAGIC FROM exploded e
# MAGIC LEFT JOIN bronze.specialty_to_category_mapping_v2 b
# MAGIC   ON lower(e.specialty_exploded) = lower(b.specialty_clean
# MAGIC )

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from workspace.default.virtue_foundation_cleaned_specialties where specialty ilike '%gynecology%'

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from silver.unique_id_specialty_mapping_w_category

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from silver.unique_id_specialty_mapping_w_category limit 5

# COMMAND ----------

# MAGIC %sql
# MAGIC select unique_id, h3_index_7, population_density_per_km2 from silver.facilities_with_confidence_score_and_h3_w_density limit 5

# COMMAND ----------

# MAGIC %sql
# MAGIC create or replace table silver.facilities_with_confidence_score_and_h3_w_density_and_category
# MAGIC as
# MAGIC (
# MAGIC     select a.*, b.h3_index_7, b.population_density_per_km2 from silver.unique_id_specialty_mapping_w_category a left join 
# MAGIC     (
# MAGIC     select unique_id, h3_index_7, population_density_per_km2 from silver.facilities_with_confidence_score_and_h3_w_density
# MAGIC     ) b
# MAGIC     on a.unique_id=b.unique_id
# MAGIC )

# COMMAND ----------

# DBTITLE 1,Cell 31
from pyspark.sql import functions as F

# Load the table with hospital and category info
facilities = spark.table("silver.facilities_with_confidence_score_and_h3_w_density_and_category")

# Aggregate: unique hospitals per h3 index
hospitals_per_h3 = facilities.groupBy("h3_index_7").agg(
    F.countDistinct("unique_id").alias("unique_hospital_count"),
    F.first("population_density_per_km2").alias("population_density_per_km2")
)

# Calculate ratio of hospitals to population density (handle division by zero)
result = hospitals_per_h3.withColumn(
    "hospital_to_population_density_ratio",
    F.when(
        (F.col("population_density_per_km2").isNull()) | 
        (F.col("population_density_per_km2") == 0),
        None
    ).otherwise(
        F.col("unique_hospital_count") / F.col("population_density_per_km2")
    )
)

# Filter out nulls and infinities before computing mean/stddev for z-score normalization
valid_ratios = result.filter(
    F.col("hospital_to_population_density_ratio").isNotNull() &
    ~F.isnan(F.col("hospital_to_population_density_ratio")) &
    (F.col("hospital_to_population_density_ratio") != float('inf')) &
    (F.col("hospital_to_population_density_ratio") != float('-inf'))
)

# Compute mean and standard deviation for z-score normalization
stats = valid_ratios.agg(
    F.mean("hospital_to_population_density_ratio").alias("mean_ratio"),
    F.stddev("hospital_to_population_density_ratio").alias("stddev_ratio")
).collect()[0]
mean_ratio = stats["mean_ratio"]
stddev_ratio = stats["stddev_ratio"]

print(f"Mean ratio: {mean_ratio}")
print(f"Std dev ratio: {stddev_ratio}")

# Add normalized column using z-score standardization, then map to [0, 1]
if mean_ratio is not None and stddev_ratio is not None and stddev_ratio > 0:
    result = result.withColumn(
        "normalized_hosp_pop_ratio",
        F.when(
            F.col("hospital_to_population_density_ratio").isNull(),
            None
        ).otherwise(
            # Z-score normalization: (value - mean) / stddev
            # Then map to [0,1] assuming ±3 sigma range: (z_score + 3) / 6
            # Clip to [0, 1] for extreme outliers
            F.greatest(
                F.lit(0.0),
                F.least(
                    F.lit(1.0),
                    (
                        ((F.col("hospital_to_population_density_ratio") - F.lit(mean_ratio)) / F.lit(stddev_ratio)) 
                        + F.lit(3.0)
                    ) / F.lit(6.0)
                )
            )
        )
    )
else:
    # Edge case: all values are the same or no valid values
    print("Warning: Cannot normalize - standard deviation is zero or no valid values found")
    result = result.withColumn("normalized_hosp_pop_ratio", F.lit(0.5))

result.write.option('mergeSchema',True).mode("overwrite").saveAsTable("gold.hospitals_per_h3_and_density_ratio")

# COMMAND ----------

# DBTITLE 1,Hospital Density by H3 and Category
from pyspark.sql import functions as F

# Load the table with hospital and category info
facilities = spark.table("silver.facilities_with_confidence_score_and_h3_w_density_and_category")

# Aggregate: unique hospitals per h3 index AND category
hospitals_per_h3_category = facilities.groupBy("h3_index_7", "category").agg(
    F.countDistinct("unique_id").alias("unique_hospital_count"),
    F.first("population_density_per_km2").alias("population_density_per_km2")
)

# Calculate ratio of hospitals to population density (handle division by zero)
result = hospitals_per_h3_category.withColumn(
    "hospital_to_population_density_ratio",
    F.when(
        (F.col("population_density_per_km2").isNull()) | 
        (F.col("population_density_per_km2") == 0),
        None
    ).otherwise(
        F.col("unique_hospital_count") / F.col("population_density_per_km2")
    )
)

# Filter out nulls and infinities before computing mean/stddev for z-score normalization
valid_ratios = result.filter(
    F.col("hospital_to_population_density_ratio").isNotNull() &
    ~F.isnan(F.col("hospital_to_population_density_ratio")) &
    (F.col("hospital_to_population_density_ratio") != float('inf')) &
    (F.col("hospital_to_population_density_ratio") != float('-inf'))
)

# Compute mean and standard deviation for z-score normalization
stats = valid_ratios.agg(
    F.mean("hospital_to_population_density_ratio").alias("mean_ratio"),
    F.stddev("hospital_to_population_density_ratio").alias("stddev_ratio")
).collect()[0]
mean_ratio = stats["mean_ratio"]
stddev_ratio = stats["stddev_ratio"]

print(f"Mean ratio: {mean_ratio}")
print(f"Std dev ratio: {stddev_ratio}")

# Add normalized column using z-score standardization, then map to [0, 1]
if mean_ratio is not None and stddev_ratio is not None and stddev_ratio > 0:
    result = result.withColumn(
        "normalized_hosp_pop_ratio",
        F.when(
            F.col("hospital_to_population_density_ratio").isNull(),
            None
        ).otherwise(
            # Z-score normalization: (value - mean) / stddev
            # Then map to [0,1] assuming ±3 sigma range: (z_score + 3) / 6
            # Clip to [0, 1] for extreme outliers
            F.greatest(
                F.lit(0.0),
                F.least(
                    F.lit(1.0),
                    (
                        ((F.col("hospital_to_population_density_ratio") - F.lit(mean_ratio)) / F.lit(stddev_ratio)) 
                        + F.lit(3.0)
                    ) / F.lit(6.0)
                )
            )
        )
    )
else:
    # Edge case: all values are the same or no valid values
    print("Warning: Cannot normalize - standard deviation is zero or no valid values found")
    result = result.withColumn("normalized_hosp_pop_ratio", F.lit(0.5))

result.write.option('mergeSchema',True).mode("overwrite").saveAsTable("gold.hospitals_per_h3_and_category_density_ratio")

print(f"\n✅ Table created: gold.hospitals_per_h3_and_category_density_ratio")
print(f"Total records: {result.count():,}")

# COMMAND ----------

# DBTITLE 1,Add WHO Benchmarks to H3 Table
from pyspark.sql import functions as F
import h3

# Load the table
df = spark.table("gold.hospitals_per_h3_and_density_ratio")

# UDF to get H3 cell area in km²
@F.udf("double")
def get_h3_area_km2(h3_index):
    if h3_index:
        return h3.cell_area(h3_index, unit='km^2')
    return None

# Add WHO benchmark calculations
result = df.withColumn(
    "h3_area_km2", get_h3_area_km2(F.col("h3_index_7"))
).withColumn(
    # Estimated total population in the H3 cell
    "estimated_population",
    F.col("population_density_per_km2") * F.col("h3_area_km2")
).withColumn(
    # WHO Conservative: 1 hospital per 50,000 people
    "who_recommended_hospitals_conservative",
    F.col("estimated_population") / 50000.0
).withColumn(
    # WHO Liberal: 1 hospital per 100,000 people
    "who_recommended_hospitals_liberal",
    F.col("estimated_population") / 100000.0
).withColumn(
    # Gap from WHO conservative standard
    "gap_from_who_conservative",
    F.col("unique_hospital_count") - F.col("who_recommended_hospitals_conservative")
).withColumn(
    # Gap from WHO liberal standard
    "gap_from_who_liberal",
    F.col("unique_hospital_count") - F.col("who_recommended_hospitals_liberal")
).withColumn(
    # Percentage of WHO conservative standard met (capped at 200%)
    "pct_of_who_conservative",
    F.least(
        F.lit(2.0),
        F.when(
            F.col("who_recommended_hospitals_conservative") > 0,
            F.col("unique_hospital_count") / F.col("who_recommended_hospitals_conservative")
        ).otherwise(None)
    )
).withColumn(
    # Percentage of WHO liberal standard met (capped at 200%)
    "pct_of_who_liberal",
    F.least(
        F.lit(2.0),
        F.when(
            F.col("who_recommended_hospitals_liberal") > 0,
            F.col("unique_hospital_count") / F.col("who_recommended_hospitals_liberal")
        ).otherwise(None)
    )
).withColumn(
    # WHO adequacy category (based on conservative standard)
    "who_adequacy_category",
    F.when(F.col("pct_of_who_conservative") >= 1.0, "Meets WHO Standard")
     .when(F.col("pct_of_who_conservative") >= 0.5, "Below WHO Standard")
     .when(F.col("pct_of_who_conservative") >= 0.25, "Severe Shortage")
     .otherwise("Critical Shortage")
)

result.write.mode("overwrite").saveAsTable("gold.hospitals_per_h3_with_who_benchmarks")

print(f"✅ Table created: gold.hospitals_per_h3_with_who_benchmarks")
print(f"Total records: {result.count():,}")

# Show distribution by WHO adequacy
print("\n📊 Distribution by WHO Adequacy:")
result.groupBy("who_adequacy_category").agg(
    F.count("*").alias("h3_cell_count")
).orderBy(F.desc("h3_cell_count")).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Add WHO Benchmarks to H3 + Category Table
from pyspark.sql import functions as F
import h3

# Load the table
df = spark.table("gold.hospitals_per_h3_and_category_density_ratio")

# UDF to get H3 cell area in km²
@F.udf("double")
def get_h3_area_km2(h3_index):
    if h3_index:
        return h3.cell_area(h3_index, unit='km^2')
    return None

# Note: For category-specific benchmarks, we assume each specialty should serve proportionally
# For example, if there are 10 major specialties, each should have ~1/10 of total hospitals
# WHO standard: 1 hospital per 50,000 people
# For a specialty-specific benchmark, we'll use a more conservative ratio
# Assuming 15 major categories, each should serve ~1 hospital per 750,000 people (50k * 15)

# Add WHO benchmark calculations
result = df.withColumn(
    "h3_area_km2", get_h3_area_km2(F.col("h3_index_7"))
).withColumn(
    # Estimated total population in the H3 cell
    "estimated_population",
    F.col("population_density_per_km2") * F.col("h3_area_km2")
).withColumn(
    # WHO for specialty: 1 facility per 250,000 people (conservative for specialty)
    "who_recommended_specialty_facilities",
    F.col("estimated_population") / 250000.0
).withColumn(
    # Gap from WHO specialty standard
    "gap_from_who_specialty",
    F.col("unique_hospital_count") - F.col("who_recommended_specialty_facilities")
).withColumn(
    # Percentage of WHO specialty standard met (capped at 200%)
    "pct_of_who_specialty",
    F.least(
        F.lit(2.0),
        F.when(
            F.col("who_recommended_specialty_facilities") > 0,
            F.col("unique_hospital_count") / F.col("who_recommended_specialty_facilities")
        ).otherwise(None)
    )
).withColumn(
    # WHO adequacy category for specialty
    "who_specialty_adequacy",
    F.when(F.col("pct_of_who_specialty") >= 1.0, "Meets Specialty Standard")
     .when(F.col("pct_of_who_specialty") >= 0.5, "Below Specialty Standard")
     .when(F.col("pct_of_who_specialty") >= 0.25, "Severe Specialty Shortage")
     .otherwise("Critical Specialty Shortage")
)

result.write.mode("overwrite").saveAsTable("gold.hospitals_per_h3_category_with_who_benchmarks")

print(f"✅ Table created: gold.hospitals_per_h3_category_with_who_benchmarks")
print(f"Total records: {result.count():,}")



# COMMAND ----------

# MAGIC %sql
# MAGIC select * from gold.hospitals_per_h3_category_with_who_benchmarks limit 10

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT
# MAGIC   population_density_per_km2,
# MAGIC   COUNT(*) AS count
# MAGIC FROM silver.facilities_with_confidence_score_and_h3_w_density
# MAGIC GROUP BY population_density_per_km2
# MAGIC ORDER BY population_density_per_km2

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from gold.hospitals_per_h3_and_category_density_ratio

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from gold.hospitals_per_h3_and_density_ratio

# COMMAND ----------

from pyspark.sql import functions as F

facilities = spark.table("silver.facilities_with_confidence_score_and_h3_w_density")
specialties = spark.table("silver.unique_id_specialty_mapping_w_category")

# Join on specialties field to add category
joined = facilities.join(
    specialties.select("specialty", "category"),
    facilities.unique_id == specialties.unique_id,
    how="left"
)

joined.write.mode("overwrite").saveAsTable("silver.facilities_with_confidence_score_and_h3_w_density_with_category")

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from silver.facilities_with_confidence_score_and_h3_w_density_with_category limit 5

# COMMAND ----------

H3_index, hospital_density, population_density, score/hosp_pop_ratio, types_of_service, score/hosp_pop_ratio_by_service




