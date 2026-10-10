from app.repositories.taxonomy_repository import TaxonomyRepository

MOCK_TAXA = [
    {
        "id": "mock_species",
        "common_name": "Mock Robin",
        "scientific_name": "Turdus mockus",
        "taxonomy": {"kingdom": "Animalia", "order": "Passeriformes"},
        "visual_characteristics": ["Test marker"],
        "distinguishing_features": ["Test feature"],
        "lookalikes": [],
        "habitat_notes": "Test habitat",
        "field_verification_tip": "Look at chest"
    }
]

def test_taxonomy_repository_lookup():
    repo = TaxonomyRepository(MOCK_TAXA)
    assert repo.count() == 1

    by_id = repo.get_by_id("mock_species")
    assert by_id is not None
    assert by_id["common_name"] == "Mock Robin"

    by_sci = repo.get_by_name("Turdus mockus")
    assert by_sci is not None
    assert by_sci["id"] == "mock_species"

    by_common = repo.get_by_name("mock robin")
    assert by_common is not None
    assert by_common["id"] == "mock_species"

    assert repo.get_by_id("nonexistent") is None

def test_taxonomy_repository_prompts():
    repo = TaxonomyRepository(MOCK_TAXA)
    prompts = repo.generate_prompts()
    assert len(prompts) == 1
    assert "Mock Robin (Turdus mockus)" in prompts[0]
    assert "kingdom Animalia" in prompts[0]
