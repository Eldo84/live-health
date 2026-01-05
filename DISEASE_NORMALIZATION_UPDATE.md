# Disease Name Normalization - Updated to Match Official Format

## Update Summary
The disease name normalizer has been updated to match the official canonical format specification provided.

## Key Changes

### Updated Canonical Names
1. **Obesity** - Changed from "Obesity (BMI ≥30)" to "Obesity"
2. **Liver Cancer** - Changed to "Liver Cancer (NAFLD, Cirrhosis-related HCC)" to match specification
3. **Anemia** - Changed to "Anemia (Iron-deficiency anemia)" to match exact format
4. **Hepatitis B & C** - Combined entry per specification (individual entries remain in data if present)
5. **STIs** - Updated to "STIs (e.g., Syphilis, Gonorrhea, HPV)" format
6. **Alzheimer's Disease / Dementia** - Added as combined canonical name
7. **Rheumatoid Arthritis / Inflammatory Arthritis** - Added as combined canonical name
8. **Schizophrenia / Psychotic Disorders** - Added as combined canonical name
9. **Preeclampsia / Eclampsia** - Added as combined canonical name

### New Mappings Added
- Natural Disaster-related Injuries
- Conflict-Related Injuries
- Pesticide-Related Illnesses
- Heat-Related Illnesses

## Canonical Format Structure

The normalizer now follows this structure:

### Cardiovascular and Metabolic Disorders
- Diabetes (Type 2)
- Hypertension
- Cardiovascular Disease (CVD)
- Stroke
- Hyperlipidemia
- Obesity
- Metabolic Syndrome

### Cancers
- Lung Cancer
- Breast Cancer
- Colorectal Cancer
- Prostate Cancer
- Cervical Cancer
- Pancreatic Cancer
- Liver Cancer (NAFLD, Cirrhosis-related HCC)
- Thyroid Cancer

### Respiratory Diseases
- COPD
- Asthma
- Sleep Apnea

### Neurological Disorders
- Alzheimer's Disease / Dementia
- Parkinson's Disease
- Epilepsy
- Multiple Sclerosis (MS)
- Developmental Disorders (e.g., Cerebral Palsy)
- Autism Spectrum Disorder (ASD)

### Musculoskeletal Disorders
- Osteoporosis
- Rheumatoid Arthritis / Inflammatory Arthritis
- Low Back Pain

### Mental and Behavioral Disorders
- Depression
- Anxiety Disorders
- Schizophrenia / Psychotic Disorders
- Eating Disorders
- Substance Use Disorders
- Gambling Disorder
- Sleep Disorders

### Endocrine and Hematologic Disorders
- Thyroid Disorders
- Anemia (Iron-deficiency anemia)

### High-Burden Infectious Diseases
- Tuberculosis (TB)
- HIV/AIDS
- Hepatitis B & C
- Malaria
- COVID-19
- Influenza
- Dengue Fever
- Measles
- Zika Virus
- Cholera
- Ebola / Marburg Virus
- STIs (e.g., Syphilis, Gonorrhea, HPV)
- Leprosy (Hansen's Disease)

### Neglected Tropical Diseases
- Schistosomiasis
- Chagas Disease
- Lymphatic Filariasis
- Onchocerciasis
- Leishmaniasis
- Soil-transmitted helminths

### Injuries & Trauma
- Road Traffic Accidents (MVA)
- Falls
- Firearm-related Injuries
- Burns
- Drowning
- Occupational Injuries
- Natural Disaster-related Injuries
- Conflict-Related Injuries

### Violence & Self-Harm
- Suicide
- Domestic Violence
- Child Abuse
- Gender-Based Violence (GBV)

### Maternal, Neonatal, and Child Health
- Maternal Mortality
- Postpartum Hemorrhage
- Preeclampsia / Eclampsia
- Preterm Birth
- Neonatal Sepsis
- Low Birth Weight
- Congenital Anomalies

### Environmental & Occupational Health
- Lead Poisoning
- Heavy Metal Toxicity
- Pesticide-Related Illnesses
- Occupational Lung Diseases
- Heat-Related Illnesses
- Radiation Exposure Disorders

### Sensory Disorders
- Hearing Loss
- Glaucoma
- Age-related Macular Degeneration (AMD)
- Cataracts

## Result
All disease name variations in the JSON data files now map to these canonical forms, ensuring consistency across the Global Health Index dashboard.
