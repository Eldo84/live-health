// OutbreakNow symptom → syndrome → disease knowledge base.
//
// A deterministic, client-side clinical-decision-support layer for the Add Alert
// flow. The reporter selects observed symptoms; `predict()` classifies them into
// syndromes (rule-based, weighted) and ranks the most probable diseases. Disease
// names are pinned to the exact strings in public.diseases so a prediction can be
// resolved back to a disease_id when the alert is submitted.
//
// This is a population-surveillance triage aid, NOT a diagnostic tool.

export interface Symptom {
  id: string;
  label: string;
}

export interface SymptomGroup {
  id: string;
  label: string;
  symptoms: Symptom[];
}

// Canonical symptom catalog (spec groups A–J). The `id`s are the stable contract
// shared by the picker, the scorer, and the persisted user_alert_submissions.symptoms.
export const SYMPTOM_GROUPS: SymptomGroup[] = [
  {
    id: "fever",
    label: "Fever & general",
    symptoms: [
      { id: "high-fever", label: "High fever" },
      { id: "chills", label: "Chills" },
      { id: "night-sweats", label: "Night sweats" },
      { id: "fatigue", label: "Fatigue" },
      { id: "body-aches", label: "Body aches" },
      { id: "weakness", label: "Weakness" },
      { id: "malaise", label: "Malaise" },
    ],
  },
  {
    id: "respiratory",
    label: "Respiratory",
    symptoms: [
      { id: "cough", label: "Cough (dry or productive)" },
      { id: "dyspnea", label: "Shortness of breath" },
      { id: "wheezing", label: "Wheezing" },
      { id: "chest-pain", label: "Chest pain" },
      { id: "sore-throat", label: "Sore throat" },
      { id: "runny-nose", label: "Runny nose" },
      { id: "sneezing", label: "Sneezing" },
      { id: "anosmia", label: "Loss of smell" },
      { id: "ageusia", label: "Loss of taste" },
    ],
  },
  {
    id: "gastrointestinal",
    label: "Gastrointestinal",
    symptoms: [
      { id: "nausea", label: "Nausea" },
      { id: "vomiting", label: "Vomiting" },
      { id: "diarrhea", label: "Diarrhea (watery)" },
      { id: "bloody-diarrhea", label: "Diarrhea (bloody)" },
      { id: "abdominal-pain", label: "Abdominal pain / cramps" },
      { id: "loss-of-appetite", label: "Loss of appetite" },
    ],
  },
  {
    id: "neurological",
    label: "Neurological",
    symptoms: [
      { id: "headache", label: "Headache" },
      { id: "confusion", label: "Confusion" },
      { id: "seizures", label: "Seizures" },
      { id: "stiff-neck", label: "Stiff neck" },
      { id: "dizziness", label: "Dizziness" },
      { id: "altered-mental-status", label: "Altered mental status" },
    ],
  },
  {
    id: "skin",
    label: "Skin & mucosal",
    symptoms: [
      { id: "rash", label: "Rash" },
      { id: "skin-ulcers", label: "Skin ulcers or lesions" },
      { id: "bruising-purpura", label: "Bruising or purpura" },
      { id: "jaundice", label: "Jaundice" },
      { id: "swollen-lymph-nodes", label: "Swollen lymph nodes" },
    ],
  },
  {
    id: "hemorrhagic",
    label: "Hemorrhagic",
    symptoms: [
      { id: "nosebleeds", label: "Nosebleeds" },
      { id: "bleeding-gums", label: "Bleeding gums" },
      { id: "bloody-stool", label: "Bloody stool" },
      { id: "hematuria", label: "Blood in urine" },
      { id: "hemoptysis", label: "Coughing blood" },
      { id: "internal-bleeding-shock", label: "Internal bleeding / shock" },
    ],
  },
  {
    id: "musculoskeletal",
    label: "Musculoskeletal",
    symptoms: [
      { id: "joint-pain", label: "Joint pain" },
      { id: "muscle-pain", label: "Muscle pain" },
      { id: "swollen-joints", label: "Swollen joints" },
    ],
  },
  {
    id: "ocular",
    label: "Ocular",
    symptoms: [
      { id: "red-eyes", label: "Red eyes" },
      { id: "blurred-vision", label: "Blurred vision" },
      { id: "eye-pain", label: "Eye pain" },
    ],
  },
  {
    id: "genitourinary",
    label: "Genitourinary",
    symptoms: [
      { id: "dysuria", label: "Painful urination" },
      { id: "genital-ulcers", label: "Genital ulcers" },
      { id: "unusual-discharge", label: "Unusual discharge" },
    ],
  },
  {
    id: "paralytic",
    label: "Paralytic",
    symptoms: [
      { id: "paralysis", label: "Paralysis" },
      { id: "respiratory-difficulty", label: "Respiratory difficulty" },
      { id: "reflex-loss", label: "Loss of reflexes" },
    ],
  },
];

