from typing import Any, Dict, List, Optional

from app.services.taxonomy_kb import TAXONOMY_DATABASE


class TaxonomyRepository:
    def __init__(self, data: Optional[List[Dict[str, Any]]] = None):
        self._data = data if data is not None else TAXONOMY_DATABASE
        self._index_by_id: Dict[str, Dict[str, Any]] = {}
        self._index_by_name: Dict[str, Dict[str, Any]] = {}
        self._build_indices()

    def _build_indices(self) -> None:
        for entry in self._data:
            self._index_by_id[entry["id"]] = entry
            self._index_by_name[entry["scientific_name"].lower()] = entry
            self._index_by_name[entry["common_name"].lower()] = entry

    def list_all(self) -> List[Dict[str, Any]]:
        return list(self._data)

    def count(self) -> int:
        return len(self._data)

    def get_by_id(self, taxon_id: str) -> Optional[Dict[str, Any]]:
        return self._index_by_id.get(taxon_id)

    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self._index_by_name.get(name.lower().strip())

    def generate_prompts(self, style: str = "hierarchical") -> List[str]:
        """
        Builds biological context prompts formatted for BioCLIP's visual-taxonomic alignment.
        - 'hierarchical': Traditional prompt with kingdom and order.
        - 'lineage': Full taxonomic lineage TreeOfLife prompt ('a photo of {kingdom} {phylum} {class} {order} {family} {genus} {species}').
        - 'concise': High-margin zero-shot species prompt ('a photo of {common_name}, {scientific_name}').
        """
        prompts = []
        for entry in self._data:
            c_name = entry["common_name"]
            s_name = entry["scientific_name"]
            tax = entry.get("taxonomy", {})
            if style == "lineage":
                ranks = [
                    tax.get("kingdom", ""),
                    tax.get("phylum", ""),
                    tax.get("class", "") or tax.get("class_name", ""),
                    tax.get("order", ""),
                    tax.get("family", ""),
                    tax.get("genus", ""),
                    tax.get("species", "") or s_name
                ]
                lineage = " ".join([r for r in ranks if r])
                prompts.append(f"a photo of {lineage}")
            elif style == "concise":
                prompts.append(f"a photo of {c_name}, {s_name}")
            else:
                kingdom = tax.get("kingdom", "Organism")
                order = tax.get("order", "")
                prompts.append(
                    f"a photo of {c_name} ({s_name}), an organism in kingdom {kingdom} order {order}"
                )
        return prompts

    def generate_lineage_templates(self) -> List[List[str]]:
        """
        Returns multiple prompt templates utilizing full taxonomic lineage for each taxon.
        Permits ensembling / averaging 2-3 lineage templates.
        """
        all_templates = []
        for entry in self._data:
            c_name = entry["common_name"]
            s_name = entry["scientific_name"]
            tax = entry.get("taxonomy", {})
            ranks = [
                tax.get("kingdom", ""),
                tax.get("phylum", ""),
                tax.get("class", "") or tax.get("class_name", ""),
                tax.get("order", ""),
                tax.get("family", ""),
                tax.get("genus", ""),
                tax.get("species", "") or s_name
            ]
            lineage = " ".join([r for r in ranks if r])
            all_templates.append([
                f"a photo of {lineage}",
                f"a photo of {c_name}, {lineage}"
            ])
        return all_templates

default_taxonomy_repository = TaxonomyRepository()

