import sys
sys.path.insert(0, 'backend')
from app.services.taxonomy_kb import TAXONOMY_DATABASE

kingdoms = {}
families = {}
for t in TAXONOMY_DATABASE:
    k = t['taxonomy'].get('kingdom', 'Unknown')
    kingdoms[k] = kingdoms.get(k, 0) + 1
    f = t['taxonomy'].get('family', 'Unknown')
    families[f] = families.get(f, 0) + 1

print(f"Total taxa: {len(TAXONOMY_DATABASE)}")
print(f"Kingdoms breakdown: {kingdoms}")
print(f"Total Families: {len(families)}")
print(f"Unique IDs: {len(set(t['id'] for t in TAXONOMY_DATABASE))}/{len(TAXONOMY_DATABASE)}")
print(f"Unique Scientific Names: {len(set(t['scientific_name'] for t in TAXONOMY_DATABASE))}/{len(TAXONOMY_DATABASE)}")
print(f"Unique Common Names: {len(set(t['common_name'] for t in TAXONOMY_DATABASE))}/{len(TAXONOMY_DATABASE)}")

print("\n--- Full Taxonomy Catalog ---")
for i, t in enumerate(TAXONOMY_DATABASE):
    tax = t['taxonomy']
    print(f"{i+1:2d}. [{tax.get('kingdom', '')}] {t['common_name']} ({t['scientific_name']}) | Family: {tax.get('family', '')} | Order: {tax.get('order', '')}")
