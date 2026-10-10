import sys
sys.path.insert(0, 'backend')
from app.services.taxonomy_kb import TAXONOMY_DATABASE

errors = []
for i, taxon in enumerate(TAXONOMY_DATABASE):
    t_id = taxon.get("id")
    c_name = taxon.get("common_name")
    s_name = taxon.get("scientific_name")
    tax = taxon.get("taxonomy", {})
    
    if not t_id: errors.append(f"Row {i}: Missing id")
    if not c_name: errors.append(f"Row {i}: Missing common_name")
    if not s_name: errors.append(f"Row {i}: Missing scientific_name")
    
    # Check binomial
    parts = s_name.split()
    if len(parts) < 2:
        errors.append(f"{t_id}: scientific_name '{s_name}' is not binomial")
    else:
        genus = parts[0]
        if tax.get("genus") and tax["genus"] != genus:
            errors.append(f"{t_id}: taxonomy.genus '{tax.get('genus')}' != scientific_name genus '{genus}'")
    
    for req_rank in ["kingdom", "phylum", "order", "family"]:
        if not tax.get(req_rank):
            errors.append(f"{t_id}: Missing taxonomy rank '{req_rank}'")
            
    # Check traits
    vc = taxon.get("visual_characteristics", [])
    df = taxon.get("distinguishing_features", [])
    if not vc: errors.append(f"{t_id}: Empty visual_characteristics")
    if not df: errors.append(f"{t_id}: Empty distinguishing_features")

if errors:
    print(f"Found {len(errors)} taxonomy errors:")
    for e in errors:
        print("  -", e)
else:
    print("All 36 taxa passed taxonomy schema integrity checks!")