// Flat lookup: symptom id → human label (for chips / summaries).
export const SYMPTOM_LABELS: Record<string, string> = Object.fromEntries(
  SYMPTOM_GROUPS.flatMap((g) => g.symptoms.map((s) => [s.id, s.label]))
);

export interface SyndromeTrigger {
  symptomId: string;
  /** 3 = hallmark / near-required, 2 = characteristic, 1 = supportive. */
  weight: number;
}

export interface SyndromeDisease {
  /** EXACT name from public.diseases. */
  name: string;
  /** 0.1–1.0 likelihood this disease explains the syndrome. */
  weight: number;
}

export interface Syndrome {
  id: string;
  label: string;
  /** Summed trigger weight at/above which the syndrome is flagged. */
  minScore: number;
  triggers: SyndromeTrigger[];
  diseases: SyndromeDisease[];
}

// Syndromes whose presence implies an elevated severity floor for the alert —
// but only when matched strongly (see STRONG_MATCH below), since a few shared
// generic symptoms (fever, rash) can otherwise nudge one of these over minScore.
const HIGH_RISK_SYNDROMES = new Set([
  "hemorrhagic-fever",
  "septicemic",
  "encephalitic",
  "neurological",
  "paralytic",
]);

// Red-flag symptoms that, if reported at all, justify a high-risk classification
// regardless of which syndromes cleared their threshold.
const ALARM_SYMPTOMS = new Set([
  "internal-bleeding-shock",
  "bruising-purpura",
  "nosebleeds",
  "bleeding-gums",
  "bloody-stool",
  "hematuria",
  "hemoptysis",
  "seizures",
  "altered-mental-status",
  "stiff-neck",
  "paralysis",
]);

// A high-risk syndrome only escalates risk when its matched strength reaches this.
const STRONG_MATCH = 0.5;

