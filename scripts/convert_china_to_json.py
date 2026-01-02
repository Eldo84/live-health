#!/usr/bin/env python3
"""
Convert china.json TSV file to proper JSON format
"""

import json
import re

def parse_tsv_to_json(input_file, output_file):
    """Convert TSV health data to JSON format"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Column headers (from the header row)
    headers = [
        "condition",
        "prevalence",
        "incidence",
        "mortality_rate",
        "female",
        "male",
        "all_sexes",
        "ylds",
        "dalys",
        "year",
        "location",
        "data_source",
        "risk_factors",
        "equity",
        "interventions"
    ]
    
    data = []
    current_category = None
    skip_next_header = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Split by tabs
        parts = line.split('\t')
        
        # Check if this is a category header (no tabs or just category name)
        if len(parts) == 1 or (len(parts) == 2 and not parts[1].strip()):
            # This is a category name
            current_category = parts[0].strip()
            skip_next_header = True
            continue
        
        # Check if this is a header row
        if parts[0].strip() == "Condition":
            if skip_next_header:
                skip_next_header = False
                continue
            # Skip header rows
            continue
        
        # This should be a data row
        # Make sure we have enough parts
        if len(parts) < len(headers):
            # Pad with empty strings
            parts.extend([''] * (len(headers) - len(parts)))
        
        # Create condition object
        condition_obj = {
            "category": current_category or "Unknown",
        }
        
        # Map each column to its header
        for idx, header in enumerate(headers):
            value = parts[idx].strip() if idx < len(parts) else ""
            
            # Clean up the value
            if value in ["NA", "N/A", ""]:
                value = None
            elif value == "–":
                value = None
            elif header == "year":
                # Try to parse year as integer
                try:
                    value = int(value) if value else None
                except ValueError:
                    pass
            elif header in ["prevalence", "incidence", "mortality_rate", "female", "male", 
                           "all_sexes", "ylds", "dalys"]:
                # Keep as string for now (contains ~, ranges, etc.)
                pass
            
            condition_obj[header] = value
        
        data.append(condition_obj)
    
    # Write JSON output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Converted {len(data)} conditions to JSON format")
    print(f"Output written to {output_file}")

if __name__ == "__main__":
    input_file = "src/data/china.json"
    output_file = "src/data/china.json"
    
    parse_tsv_to_json(input_file, output_file)

