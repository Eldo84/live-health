import {
  Utensils,
  Droplet,
  Bug,
  Wind,
  Handshake,
  Hospital,
  PawPrint,
  Heart,
  Shield,
  AlertTriangle,
  Brain,
  Syringe,
  Activity,
  AlertCircle,
  Beaker,
  Dna,
  Stethoscope,
  Cloud,
  Sparkles,
} from "lucide-react";
import { OutbreakCategory } from "./useOutbreakCategories";
import React from "react";

// Normalize various category name variants to the standard dropdown labels
export const normalizeCategoryForDisplay = (categoryName: string): string => {
  const nameLower = categoryName.toLowerCase().trim();

  // Handle composite categories separated by commas or slashes - take the first part
  const primaryName = nameLower.split(/[,/]/)[0].trim();

  if (primaryName.includes('food')) return 'Foodborne Outbreaks';
  if (primaryName.includes('water')) return 'Waterborne Outbreaks';
  if (primaryName.includes('vector')) return 'Vector-Borne Outbreaks';
  if (primaryName.includes('airborne') || primaryName.includes('aerosol')) return 'Airborne Outbreaks';
  if (primaryName.includes('respiratory')) return 'Respiratory Outbreaks';
  if (primaryName.includes('contact') || primaryName.includes('touch') || primaryName.includes('fomite')) return 'Contact Transmission';
  if (primaryName.includes('hospital') || primaryName.includes('healthcare') || primaryName.includes('nosocomial')) return 'Healthcare-Associated Infections';
  if (primaryName.includes('zoonotic') || primaryName.includes('animal') || primaryName.includes('livestock')) return 'Zoonotic Outbreaks';
  if (primaryName.includes('veterinary') || primaryName.includes('vet ')) return 'Veterinary Outbreaks';
  if (primaryName.includes('sexually') || primaryName.includes('sti')) return 'Sexually Transmitted Infections';
  if (primaryName.includes('vaccine') || primaryName.includes('vpd')) return 'Vaccine-Preventable Diseases';
  if (primaryName.includes('emerging') || primaryName.includes('novel') || primaryName.includes('unknown')) return 'Emerging Infectious Diseases';
  if (primaryName.includes('neurological') || primaryName.includes('neuro')) return 'Neurological Outbreaks';
  if (primaryName.includes('blood')) return 'Bloodborne Outbreaks';
  if (primaryName.includes('gastro') || primaryName.includes('enteric') || primaryName.includes('gi ')) return 'Gastrointestinal Outbreaks';

  // Re-emerging/reemerging synonyms
  if (primaryName.includes('re-emerging') || primaryName.includes('reemerging')) {
    return 'Emerging Infectious Diseases';
  }

  // Standard base categories - capitalize properly
  const standardCategories: Record<string, string> = {
    'foodborne outbreaks': 'Foodborne Outbreaks',
    'waterborne outbreaks': 'Waterborne Outbreaks',
    'vector-borne outbreaks': 'Vector-Borne Outbreaks',
    'airborne outbreaks': 'Airborne Outbreaks',
    'contact transmission': 'Contact Transmission',
    'healthcare-associated infections': 'Healthcare-Associated Infections',
    'zoonotic outbreaks': 'Zoonotic Outbreaks',
    'vaccine-preventable diseases': 'Vaccine-Preventable Diseases',
    'respiratory outbreaks': 'Respiratory Outbreaks',
    'neurological outbreaks': 'Neurological Outbreaks',
    'bloodborne outbreaks': 'Bloodborne Outbreaks',
    'gastrointestinal outbreaks': 'Gastrointestinal Outbreaks',
    'other': 'Other',
  };

  if (standardCategories[nameLower]) {
    return standardCategories[nameLower];
  }

  // Capitalize words fallback
  return categoryName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Map of icons by normalized category name
const categoryIconMap: Record<string, React.ComponentType<any>> = {
  'Foodborne Outbreaks': Utensils,
  'Waterborne Outbreaks': Droplet,
  'Vector-Borne Outbreaks': Bug,
  'Airborne Outbreaks': Wind,
  'Contact Transmission': Handshake,
  'Healthcare-Associated Infections': Hospital,
  'Zoonotic Outbreaks': PawPrint,
  'Veterinary Outbreaks': PawPrint,
  'Sexually Transmitted Infections': Heart,
  'Vaccine-Preventable Diseases': Shield,
  'Emerging Infectious Diseases': AlertTriangle,
  'Neurological Outbreaks': Brain,
  'Respiratory Outbreaks': Cloud,
  'Bloodborne Outbreaks': Syringe,
  'Gastrointestinal Outbreaks': Activity,
  'Other': AlertCircle,
};

const fallbackIconMap: Record<string, React.ComponentType<any>> = {
  'utensils': Utensils, 'droplet': Droplet, 'bug': Bug, 'wind': Wind,
  'handshake': Handshake, 'hospital': Hospital, 'paw-print': PawPrint,
  'paw': PawPrint, 'heart': Heart, 'shield': Shield, 'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle, 'brain': Brain, 'syringe': Syringe,
  'activity': Activity, 'beaker': Beaker, 'dna': Dna, 'stethoscope': Stethoscope,
  'cloud': Cloud, 'sparkles': Sparkles,
};

const standardColors: Record<string, string> = {
  'Foodborne Outbreaks': '#f87171',
  'Waterborne Outbreaks': '#66dbe1',
  'Vector-Borne Outbreaks': '#fbbf24',
  'Airborne Outbreaks': '#a78bfa',
  'Contact Transmission': '#fb923c',
  'Healthcare-Associated Infections': '#ef4444',
  'Zoonotic Outbreaks': '#10b981',
  'Veterinary Outbreaks': '#8b5cf6',
  'Sexually Transmitted Infections': '#ec4899',
  'Vaccine-Preventable Diseases': '#3b82f6',
  'Emerging Infectious Diseases': '#f59e0b',
  'Neurological Outbreaks': '#dc2626',
  'Respiratory Outbreaks': '#9333ea',
  'Bloodborne Outbreaks': '#dc2626',
  'Gastrointestinal Outbreaks': '#f97316',
  'Other': '#4eb7bd',
};

const standardCategoriesOrdered = [
  "Foodborne Outbreaks",
  "Waterborne Outbreaks",
  "Vector-Borne Outbreaks",
  "Airborne Outbreaks",
  "Contact Transmission",
  "Healthcare-Associated Infections",
  "Zoonotic Outbreaks",
  "Sexually Transmitted Infections",
  "Vaccine-Preventable Diseases",
  "Emerging Infectious Diseases",
  "Veterinary Outbreaks",
  "Neurological Outbreaks",
  "Respiratory Outbreaks",
  "Bloodborne Outbreaks",
  "Gastrointestinal Outbreaks",
  "Other"
];

export interface StandardizedCategory {
  id: string;
  name: string;
  color: string;
  icon: React.ComponentType<any>;
}

export const buildStandardizedCategories = (dbCategories: OutbreakCategory[]): StandardizedCategory[] => {
  const categoryMap = new Map<string, {
    id: string;
    name: string;
    color: string;
    icon: React.ComponentType<any>;
    originalName: string;
  }>();

  dbCategories.forEach(cat => {
    const normalizedName = normalizeCategoryForDisplay(cat.name);

    if (categoryMap.has(normalizedName)) {
      const existing = categoryMap.get(normalizedName)!;
      const isExactMatch = cat.name === normalizedName;
      const existingIsExact = existing.originalName === normalizedName;
      const hasComma = cat.name.includes(',');
      const existingHasComma = existing.originalName.includes(',');
      if (!((isExactMatch && !existingIsExact) || (!hasComma && existingHasComma))) {
        return;
      }
    }

    let IconComponent: React.ComponentType<any> = categoryIconMap[normalizedName] || AlertCircle;

    if (cat.icon) {
      const iconKey = cat.icon.toLowerCase().replace(/\s+/g, '-');
      IconComponent = fallbackIconMap[iconKey] || IconComponent;
    }

    let categoryColor = cat.color || standardColors[normalizedName] || '#66dbe1';
    if (!cat.color || cat.color === '#66dbe1') {
      if (standardColors[normalizedName]) {
        categoryColor = standardColors[normalizedName];
      }
    }

    categoryMap.set(normalizedName, {
      id: cat.id,
      name: normalizedName,
      color: categoryColor,
      icon: IconComponent,
      originalName: cat.name,
    });
  });

  const normalizedCategories = standardCategoriesOrdered
    .map(categoryName => {
      const found = Array.from(categoryMap.values()).find(cat =>
        cat.name === categoryName ||
        normalizeCategoryForDisplay(cat.name) === categoryName
      );

      if (found) {
        return found;
      }

      const IconComponent = categoryIconMap[categoryName] || AlertCircle;
      return {
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        color: standardColors[categoryName] || '#4eb7bd',
        icon: IconComponent,
        originalName: categoryName,
      };
    })
    .filter(Boolean);

  return normalizedCategories.map(({ originalName, ...rest }) => rest);
};