// ─── SYNDROME DEFINITIONS ───────────────────────────────────────────────────
// Authored + verified against the live disease list (symptom-syndrome-kb workflow).
// Disease names are EXACT public.diseases strings so predictions resolve to disease_id.
export const SYNDROMES: Syndrome[] = [
  {
    id: "hemorrhagic-fever",
    label: "Hemorrhagic Fever Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "high-fever", weight: 2 },
      { symptomId: "internal-bleeding-shock", weight: 3 },
      { symptomId: "bruising-purpura", weight: 3 },
      { symptomId: "nosebleeds", weight: 2 },
      { symptomId: "bleeding-gums", weight: 2 },
      { symptomId: "bloody-stool", weight: 2 },
      { symptomId: "hematuria", weight: 2 },
      { symptomId: "hemoptysis", weight: 2 },
      { symptomId: "bloody-diarrhea", weight: 1 },
      { symptomId: "vomiting", weight: 1 },
      { symptomId: "red-eyes", weight: 1 },
      { symptomId: "headache", weight: 1 },
      { symptomId: "body-aches", weight: 1 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "jaundice", weight: 1 },
      { symptomId: "rash", weight: 1 },
    ],
    diseases: [
      { name: "Ebola/Marburg hemorrhagic fever", weight: 1 },
      { name: "Crimean-Congo Hemorrhagic Fever", weight: 0.95 },
      { name: "Lassa Fever", weight: 0.85 },
      { name: "Marburg Virus Disease", weight: 0.85 },
      { name: "Dengue", weight: 0.8 },
      { name: "Yellow fever", weight: 0.75 },
      { name: "Rift Valley Fever", weight: 0.6 },
      { name: "Leptospirosis, Weil disease", weight: 0.45 },
      { name: "Plague (Bubonic, Pneumonic, Septicemic)", weight: 0.4 },
      { name: "Meningococcemia, Meningitis, Waterhouse-Friderichsen syndrome", weight: 0.4 },
    ],
  },
  {
    id: "respiratory-distress",
    label: "Respiratory Distress Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "cough", weight: 3 },
      { symptomId: "dyspnea", weight: 3 },
      { symptomId: "respiratory-difficulty", weight: 3 },
      { symptomId: "high-fever", weight: 2 },
      { symptomId: "chest-pain", weight: 2 },
      { symptomId: "wheezing", weight: 2 },
      { symptomId: "hemoptysis", weight: 2 },
      { symptomId: "sore-throat", weight: 1 },
      { symptomId: "runny-nose", weight: 1 },
      { symptomId: "chills", weight: 1 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "body-aches", weight: 1 },
    ],
    diseases: [
      { name: "COVID-19", weight: 1 },
      { name: "Influenza (Seasonal, H1N1, H5N1)", weight: 0.9 },
      { name: "Atypical pneumonia", weight: 0.8 },
      { name: "Respiratory Syncytial Virus (RSV)", weight: 0.8 },
      { name: "Tuberculosis (TB)", weight: 0.7 },
      { name: "MERS (Middle East Respiratory Syndrome)", weight: 0.7 },
      { name: "Avian Influenza (Bird Flu)", weight: 0.6 },
      { name: "Legionnaires' Disease, Pontiac Fever", weight: 0.6 },
      { name: "Hantavirus Pulmonary Syndrome", weight: 0.5 },
      { name: "Whooping Cough (Pertussis)", weight: 0.5 },
    ],
  },
  {
    id: "neurological",
    label: "Neurological Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "stiff-neck", weight: 3 },
      { symptomId: "seizures", weight: 3 },
      { symptomId: "confusion", weight: 3 },
      { symptomId: "altered-mental-status", weight: 3 },
      { symptomId: "headache", weight: 2 },
      { symptomId: "high-fever", weight: 2 },
      { symptomId: "paralysis", weight: 2 },
      { symptomId: "reflex-loss", weight: 2 },
      { symptomId: "dizziness", weight: 1 },
      { symptomId: "vomiting", weight: 1 },
      { symptomId: "weakness", weight: 1 },
      { symptomId: "blurred-vision", weight: 1 },
    ],
    diseases: [
      { name: "Meningococcal Disease", weight: 1 },
      { name: "Japanese Encephalitis", weight: 0.9 },
      { name: "Rabies", weight: 0.9 },
      { name: "Nipah Virus Encephalitis", weight: 0.85 },
      { name: "West Nile virus infection", weight: 0.8 },
      { name: "Aseptic meningitis (Echovirus)", weight: 0.75 },
      { name: "Tetanus (lockjaw, risus sardonicus, spastic paralysis)", weight: 0.65 },
      { name: "Naegleria fowleri Infection", weight: 0.6 },
      { name: "Venezuelan Equine Encephalomyelitis", weight: 0.55 },
      { name: "Creutzfeldt-Jakob Disease (CJD)", weight: 0.4 },
    ],
  },
  {
    id: "gastrointestinal",
    label: "Gastrointestinal Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "diarrhea", weight: 3 },
      { symptomId: "vomiting", weight: 3 },
      { symptomId: "abdominal-pain", weight: 2 },
      { symptomId: "nausea", weight: 2 },
      { symptomId: "bloody-diarrhea", weight: 2 },
      { symptomId: "bloody-stool", weight: 2 },
      { symptomId: "loss-of-appetite", weight: 1 },
      { symptomId: "high-fever", weight: 1 },
      { symptomId: "weakness", weight: 1 },
      { symptomId: "malaise", weight: 1 },
    ],
    diseases: [
      { name: "Cholera", weight: 1 },
      { name: "Norovirus Infection", weight: 0.9 },
      { name: "Rotavirus Infection", weight: 0.85 },
      { name: "Shigellosis", weight: 0.8 },
      { name: "Campylobacteriosis", weight: 0.8 },
      { name: "Typhoid Fever", weight: 0.75 },
      { name: "Giardiasis", weight: 0.7 },
      { name: "Cryptosporidiosis", weight: 0.65 },
      { name: "Amebiasis", weight: 0.65 },
      { name: "E. coli Infections (various strains)", weight: 0.7 },
    ],
  },
  {
    id: "rash-fever",
    label: "Rash & Fever Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "rash", weight: 3 },
      { symptomId: "high-fever", weight: 3 },
      { symptomId: "headache", weight: 1 },
      { symptomId: "body-aches", weight: 1 },
      { symptomId: "joint-pain", weight: 1 },
      { symptomId: "swollen-lymph-nodes", weight: 1 },
      { symptomId: "red-eyes", weight: 1 },
      { symptomId: "sore-throat", weight: 1 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "malaise", weight: 1 },
    ],
    diseases: [
      { name: "Measles", weight: 1 },
      { name: "Rubella", weight: 0.9 },
      { name: "Varicella (chickenpox)", weight: 0.9 },
      { name: "Dengue", weight: 0.85 },
      { name: "Chikungunya", weight: 0.75 },
      { name: "Zika virus disease", weight: 0.7 },
      { name: "Fifth disease (erythema infectiosum)", weight: 0.65 },
      { name: "Rocky Mountain spotted fever", weight: 0.65 },
      { name: "Meningococcal Disease", weight: 0.6 },
      { name: "Hand, foot, and mouth disease", weight: 0.55 },
    ],
  },
  {
    id: "encephalitic",
    label: "Encephalitic Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "altered-mental-status", weight: 3 },
      { symptomId: "confusion", weight: 3 },
      { symptomId: "high-fever", weight: 2 },
      { symptomId: "seizures", weight: 2 },
      { symptomId: "stiff-neck", weight: 2 },
      { symptomId: "headache", weight: 1 },
      { symptomId: "paralysis", weight: 1 },
      { symptomId: "dizziness", weight: 1 },
      { symptomId: "weakness", weight: 1 },
      { symptomId: "vomiting", weight: 1 },
    ],
    diseases: [
      { name: "Japanese Encephalitis", weight: 1 },
      { name: "West Nile virus infection", weight: 0.9 },
      { name: "Rabies", weight: 0.85 },
      { name: "Nipah Virus Encephalitis", weight: 0.8 },
      { name: "Venezuelan Equine Encephalomyelitis", weight: 0.75 },
      { name: "Naegleria fowleri Infection", weight: 0.7 },
      { name: "Meningococcal Disease", weight: 0.65 },
      { name: "Malaria", weight: 0.6 },
      { name: "Rapidly fatal meningoencephalitis", weight: 0.6 },
      { name: "Toxoplasmosis", weight: 0.5 },
    ],
  },
  {
    id: "septicemic",
    label: "Septicemic Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "high-fever", weight: 3 },
      { symptomId: "altered-mental-status", weight: 3 },
      { symptomId: "confusion", weight: 2 },
      { symptomId: "chills", weight: 2 },
      { symptomId: "bruising-purpura", weight: 2 },
      { symptomId: "internal-bleeding-shock", weight: 2 },
      { symptomId: "dizziness", weight: 1 },
      { symptomId: "weakness", weight: 1 },
      { symptomId: "malaise", weight: 1 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "rash", weight: 1 },
      { symptomId: "dyspnea", weight: 1 },
      { symptomId: "body-aches", weight: 1 },
    ],
    diseases: [
      { name: "Meningococcemia, Meningitis, Waterhouse-Friderichsen syndrome", weight: 1 },
      { name: "Plague (Bubonic, Pneumonic, Septicemic)", weight: 0.9 },
      { name: "Meningococcal Disease", weight: 0.85 },
      { name: "Methicillin-Resistant Staphylococcus aureus (MRSA)", weight: 0.7 },
      { name: "Tularemia", weight: 0.6 },
      { name: "Leptospirosis, Weil disease", weight: 0.55 },
      { name: "Typhoid Fever", weight: 0.55 },
      { name: "Malaria", weight: 0.5 },
      { name: "Cutaneous anthrax (black eschar), Pulmonary anthrax", weight: 0.45 },
      { name: "Klebsiella Pneumonia", weight: 0.4 },
    ],
  },
  {
    id: "zoonotic",
    label: "Zoonotic Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "high-fever", weight: 3 },
      { symptomId: "chills", weight: 2 },
      { symptomId: "night-sweats", weight: 2 },
      { symptomId: "headache", weight: 1 },
      { symptomId: "body-aches", weight: 2 },
      { symptomId: "muscle-pain", weight: 2 },
      { symptomId: "joint-pain", weight: 2 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "malaise", weight: 1 },
      { symptomId: "weakness", weight: 1 },
      { symptomId: "swollen-lymph-nodes", weight: 2 },
      { symptomId: "skin-ulcers", weight: 2 },
      { symptomId: "loss-of-appetite", weight: 1 },
      { symptomId: "jaundice", weight: 1 },
      { symptomId: "cough", weight: 1 },
      { symptomId: "nausea", weight: 1 },
    ],
    diseases: [
      { name: "Brucellosis", weight: 0.95 },
      { name: "Q fever", weight: 0.9 },
      { name: "Leptospirosis, Weil disease", weight: 0.9 },
      { name: "Tularemia", weight: 0.85 },
      { name: "Plague (Bubonic, Pneumonic, Septicemic)", weight: 0.8 },
      { name: "Rift Valley Fever", weight: 0.7 },
      { name: "Anaplasmosis", weight: 0.6 },
      { name: "Ehrlichiosis", weight: 0.6 },
      { name: "Rabies", weight: 0.55 },
      { name: "Psittacosis (Parrot Fever)", weight: 0.5 },
    ],
  },
  {
    id: "vector-borne-febrile",
    label: "Vector-Borne Febrile Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "high-fever", weight: 3 },
      { symptomId: "joint-pain", weight: 3 },
      { symptomId: "muscle-pain", weight: 2 },
      { symptomId: "body-aches", weight: 2 },
      { symptomId: "headache", weight: 2 },
      { symptomId: "rash", weight: 2 },
      { symptomId: "chills", weight: 1 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "swollen-joints", weight: 1 },
      { symptomId: "red-eyes", weight: 1 },
      { symptomId: "eye-pain", weight: 1 },
      { symptomId: "nausea", weight: 1 },
      { symptomId: "swollen-lymph-nodes", weight: 1 },
    ],
    diseases: [
      { name: "Dengue", weight: 1 },
      { name: "Chikungunya", weight: 1 },
      { name: "Zika virus disease", weight: 0.8 },
      { name: "Malaria", weight: 0.8 },
      { name: "West Nile Fever", weight: 0.6 },
      { name: "Rift Valley Fever", weight: 0.5 },
      { name: "Yellow fever", weight: 0.5 },
      { name: "Japanese Encephalitis", weight: 0.4 },
      { name: "Rocky Mountain spotted fever", weight: 0.4 },
      { name: "Lyme disease", weight: 0.3 },
    ],
  },
  {
    id: "hepatitis",
    label: "Hepatitis Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "jaundice", weight: 3 },
      { symptomId: "nausea", weight: 2 },
      { symptomId: "vomiting", weight: 2 },
      { symptomId: "abdominal-pain", weight: 2 },
      { symptomId: "loss-of-appetite", weight: 2 },
      { symptomId: "fatigue", weight: 1 },
      { symptomId: "malaise", weight: 1 },
      { symptomId: "diarrhea", weight: 1 },
      { symptomId: "high-fever", weight: 1 },
    ],
    diseases: [
      { name: "Hepatitis A", weight: 1 },
      { name: "Hepatitis B", weight: 0.9 },
      { name: "Hepatitis C", weight: 0.8 },
      { name: "Hepatitis E", weight: 0.8 },
      { name: "Yellow fever", weight: 0.6 },
      { name: "Leptospirosis, Weil disease", weight: 0.5 },
      { name: "Malaria", weight: 0.4 },
      { name: "Mononucleosis", weight: 0.3 },
    ],
  },
  {
    id: "paralytic",
    label: "Paralytic Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "paralysis", weight: 3 },
      { symptomId: "reflex-loss", weight: 3 },
      { symptomId: "weakness", weight: 2 },
      { symptomId: "muscle-pain", weight: 1 },
      { symptomId: "body-aches", weight: 1 },
      { symptomId: "respiratory-difficulty", weight: 1 },
      { symptomId: "altered-mental-status", weight: 1 },
      { symptomId: "fatigue", weight: 1 },
    ],
    diseases: [
      { name: "Polio", weight: 1 },
      { name: "Botulism (flaccid paralysis)", weight: 0.95 },
      { name: "Tetanus (lockjaw, risus sardonicus, spastic paralysis)", weight: 0.8 },
      { name: "Rabies", weight: 0.7 },
      { name: "West Nile virus infection", weight: 0.6 },
      { name: "Japanese Encephalitis", weight: 0.45 },
      { name: "Diphtheria (pseudomembranous pharyngitis, myocarditis)", weight: 0.4 },
      { name: "Venezuelan Equine Encephalomyelitis", weight: 0.3 },
    ],
  },
  {
    id: "sti",
    label: "Sexually Transmitted Syndrome",
    minScore: 4,
    triggers: [
      { symptomId: "genital-ulcers", weight: 3 },
      { symptomId: "unusual-discharge", weight: 3 },
      { symptomId: "dysuria", weight: 2 },
      { symptomId: "hematuria", weight: 1 },
      { symptomId: "swollen-lymph-nodes", weight: 1 },
      { symptomId: "rash", weight: 1 },
      { symptomId: "joint-pain", weight: 1 },
      { symptomId: "abdominal-pain", weight: 1 },
    ],
    diseases: [
      { name: "Syphilis", weight: 0.9 },
      { name: "Gonorrhea, septic arthritis, neonatal conjunctivitis", weight: 0.9 },
      { name: "Neonatal & Follicular conjunctivitis, Nongonococcal urethritis", weight: 0.8 },
      { name: "HIV/AIDS", weight: 0.7 },
      { name: "Candidiasis", weight: 0.5 },
      { name: "Hepatitis B", weight: 0.4 },
      { name: "Warts", weight: 0.4 },
      { name: "Molluscum contagiosum", weight: 0.3 },
    ],
  },
];
// ─── END SYNDROME DEFINITIONS ───────────────────────────────────────────────

