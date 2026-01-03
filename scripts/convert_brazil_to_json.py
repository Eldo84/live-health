#!/usr/bin/env python3
"""
Convert brazil.json TSV file to proper JSON format matching usa.json structure
"""

import json
import re
from datetime import datetime

def parse_tsv_to_json(input_file, output_file):
    """Convert TSV health data to JSON format matching usa.json structure"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Column headers (from line 2)
    headers = [
        "condition",
        "prevalence",
        "incidence",
        "mortalityRate",
        "female",
        "male",
        "allSexes",
        "ylds",
        "dalys",
        "year",
        "location",
        "dataSource",
        "riskFactors",
        "equity",
        "interventions"
    ]
    
    records = []
    current_category = None
    skip_next_header = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Split by tabs
        parts = line.split('\t')
        # Clean up parts (remove empty strings from multiple tabs)
        parts = [p.strip() for p in parts if p.strip()]
        
        # Check if this is a category header (typically just the category name on a line)
        if len(parts) == 1:
            # Check if it looks like a category (not "Condition")
            if parts[0] != "Condition" and not parts[0].startswith("Condition"):
                current_category = parts[0].strip()
                skip_next_header = True
                continue
        
        # Check if this is a header row
        if parts and parts[0] == "Condition":
            if skip_next_header:
                skip_next_header = False
                continue
            # Skip header rows
            continue
        
        # This should be a data row
        if len(parts) < 3:  # At minimum need condition, prevalence, etc.
            continue
        
        # Extract values - make sure we have enough parts
        while len(parts) < len(headers):
            parts.append('')
        
        # Create record object matching usa.json format
        record = {
            "condition": parts[0].strip() if len(parts) > 0 else "",
            "category": current_category or "Uncategorized",
            "prevalence": parts[1].strip() if len(parts) > 1 else "",
            "incidence": parts[2].strip() if len(parts) > 2 else "",
            "mortalityRate": parts[3].strip() if len(parts) > 3 else "",
            "female": parts[4].strip() if len(parts) > 4 else "",
            "male": parts[5].strip() if len(parts) > 5 else "",
            "allSexes": parts[6].strip() if len(parts) > 6 else "",
            "ylds": parts[7].strip() if len(parts) > 7 else "",
            "dalys": parts[8].strip() if len(parts) > 8 else "",
            "year": parts[9].strip() if len(parts) > 9 else "2020",
            "location": parts[10].strip() if len(parts) > 10 else "Brazil",
            "dataSource": parts[11].strip() if len(parts) > 11 else "",
            "riskFactors": parts[12].strip() if len(parts) > 12 else "",
        }
        
        # Skip if condition is empty
        if not record["condition"] or len(record["condition"]) < 2:
            continue
        
        records.append(record)
    
    # Create the final JSON structure matching usa.json
    output_data = {
        "country": "BRA",
        "metadata": {
            "source": "brazil.json TSV file",
            "generatedAt": datetime.now().isoformat() + "Z",
            "notes": "Converted from TSV format to JSON structure matching usa.json"
        },
        "records": records
    }
    
    # Write JSON output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"Converted {len(records)} conditions to JSON format")
    print(f"Output written to {output_file}")
    print(f"Categories found: {len(set(r['category'] for r in records))}")

if __name__ == "__main__":
    input_file = "src/data/brazil.json"
    output_file = "src/data/brazil.json"
    
    parse_tsv_to_json(input_file, output_file)

