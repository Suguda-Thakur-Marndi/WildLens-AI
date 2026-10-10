from app.schemas.identification import CandidateSpecies, IdentificationResponse, TaxonomicHierarchy


def test_taxonomic_hierarchy_alias():
    tax = TaxonomicHierarchy(kingdom="Plantae", class_name="Magnoliopsida")
    assert tax.kingdom == "Plantae"
    assert tax.class_name == "Magnoliopsida"

def test_candidate_species_serialization():
    species = CandidateSpecies(
        common_name="White Oak",
        scientific_name="Quercus alba",
        confidence=0.985,
        taxonomy=TaxonomicHierarchy(kingdom="Plantae", genus="Quercus"),
        visual_characteristics=["Rounded lobes"],
        distinguishing_features=["No bristle tips"],
        lookalikes=["Red Oak"]
    )
    dumped = species.model_dump()
    assert dumped["common_name"] == "White Oak"
    assert dumped["confidence"] == 0.985
    assert dumped["taxonomy"]["kingdom"] == "Plantae"

def test_identification_response_defaults():
    res = IdentificationResponse(
        inference_time_ms=500.0,
        model_identifier="imageomics/bioclip-2"
    )
    assert res.model_name == "imageomics/bioclip-2"
    assert res.uncertainty_rating == "low"
    assert res.offline_verified is True
    assert res.softmax_density == 0.0
    assert res.calibrated_probability is None
    assert "36" in res.catalog_scope
    assert "respectful distance" in res.safety_and_ethics_reminder