export interface SyndromeMatch {
  id: string;
  label: string;
  /** Summed weight of matched triggers. */
  score: number;
  /** score / total possible weight for this syndrome (0–1), how strongly it matched. */
  strength: number;
}

export interface DiseasePrediction {
  name: string;
  /** 0–100, normalized across the top predictions so the ranking reads like a forecast. */
  probability: number;
  matchedSyndromes: string[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface PredictionResult {
  syndromes: SyndromeMatch[];
  diseases: DiseasePrediction[];
  riskLevel: RiskLevel;
}

const MAX_DISEASES = 6;

// Pure, deterministic. Given selected symptom ids, classify syndromes and rank diseases.
export function predict(selectedSymptomIds: string[]): PredictionResult {
  const selected = new Set(selectedSymptomIds);

  // 1. Score every syndrome by its matched triggers; flag those at/above minScore.
  const matches: SyndromeMatch[] = [];
  for (const syn of SYNDROMES) {
    let score = 0;
    let total = 0;
    for (const t of syn.triggers) {
      total += t.weight;
      if (selected.has(t.symptomId)) score += t.weight;
    }
    if (score >= syn.minScore && score > 0) {
      matches.push({
        id: syn.id,
        label: syn.label,
        score,
        strength: total > 0 ? score / total : 0,
      });
    }
  }
  matches.sort((a, b) => b.score - a.score);

  // 2. Accumulate disease scores across flagged syndromes, weighted by how
  //    strongly each syndrome matched.
  const diseaseScores = new Map<string, { score: number; syndromes: Set<string> }>();
  const matchById = new Map(matches.map((m) => [m.id, m]));
  for (const syn of SYNDROMES) {
    const m = matchById.get(syn.id);
    if (!m) continue;
    for (const d of syn.diseases) {
      const entry = diseaseScores.get(d.name) || { score: 0, syndromes: new Set<string>() };
      entry.score += d.weight * m.strength;
      entry.syndromes.add(syn.label);
      diseaseScores.set(d.name, entry);
    }
  }

  // 3. Normalize the top diseases into a 0–100 ranking that sums to ~100.
  const ranked = Array.from(diseaseScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_DISEASES);
  const totalScore = ranked.reduce((s, [, v]) => s + v.score, 0);
  const diseases: DiseasePrediction[] = ranked.map(([name, v]) => ({
    name,
    probability: totalScore > 0 ? Math.round((v.score / totalScore) * 100) : 0,
    matchedSyndromes: Array.from(v.syndromes),
  }));

  // 4. Risk level: high if a red-flag symptom was reported or a high-risk
  //    syndrome matched strongly; medium if any syndrome fired; low otherwise.
  let riskLevel: RiskLevel = "low";
  if (matches.length > 0) riskLevel = "medium";
  const hasAlarm = selectedSymptomIds.some((id) => ALARM_SYMPTOMS.has(id));
  const strongHighRisk = matches.some(
    (m) => HIGH_RISK_SYNDROMES.has(m.id) && m.strength >= STRONG_MATCH
  );
  if (hasAlarm || strongHighRisk) riskLevel = "high";

  return { syndromes: matches, diseases, riskLevel };
}
