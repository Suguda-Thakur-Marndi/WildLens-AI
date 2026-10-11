"""
Taxonomic Knowledge Base for WildLens AI.
Contains rich taxonomic classifications, visual field markers, lookalike warnings,
and outdoor observation prompts aligned with BioCLIP's TreeOfLife-10M structure.
"""

from typing import Any, Dict, List

TAXONOMY_DATABASE: List[Dict[str, Any]] = [
    # --- BIRDS (AVES) ---
    {
        "id": "turdus_migratorius",
        "common_name": "American Robin",
        "scientific_name": "Turdus migratorius",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Passeriformes",
            "family": "Turdidae",
            "genus": "Turdus",
            "species": "Turdus migratorius"
        },
        "visual_characteristics": [
            "Rich reddish-orange breast and dark gray-brown back",
            "White crescents above and below eyes",
            "Yellow bill with a dark tip in winter",
            "Distinct upright posture when scanning ground"
        ],
        "distinguishing_features": [
            "White splotch on lower belly and undertail coverts",
            "Cocked head behavior while listening for earthworms",
            "Flight pattern: swift, direct wingbeats with flicking tail"
        ],
        "lookalikes": [
            "Varied Thrush (Ixoreus naevius) - has black breast band and orange wing bars",
            "Eastern Bluebird (Sialia sialis) - sky blue plumage above, smaller rounder build"
        ],
        "habitat_notes": "Lawns, forest edges, deciduous woodlands, parks and gardens.",
        "field_verification_tip": "Look at the belly: robins have solid rust-orange from chest down, terminating in crisp white near the undertail."
    },
    {
        "id": "buteo_jamaicensis",
        "common_name": "Red-tailed Hawk",
        "scientific_name": "Buteo jamaicensis",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Accipitriformes",
            "family": "Accipitridae",
            "genus": "Buteo",
            "species": "Buteo jamaicensis"
        },
        "visual_characteristics": [
            "Broad, rounded wings and short wide brick-red tail in adults",
            "Speckled belly band across white underparts",
            "Dark patagial mark on leading edge of underwing"
        ],
        "distinguishing_features": [
            "Cinnamon-red upper tail surface visible as it banks in soaring flight",
            "Heavy build with dark comma mark on wrist of underwing",
            "Hoarse, rasping scream vocalization"
        ],
        "lookalikes": [
            "Red-shouldered Hawk (Buteo lineatus) - translucent wing crescents, barred reddish chest",
            "Broad-winged Hawk (Buteo platypterus) - smaller, bold black and white tail bands"
        ],
        "habitat_notes": "Open country, roadsides, agricultural fields, woodland edges, telephone poles.",
        "field_verification_tip": "Observe the tail while the raptor banks: adult Red-tailed Hawks show vivid warm rufous-red from above."
    },
    {
        "id": "cyanocitta_cristata",
        "common_name": "Blue Jay",
        "scientific_name": "Cyanocitta cristata",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Passeriformes",
            "family": "Corvidae",
            "genus": "Cyanocitta",
            "species": "Cyanocitta cristata"
        },
        "visual_characteristics": [
            "Prominent blue crest that raises or lowers with agitation",
            "Brilliant blue, black, and white checkered plumage on wings and tail",
            "Bold black necklace collar circling throat and nape"
        ],
        "distinguishing_features": [
            "Broad rounded tail with white outer corners",
            "Pronounced crest erectile according to mood",
            "Robust black corvid bill capable of cracking acorns"
        ],
        "lookalikes": [
            "Belted Kingfisher (Megaceryle alcyon) - shaggy double crest, white collar, dagger bill",
            "Steller's Jay (Cyanocitta stelleri) - charcoal-black head and crest, dark blue body"
        ],
        "habitat_notes": "Oak forests, suburban yards, parklands, bird feeders, beech stands.",
        "field_verification_tip": "Check the crest and wings: look for the distinct black U-shaped necklace and white wing patches."
    },
    {
        "id": "poecile_atricapillus",
        "common_name": "Black-capped Chickadee",
        "scientific_name": "Poecile atricapillus",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Passeriformes",
            "family": "Paridae",
            "genus": "Poecile",
            "species": "Poecile atricapillus"
        },
        "visual_characteristics": [
            "Glossy jet-black cap and bib separated by stark white cheeks",
            "Spherical, compact body with disproportionately long tail",
            "Buffy-tan flanks and soft gray back and wings"
        ],
        "distinguishing_features": [
            "Ragged lower edge of black throat bib",
            "Acrobatic feeding posture: frequently hangs upside-down from twigs",
            "Clear two-note whistling 'fee-bee' song"
        ],
        "lookalikes": [
            "Carolina Chickadee (Poecile carolinensis) - slightly smaller, crisper bib border",
            "Tufted Titmouse (Baeolophus bicolor) - all gray with pointed crest and black forehead"
        ],
        "habitat_notes": "Deciduous and mixed forests, parklands, thickets, residential yards.",
        "field_verification_tip": "Watch feeding behavior: chickadees nimbly hang inverted on branch tips to glean hidden arthropods and seeds."
    },
    {
        "id": "anas_platyrhynchos",
        "common_name": "Mallard",
        "scientific_name": "Anas platyrhynchos",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Anseriformes",
            "family": "Anatidae",
            "genus": "Anas",
            "species": "Anas platyrhynchos"
        },
        "visual_characteristics": [
            "Male: Iridescent bottle-green head, white neck ring, chestnut breast",
            "Female: Cryptic mottled brown plumage with orange and black bill",
            "Both sexes: Violet-blue speculum wing patch bordered by white bars"
        ],
        "distinguishing_features": [
            "Curled black central tail feathers on drake",
            "Bright orange webbed feet",
            "Dabbling behavior: tips forward vertically in shallow water to feed"
        ],
        "lookalikes": [
            "American Black Duck (Anas rubripes) - much darker body, violet speculum lacks white borders",
            "Northern Shoveler (Spatula clypeata) - extraordinarily large spoon-shaped bill"
        ],
        "habitat_notes": "Freshwater wetlands, ponds, marshes, rivers, urban parks.",
        "field_verification_tip": "Look at the speculum on the folded wing: check for iridescent cobalt-blue bounded crisply on both sides by white stripes."
    },
    {
        "id": "sialia_sialis",
        "common_name": "Eastern Bluebird",
        "scientific_name": "Sialia sialis",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Passeriformes",
            "family": "Turdidae",
            "genus": "Sialia",
            "species": "Sialia sialis"
        },
        "visual_characteristics": [
            "Male: Brilliant deep azure blue head, back, and wings",
            "Warm brick-red to chestnut throat and breast with pure white belly",
            "Chunky thrush silhouette with short straight black bill"
        ],
        "distinguishing_features": [
            "Perches upright on fence posts or low branches scanning short turf for insects",
            "Soft musical warbling call",
            "Female is softer gray-blue above with paler peachy-orange throat"
        ],
        "lookalikes": [
            "Blue Jay (Cyanocitta cristata) - much larger, prominent crest, black necklace, white belly",
            "Indigo Bunting (Passerina cyanea) - smaller finch bill, uniform deep indigo with no red breast"
        ],
        "habitat_notes": "Open country with scattered trees, pasture fence lines, meadows, orchards.",
        "field_verification_tip": "Notice the breast contrast: blue above with warm rust-red throat and pure white belly."
    },
    {
        "id": "cardinalis_cardinalis",
        "common_name": "Northern Cardinal",
        "scientific_name": "Cardinalis cardinalis",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Aves",
            "order": "Passeriformes",
            "family": "Cardinalidae",
            "genus": "Cardinalis",
            "species": "Cardinalis cardinalis"
        },
        "visual_characteristics": [
            "Male: Vibrant all-crimson red plumage with black facial mask around bill",
            "Female: Warm fawn-olive body with red tinges on crest, wings, and tail",
            "Heavy conical coral-red bill and prominent pointed crest"
        ],
        "distinguishing_features": [
            "Prominent pointed head crest raised when alarmed",
            "Thick seed-cracking reddish-orange beak",
            "Rich melodic whistle song repeated from elevated perches"
        ],
        "lookalikes": [
            "Summer Tanager (Piranga rubra) - red male lacks head crest and black facial mask",
            "Scarlet Tanager (Piranga olivacea) - brilliant red body with jet-black wings and tail"
        ],
        "habitat_notes": "Dense shrubby woodland edges, hedgerows, suburban gardens, riparian brush.",
        "field_verification_tip": "Look at the face: cardinals have a prominent pointed crest and a jet-black mask surrounding a stout reddish-orange bill."
    },

    # --- INSECTS (INSECTA) ---
    {
        "id": "danaus_plexippus",
        "common_name": "Monarch Butterfly",
        "scientific_name": "Danaus plexippus",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Arthropoda",
            "class": "Insecta",
            "order": "Lepidoptera",
            "family": "Nymphalidae",
            "genus": "Danaus",
            "species": "Danaus plexippus"
        },
        "visual_characteristics": [
            "Tawny brilliant orange wings divided by bold black veins",
            "Black margins populated with double rows of crisp white dots",
            "Black body and head dotted with distinctive white points"
        ],
        "distinguishing_features": [
            "Male has a small swollen black scent pouch on lower hindwing veins",
            "Lacks the postmedian black horizontal line that crosses Viceroy hindwing veins",
            "Gliding, floating flight pattern with wings held in slight dihedral V-shape"
        ],
        "lookalikes": [
            "Viceroy Butterfly (Limenitis archippus) - smaller, has distinct black transverse line crossing hindwings",
            "Queen Butterfly (Danaus gilippus) - darker chestnut-mahogany wings without bold black forewing veins"
        ],
        "habitat_notes": "Sunny meadows, milkweed patches, roadsides, coastal migratory flyways.",
        "field_verification_tip": "Examine the hindwings: monarchs completely lack the horizontal curved black band that crosses the lower wing veins on the Viceroy."
    },
    {
        "id": "limenitis_archippus",
        "common_name": "Viceroy Butterfly",
        "scientific_name": "Limenitis archippus",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Arthropoda",
            "class": "Insecta",
            "order": "Lepidoptera",
            "family": "Nymphalidae",
            "genus": "Limenitis",
            "species": "Limenitis archippus"
        },
        "visual_characteristics": [
            "Tawny-orange wings with black vein lines and white marginal spotting",
            "Classic Batesian/Müllerian mimic of the poisonous Monarch Butterfly",
            "Slightly smaller wingspan (6.5 to 7.5 cm) than Monarch (9 to 10 cm)"
        ],
        "distinguishing_features": [
            "Distinct black postmedian horizontal line that arcs across the hindwing veins",
            "Faster, more erratic wingbeats alternating with glides",
            "Single row of white dots on outer black margin rather than two"
        ],
        "lookalikes": [
            "Monarch Butterfly (Danaus plexippus) - larger, lacks the black transverse line crossing the hindwing",
            "Queen Butterfly (Danaus gilippus) - richer chestnut brown without black vein striping"
        ],
        "habitat_notes": "Moist willow thickets, riverbanks, wet meadows, damp forest edges.",
        "field_verification_tip": "Inspect the hindwings for a dark curved black line running across the radial veins like a sash."
    },
    {
        "id": "apis_mellifera",
        "common_name": "Western Honey Bee",
        "scientific_name": "Apis mellifera",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Arthropoda",
            "class": "Insecta",
            "order": "Hymenoptera",
            "family": "Apidae",
            "genus": "Apis",
            "species": "Apis mellifera"
        },
        "visual_characteristics": [
            "Slender amber to dark brown abdomen with alternating darker bands",
            "Hairy eyes and golden-brown pubescent thorax",
            "Flattened corbicula (pollen basket) on hind legs"
        ],
        "distinguishing_features": [
            "Smooth, polished hind tibia fringed with stiff setae forming pollen basket",
            "Wings folded flat along back at rest",
            "Constant flight motion visiting multiple flowering blossoms"
        ],
        "lookalikes": [
            "Common Eastern Bumblebee (Bombus impatiens) - much plumper, densely furry with yellow-black thorax",
            "Drone Fly (Eristalis tenax) - hoverfly mimic with only two wings, huge eyes, and no sting"
        ],
        "habitat_notes": "Orchards, wildflower gardens, agricultural clover fields, forest canopies.",
        "field_verification_tip": "Observe the hind legs: foraging worker honey bees carry bright yellow or orange balls of packed pollen in their corbiculae."
    },
    {
        "id": "bombus_impatiens",
        "common_name": "Common Eastern Bumblebee",
        "scientific_name": "Bombus impatiens",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Arthropoda",
            "class": "Insecta",
            "order": "Hymenoptera",
            "family": "Apidae",
            "genus": "Bombus",
            "species": "Bombus impatiens"
        },
        "visual_characteristics": [
            "Robust, dense velvety black and bright yellow fur",
            "Thorax completely yellow with central dark dot",
            "Abdomen has first tergite (T1) yellow, remaining segments T2-T6 solid jet-black"
        ],
        "distinguishing_features": [
            "Audible low-frequency buzz pollination (sonication) at flowers",
            "Heavy rounded body shape with dark wings",
            "Smooth, shiny corbicula on female hind legs"
        ],
        "lookalikes": [
            "Carpenter Bee (Xylocopa virginica) - abdomen is hairless, glossy patent-leather black",
            "Western Honey Bee (Apis mellifera) - much smaller, slender amber body"
        ],
        "habitat_notes": "Meadows, agricultural plantings, gardens, woodland borders.",
        "field_verification_tip": "Look at the abdomen: Common Eastern Bumblebees have only the very first abdominal segment yellow; the rest is solid black."
    },
    {
        "id": "coccinella_septempunctata",
        "common_name": "Seven-spotted Ladybug",
        "scientific_name": "Coccinella septempunctata",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Arthropoda",
            "class": "Insecta",
            "order": "Coleoptera",
            "family": "Coccinellidae",
            "genus": "Coccinella",
            "species": "Coccinella septempunctata"
        },
        "visual_characteristics": [
            "Domed oval silhouette with bright scarlet-orange to red elytra",
            "Exactly seven black spots across the wing covers",
            "Pronotum is black with two distinctive white triangular patches"
        ],
        "distinguishing_features": [
            "One large spot spread across suture behind pronotum, and three spots on each elytron",
            "Black head with two small white spots",
            "Voracious predator of plant aphids"
        ],
        "lookalikes": [
            "Asian Lady Beetle (Harmonia axyridis) - variable spot count (0-19), black M-shaped mark on pronotum",
            "Convergent Lady Beetle (Hippodamia convergens) - 12 to 13 spots, convergent white lines on pronotum"
        ],
        "habitat_notes": "Agricultural crops, gardens, shrubs, herbaceous vegetation with aphid colonies.",
        "field_verification_tip": "Count the black spots: three on each wing cover plus one central spot straddling the middle suture equals seven."
    },

    # --- TREES & WOODY PLANTS (PLANTAE) ---
    {
        "id": "quercus_alba",
        "common_name": "White Oak",
        "scientific_name": "Quercus alba",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Fagales",
            "family": "Fagaceae",
            "genus": "Quercus",
            "species": "Quercus alba"
        },
        "visual_characteristics": [
            "Leaves have 7 to 9 rounded finger-like lobes with deep sinuses",
            "Lobe tips are completely smooth and lack bristles or thorns",
            "Light ash-gray bark peeling in loose vertical scaly strips"
        ],
        "distinguishing_features": [
            "Bright green upper leaf surface with pale whitish-glaucous undersurface",
            "Acorns sweet and mature in single season, with shallow warty cups",
            "Foliage turns deep wine-red to russet in late autumn"
        ],
        "lookalikes": [
            "Northern Red Oak (Quercus rubra) - lobes have sharp bristle tips, dark ski-trail furrowed bark",
            "Bur Oak (Quercus macrocarpa) - deep waist sinus dividing leaf in half, fringed mossy acorn cup"
        ],
        "habitat_notes": "Well-drained upland ridges, deciduous forests, savannahs, rich slopes.",
        "field_verification_tip": "Check the leaf lobe tips: White Oak lobes are softly rounded and smooth, never ending in pointed bristles."
    },
    {
        "id": "quercus_rubra",
        "common_name": "Northern Red Oak",
        "scientific_name": "Quercus rubra",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Fagales",
            "family": "Fagaceae",
            "genus": "Quercus",
            "species": "Quercus rubra"
        },
        "visual_characteristics": [
            "Leaves with 7 to 11 sharp lobes tipped with fine hair-like bristles",
            "Bark characterized by dark gray ridges with shiny, flat-topped 'ski trails'",
            "Acorn with shallow saucer-like cup covering only the top quarter of nut"
        ],
        "distinguishing_features": [
            "Bristle-tipped lobes on all leaves (distinguishes from White Oak group)",
            "Acorns take two seasons to mature and taste bitter due to high tannins",
            "Lobe sinuses typically cut halfway to midrib in a regular U-shape"
        ],
        "lookalikes": [
            "White Oak (Quercus alba) - rounded lobe tips without bristles, pale scaly bark",
            "Black Oak (Quercus velutina) - deeper angular sinuses, rough blocky bark, yellow inner bark"
        ],
        "habitat_notes": "Moist upland forests, north- and east-facing slopes, rich valleys.",
        "field_verification_tip": "Inspect the tips of the leaf lobes: Red Oak lobes terminate in delicate sharp hair bristles."
    },
    {
        "id": "acer_saccharum",
        "common_name": "Sugar Maple",
        "scientific_name": "Acer saccharum",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Sapindales",
            "family": "Sapindaceae",
            "genus": "Acer",
            "species": "Acer saccharum"
        },
        "visual_characteristics": [
            "Leaves with 5 palmate lobes separated by rounded U-shaped sinuses",
            "Opposite branch and leaf arrangement along twigs",
            "Paired winged samaras (seeds) hanging in horseshoe shape"
        ],
        "distinguishing_features": [
            "Sinuses between lobes are smooth and U-shaped (like inside of a teacup)",
            "Dark brown bark with long vertical plates curling outward on older trees",
            "Spectacular autumn foliage turning luminous orange, amber, and scarlet"
        ],
        "lookalikes": [
            "Red Maple (Acer rubrum) - sharp V-shaped sinuses with serrated toothy margins",
            "Norway Maple (Acer platanoides) - milky sap when leaf stem is broken, wider samara angle"
        ],
        "habitat_notes": "Rich, moist, well-drained hardwood forests, northern slopes, maple-beech stands.",
        "field_verification_tip": "Trace the dip between leaf lobes: Sugar Maple has smooth U-shaped curves; Red Maple has sharp V-shaped angles."
    },
    {
        "id": "pinus_strobus",
        "common_name": "Eastern White Pine",
        "scientific_name": "Pinus strobus",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Pinopsida",
            "order": "Pinales",
            "family": "Pinaceae",
            "genus": "Pinus",
            "species": "Pinus strobus"
        },
        "visual_characteristics": [
            "Soft, flexible bluish-green needles bundled in fascicles of five (W-H-I-T-E = 5 letters)",
            "Slender, curved resinous cones measuring 8 to 20 cm in length",
            "Tall central trunk with horizontal whorled branches forming towering canopy"
        ],
        "distinguishing_features": [
            "Needles in bundles of 5 with fine white stomatal bands",
            "Smooth greenish-gray bark on young trees; deeply fissured blocky plates on old giants",
            "Distinct whispering wind sound through soft needle whorls"
        ],
        "lookalikes": [
            "Red Pine (Pinus resinosa) - needles in bundles of 2, brittle and snap cleanly",
            "Pitch Pine (Pinus rigida) - needles in bundles of 3, stiff and prickly, epicormic tufts on trunk"
        ],
        "habitat_notes": "Sandy soils, mixed conifer-hardwood forests, riparian corridors, rocky ridges.",
        "field_verification_tip": "Count the needles per cluster: Eastern White Pine always has exactly 5 soft needles per bundle."
    },
    {
        "id": "toxicodendron_radicans",
        "common_name": "Eastern Poison Ivy",
        "scientific_name": "Toxicodendron radicans",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Sapindales",
            "family": "Anacardiaceae",
            "genus": "Toxicodendron",
            "species": "Toxicodendron radicans"
        },
        "visual_characteristics": [
            "Compound foliage with exactly three leaflets ('Leaves of three, let it be')",
            "Central leaflet has a distinctly longer petiole stalk than the two lateral leaflets",
            "Hairy, fibrous aerial roots anchoring climbing vines to tree trunks"
        ],
        "distinguishing_features": [
            "Lateral leaflets often asymmetric with single mitten-like thumb lobe on outer edge",
            "Glossy waxy surface in spring; vivid red-orange foliage in early autumn",
            "Small clusters of grayish-white waxy berries in late summer"
        ],
        "lookalikes": [
            "Virginia Creeper (Parthenocissus quinquefolia) - has 5 leaflets radiating like fingers",
            "Boxelder Maple (Acer negundo) - opposite branching, whereas Poison Ivy is strictly alternate"
        ],
        "habitat_notes": "Trail edges, forest borders, floodplains, dunes, climbing up mature trees.",
        "field_verification_tip": "Notice the stalk length: the middle leaflet has a prominent long stalk; lateral leaflets are nearly sessile."
    },
    {
        "id": "taraxacum_officinale",
        "common_name": "Common Dandelion",
        "scientific_name": "Taraxacum officinale",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Asterales",
            "family": "Asteraceae",
            "genus": "Taraxacum",
            "species": "Taraxacum officinale"
        },
        "visual_characteristics": [
            "Bright butter-yellow composite flower heads composed of numerous ray florets",
            "Basal rosette of deeply runcinate, backwards-toothed leaves ('dent-de-lion')",
            "Hollow leafless flower scape exuding milky latex when snapped"
        ],
        "distinguishing_features": [
            "Spherical fruiting seed head ('clock') with pappus parachutes dispersed by breeze",
            "Leaves completely basal; no stem leaves present",
            "Deep persistent taproot"
        ],
        "lookalikes": [
            "Common Cat's-ear (Hypochaeris radicata) - branched solid flower stems with bristly leaves",
            "Coltsfoot (Tussilago farfara) - yellow flower appears before leaves; scaly stem"
        ],
        "habitat_notes": "Lawns, meadows, disturbed ground, trail margins, open sunny pastures.",
        "field_verification_tip": "Check the flower stalk: Dandelion stems are completely hollow, leafless scapes carrying a single flower head."
    },

    # --- WILDFLOWERS & SPRING EPHEMERALS (PLANTAE) ---
    {
        "id": "hepatica_nobilis",
        "common_name": "Liverleaf",
        "scientific_name": "Hepatica nobilis",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Ranunculales",
            "family": "Ranunculaceae",
            "genus": "Hepatica",
            "species": "Hepatica nobilis"
        },
        "visual_characteristics": [
            "Delicate solitary flowers in vivid blue, violet, lavender, or occasionally pink/white",
            "6 to 12 petal-like sepals surrounding prominent pale stamens and carpels",
            "Distinctive 3-lobed leathery basal leaves resembling human liver lobes"
        ],
        "distinguishing_features": [
            "Flower scapes are slender, hairy, and rise directly from forest leaf litter",
            "Three green sepal-like bracts sit directly beneath the floral cup",
            "Evergreen or overwintering mottled purplish-green basal foliage"
        ],
        "lookalikes": [
            "Virginia Bluebells (Mertensia virginica) - bell-shaped pendulous flowers in nodding clusters",
            "Wood Anemone (Anemone nemorosa) - white flowers with deeply divided leaves",
            "Common Bluebell (Hyacinthoides non-scripta) - tubular bell flowers on one-sided spike"
        ],
        "habitat_notes": "Rich, deciduous forest floor, beech-maple woods, rocky slopes, limestone soils in early spring.",
        "field_verification_tip": "Examine the basal leaves: look for thick, three-lobed liver-shaped leaves hugging the ground near the delicate blue flower stems."
    },
    {
        "id": "hepatica_americana",
        "common_name": "Round-lobed Hepatica",
        "scientific_name": "Hepatica americana",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Ranunculales",
            "family": "Ranunculaceae",
            "genus": "Hepatica",
            "species": "Hepatica americana"
        },
        "visual_characteristics": [
            "Solitary nodding to upward-facing blossoms in shades of pastel blue, lavender, or white",
            "Basal leaves with three distinctly rounded, blunt-tipped lobes",
            "Densely villous (fuzzy hairy) flower stalks arising before deciduous tree canopy opens"
        ],
        "distinguishing_features": [
            "Blunt, rounded leaf lobe margins distinguish it from Sharp-lobed Hepatica",
            "Three entire green bracts immediately under petals",
            "Blooms among damp moss and decayed leaf mulch in early April"
        ],
        "lookalikes": [
            "Sharp-lobed Hepatica (Hepatica acutiloba) - leaf lobes are pointed and acute at tips",
            "Liverleaf (Hepatica nobilis) - European nominal species with similar floral anatomy"
        ],
        "habitat_notes": "Dry to mesic deciduous woodlands, upland slopes, acidic or neutral forest loam.",
        "field_verification_tip": "Inspect the leaf tips: Round-lobed Hepatica leaves have softly curved, blunt lobes without sharp points."
    },
    {
        "id": "erythronium_americanum",
        "common_name": "Yellow Trout Lily",
        "scientific_name": "Erythronium americanum",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Liliopsida",
            "order": "Liliales",
            "family": "Liliaceae",
            "genus": "Erythronium",
            "species": "Erythronium americanum"
        },
        "visual_characteristics": [
            "Solitary nodding bright butter-yellow flower on slender scape",
            "Six reflexed yellow tepals curving backwards toward stem in midday sun",
            "Pair of basal lanceolate leaves mottled with rich purplish-brown spots resembling trout skin"
        ],
        "distinguishing_features": [
            "Prominent six stamens with chocolate brown or yellow anther morphs",
            "Forms extensive clonal colonies via underground corm droppers",
            "Strictly yellow petals with exterior bronze or purplish blush"
        ],
        "lookalikes": [
            "White Trout Lily (Erythronium albidum) - snow white to pale lavender tepals with softer leaf mottling",
            "Glacier Lily (Erythronium grandiflorum) - western montane species with unmottled solid green leaves"
        ],
        "habitat_notes": "Damp deciduous woods, stream ravines, bottomland forests in early spring.",
        "field_verification_tip": "Check the flowers and leaves: solitary nodding yellow flower with backward-curling tepals and heavily mottled brown-green foliage."
    },
    {
        "id": "erythronium_albidum",
        "common_name": "White Trout Lily",
        "scientific_name": "Erythronium albidum",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Liliopsida",
            "order": "Liliales",
            "family": "Liliaceae",
            "genus": "Erythronium",
            "species": "Erythronium albidum"
        },
        "visual_characteristics": [
            "Solitary nodding white flower with six reflexed tepals often tinged pink or lavender on reverse",
            "Pair of basal lanceolate leaves faintly mottled with purplish-green marbling",
            "Golden yellow anthers contrasting with white floral cup"
        ],
        "distinguishing_features": [
            "White floral color separates it immediately from Yellow Trout Lily",
            "Leaves have lighter, more diffuse mottling than E. americanum",
            "Yellow center inside throat near base of tepals"
        ],
        "lookalikes": [
            "Yellow Trout Lily (Erythronium americanum) - flower is brilliant butter-yellow",
            "Cutleaf Toothwort (Cardamine concatenata) - four-petaled white flower with deeply incised foliage"
        ],
        "habitat_notes": "Alluvial floodplains, mesic hardwood forests, rich limestone bottomlands.",
        "field_verification_tip": "Rule-out trait: flower is clear snow-white to soft lavender, not yellow."
    },
    {
        "id": "mertensia_virginica",
        "common_name": "Virginia Bluebells",
        "scientific_name": "Mertensia virginica",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Boraginales",
            "family": "Boraginaceae",
            "genus": "Mertensia",
            "species": "Mertensia virginica"
        },
        "visual_characteristics": [
            "Pendulous clusters of trumpet-shaped sky-blue flowers hanging in nodding cymes",
            "Flower buds begin pink before opening into sky-blue floral bells",
            "Smooth, glaucous grayish-green alternate leaves on juicy succulent stems"
        ],
        "distinguishing_features": [
            "Dramatic color transition from pink flower buds to powder-blue open blossoms",
            "Bell/trumpet-shaped fused corolla with five small spreading lobes",
            "Foliage senesces and vanishes completely by early summer after seeding"
        ],
        "lookalikes": [
            "Common Bluebell (Hyacinthoides non-scripta) - linear strappy leaves, one-sided raceme",
            "Harebell (Campanula rotundifolia) - single delicate blue bells on wiry grass-like stems",
            "Liverleaf (Hepatica nobilis) - solitary flat-faced flowers with distinct 3-lobed basal leaves"
        ],
        "habitat_notes": "Moist river floodplains, rich bottomland forests, alluvial terraces, damp ravines.",
        "field_verification_tip": "Notice the buds: young unopened buds are distinctly pink, turning sky-blue as the bell-shaped tubes expand."
    },
    {
        "id": "campanula_rotundifolia",
        "common_name": "Harebell",
        "scientific_name": "Campanula rotundifolia",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Asterales",
            "family": "Campanulaceae",
            "genus": "Campanula",
            "species": "Campanula rotundifolia"
        },
        "visual_characteristics": [
            "Slender nodding lavender-blue bell-shaped flowers on wiry, thread-like stems",
            "Five pointed spreading lobes terminating a true bell-shaped fused corolla",
            "Narrow linear stem leaves (basal round leaves usually wither before flowering)"
        ],
        "distinguishing_features": [
            "Wiry, remarkably flexible stems that sway in alpine and cliff winds without snapping",
            "Solitary or loosely clustered nodding bell blossoms",
            "Pale blue to violet petals with protruding style"
        ],
        "lookalikes": [
            "Virginia Bluebells (Mertensia virginica) - much larger trumpet bells in dense drooping cymes",
            "Common Bluebell (Hyacinthoides non-scripta) - thicker succulent scape, strappy foliage"
        ],
        "habitat_notes": "Rocky cliffs, dry grasslands, sandy banks, alvars, subalpine slopes.",
        "field_verification_tip": "Look at the stems: Harebells have extremely delicate wiry stems bearing drooping blue bells that nod in the wind."
    },
    {
        "id": "hyacinthoides_non_scripta",
        "common_name": "Common Bluebell",
        "scientific_name": "Hyacinthoides non-scripta",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Liliopsida",
            "order": "Asparagales",
            "family": "Asparagaceae",
            "genus": "Hyacinthoides",
            "species": "Hyacinthoides non-scripta"
        },
        "visual_characteristics": [
            "One-sided drooping flower spike (raceme) carrying 5 to 16 violet-blue tubular bells",
            "Top of the flowering stem curves distinctly downward like a shepherd's crook",
            "Strappy, linear glossy green basal leaves and creamy-white pollen anthers"
        ],
        "distinguishing_features": [
            "Strong sweet fragrance in woodland carpets",
            "Flower petals parallel for most of tube with tips curling strongly backwards",
            "Strictly one-sided arrangement of flowers along the curved flowering scape"
        ],
        "lookalikes": [
            "Spanish Bluebell (Hyacinthoides hispanica) - upright stem, bells arranged all around scape, blue anthers",
            "Virginia Bluebells (Mertensia virginica) - broad rounded leaves, pink-to-blue bud transition"
        ],
        "habitat_notes": "Ancient broadleaf deciduous woods, hedgerows, bracken slopes in oceanic climates.",
        "field_verification_tip": "Check the stem arch: true Bluebells droop gracefully on one side with reflexed petal tips."
    },
    {
        "id": "claytonia_virginica",
        "common_name": "Spring Beauty",
        "scientific_name": "Claytonia virginica",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Caryophyllales",
            "family": "Montiaceae",
            "genus": "Claytonia",
            "species": "Claytonia virginica"
        },
        "visual_characteristics": [
            "Small five-petaled white flowers delicately striped with fine pink veins",
            "Pair of slender, dark green grass-like linear leaves midway up stem",
            "Flowers open only in direct sunlight, closing on cloudy days and at dusk"
        ],
        "distinguishing_features": [
            "Pink candy-stripe nectar guides radiating from floral center",
            "Petals are notched or softly rounded at tips",
            "Stamens have pink-tinted anthers"
        ],
        "lookalikes": [
            "Rue Anemone (Thalictrum thalictroides) - divided foliage, variable petal count",
            "Star Chickweed (Stellaria pubera) - deeply split white petals appearing as ten"
        ],
        "habitat_notes": "Deciduous forest floor, moist woodlands, shaded lawns, stream banks.",
        "field_verification_tip": "Inspect the petals closely: look for delicate hot-pink candy stripes tracing the five white petals."
    },
    {
        "id": "trillium_grandiflorum",
        "common_name": "White Trillium",
        "scientific_name": "Trillium grandiflorum",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Liliopsida",
            "order": "Liliales",
            "family": "Melanthiaceae",
            "genus": "Trillium",
            "species": "Trillium grandiflorum"
        },
        "visual_characteristics": [
            "Strict tripartite symmetry: three broad green leaves, three green sepals, three large white petals",
            "Pure white petals with wavy margins, turning soft rose-pink as the flower ages",
            "Prominent yellow anthers in center of the large open floral cup"
        ],
        "distinguishing_features": [
            "Single whorl of three leaves subtending a solitary upright flower",
            "Petals are significantly larger and wider than the green sepals beneath them",
            "Iconic indicator species of undisturbed mature rich hardwood forests"
        ],
        "lookalikes": [
            "Red Trillium (Trillium erectum) - deep maroon red petals with pungent carrion scent",
            "Painted Trillium (Trillium undulatum) - white petals with vivid crimson V-marks at base"
        ],
        "habitat_notes": "Rich, moist, mature deciduous hardwood forests, calcareous soils, ravines.",
        "field_verification_tip": "Count the parts: three broad leaves, three green sepals, and three pure white petals that fade to pink."
    },
    {
        "id": "sanguinaria_canadensis",
        "common_name": "Bloodroot",
        "scientific_name": "Sanguinaria canadensis",
        "taxonomy": {
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "class": "Magnoliopsida",
            "order": "Ranunculales",
            "family": "Papaveraceae",
            "genus": "Sanguinaria",
            "species": "Sanguinaria canadensis"
        },
        "visual_characteristics": [
            "Solitary pristine white flower with 8 to 12 pure white petals around golden stamens",
            "Single deeply scalloped, bluish-green palmately lobed leaf clasping the flower stem",
            "Fleshy underground rhizome contains vivid reddish-orange toxic latex sap"
        ],
        "distinguishing_features": [
            "The unfurling scalloped leaf wraps completely around the emerging floral bud like a cloak",
            "Short-lived blossom: petals shed within 2 to 3 days of opening",
            "Unique multi-lobed leaf shape that expands greatly after the flower drops"
        ],
        "lookalikes": [
            "Twinleaf (Jeffersonia diphylla) - leaf divided completely into two equal kidney lobes",
            "White Trillium (Trillium grandiflorum) - strictly three petals and three leaves"
        ],
        "habitat_notes": "Rich, moist deciduous woods, slopes along streams, floodplain benches.",
        "field_verification_tip": "Observe the leaf: look at how the large scalloped leaf wraps around the base of the white flower stalk."
    },

    # --- FUNGI ---
    {
        "id": "trametes_versicolor",
        "common_name": "Turkey Tail",
        "scientific_name": "Trametes versicolor",
        "taxonomy": {
            "kingdom": "Fungi",
            "phylum": "Basidiomycota",
            "class": "Agaricomycetes",
            "order": "Polyporales",
            "family": "Polyporaceae",
            "genus": "Trametes",
            "species": "Trametes versicolor"
        },
        "visual_characteristics": [
            "Thin, flexible fan-shaped bracket shelves clustering in overlapping rosettes",
            "Concentric semicircular bands of contrasting brown, cream, gray, blue, and ochre",
            "Velvety, finely haired upper cap surface with a sharp thin outer margin"
        ],
        "distinguishing_features": [
            "Pure white to cream porous underside with minute pores (3 to 8 per mm)",
            "Tough, leathery texture that bends without snapping easily",
            "Grows strictly on dead hardwood logs and stumps"
        ],
        "lookalikes": [
            "False Turkey Tail (Stereum ostrea) - underside is completely smooth without visible pores",
            "Violet Toothed Polypore (Trichaptum biforme) - underside has toothed purple pores"
        ],
        "habitat_notes": "Dead hardwood logs, fallen branches, decaying stumps in temperate woodlands.",
        "field_verification_tip": "Turn the bracket over: true Turkey Tail has a creamy white pore surface with tiny visible pinprick pores."
    },
    {
        "id": "amanita_muscaria",
        "common_name": "Fly Agaric",
        "scientific_name": "Amanita muscaria",
        "taxonomy": {
            "kingdom": "Fungi",
            "phylum": "Basidiomycota",
            "class": "Agaricomycetes",
            "order": "Agaricales",
            "family": "Amanitaceae",
            "genus": "Amanita",
            "species": "Amanita muscaria"
        },
        "visual_characteristics": [
            "Striking bright scarlet-red to orange-yellow convex cap",
            "Cap surface dotted with pyramidal white to cream warts (universal veil remnants)",
            "Stout white stipe with a skirt-like hanging membranous ring (annulus)"
        ],
        "distinguishing_features": [
            "Bulbous stipe base encircled by concentric scaly rings of universal veil tissue",
            "Free white gills under cap that do not touch the stem",
            "Highly toxic mushroom containing ibotenic acid and muscimol"
        ],
        "lookalikes": [
            "Caesar's Mushroom (Amanita caesarea) - cap lacks white warts, stipe and gills are yellow",
            "Yellow Blusher (Amanita flavorubescens) - flesh bruises reddish-pink when cut"
        ],
        "habitat_notes": "Mycorrhizal partner under birch, pine, fir, and spruce in northern and subalpine forests.",
        "field_verification_tip": "Look at the cap and base: bright red cap with white woolly warts, a hanging ring, and a concentric scaly bulb at base."
    },
    {
        "id": "pleurotus_ostreatus",
        "common_name": "Pearl Oyster Mushroom",
        "scientific_name": "Pleurotus ostreatus",
        "taxonomy": {
            "kingdom": "Fungi",
            "phylum": "Basidiomycota",
            "class": "Agaricomycetes",
            "order": "Agaricales",
            "family": "Pleurotaceae",
            "genus": "Pleurotus",
            "species": "Pleurotus ostreatus"
        },
        "visual_characteristics": [
            "Broad, fan-shaped oyster-like caps growing in shelving, tiered clusters on dead wood",
            "Cap color ranges from pearl-white and pale cream to gray-brown",
            "Decurrent white gills running down the rudimentary, off-center lateral stem"
        ],
        "distinguishing_features": [
            "Spore print is white to pale lilac-gray",
            "Mild anise-like or sweet mushroom fragrance",
            "Gills are deeply decurrent, extending down the short stubby stem base"
        ],
        "lookalikes": [
            "Angel Wings (Pleurocybella porrigens) - pure white, thinner flesh, grows strictly on conifer wood",
            "Jack O'Lantern (Omphalotus illudens) - bright pumpkin orange, toxic, grows in clusters"
        ],
        "habitat_notes": "Decaying hardwood trunks (especially beech, willow, aspen, and oak), year-round in cool wet weather.",
        "field_verification_tip": "Examine the gills: check that the white gills continue running down the short lateral stem."
    },
    {
        "id": "cantharellus_cibarius",
        "common_name": "Golden Chanterelle",
        "scientific_name": "Cantharellus cibarius",
        "taxonomy": {
            "kingdom": "Fungi",
            "phylum": "Basidiomycota",
            "class": "Agaricomycetes",
            "order": "Cantharellales",
            "family": "Cantharellaceae",
            "genus": "Cantharellus",
            "species": "Cantharellus cibarius"
        },
        "visual_characteristics": [
            "Vibrant egg-yolk yellow to golden-orange funnel-shaped cap with wavy, undulating margins",
            "Blunt, forked, vein-like ridges under cap rather than true blade gills",
            "Solid, pale yellow flesh with distinctive fruity aroma resembling fresh apricots"
        ],
        "distinguishing_features": [
            "Underside has blunt, shallow, cross-veined ridges running deeply down the stipe",
            "Stem is solid throughout, not hollow",
            "Never grows in dense clustered shelf formations directly out of wood; roots in soil"
        ],
        "lookalikes": [
            "Jack O'Lantern (Omphalotus illudens) - true razor-thin gills, hollow stems, clusters directly on dead wood, toxic",
            "False Chanterelle (Hygrophoropsis aurantiaca) - true crowded forked gills, brown center"
        ],
        "habitat_notes": "Mycorrhizal partner in mossy hardwood and mixed conifer forests in mid to late summer.",
        "field_verification_tip": "Inspect the ridges under the cap: Chanterelles have blunt, rounded, forked veins, not paper-thin blade gills."
    },

    # --- MAMMALS & REPTILES ---
    {
        "id": "sciurus_carolinensis",
        "common_name": "Eastern Gray Squirrel",
        "scientific_name": "Sciurus carolinensis",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Mammalia",
            "order": "Rodentia",
            "family": "Sciuridae",
            "genus": "Sciurus",
            "species": "Sciurus carolinensis"
        },
        "visual_characteristics": [
            "Grizzled gray coat with variable tan or cinnamon wash on face and feet",
            "Bushy tail fringed with silver-white tipped guard hairs",
            "Pure white to pale cream belly"
        ],
        "distinguishing_features": [
            "White tail edging conspicuous when flicked in alarm",
            "Melanistic (solid black) morphs common in northern range",
            "Master tree-climber: ankles rotate 180 degrees to descend trunks headfirst"
        ],
        "lookalikes": [
            "Eastern Fox Squirrel (Sciurus niger) - noticeably larger, rich rust-orange underparts",
            "American Red Squirrel (Tamiasciurus hudsonicus) - much smaller, reddish back, noisy chattering"
        ],
        "habitat_notes": "Hardwood and mixed forests, city parks, oak-hickory stands, residential neighborhoods.",
        "field_verification_tip": "Watch the tail in motion: look for the shimmering white halo fringe around the bushy tail."
    },
    {
        "id": "tamias_striatus",
        "common_name": "Eastern Chipmunk",
        "scientific_name": "Tamias striatus",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Mammalia",
            "order": "Rodentia",
            "family": "Sciuridae",
            "genus": "Tamias",
            "species": "Tamias striatus"
        },
        "visual_characteristics": [
            "Small ground squirrel with five dark brown-to-black stripes along back separated by two tan stripes",
            "Prominent white stripe bordered by black above and below eyes",
            "Tawny reddish-brown rump and cheeks with pure white underparts"
        ],
        "distinguishing_features": [
            "Extensible cheek pouches used to carry seeds and nuts to underground burrows",
            "Carries tail erect and stiff when running across ground",
            "Shrill bird-like chipping alarm call"
        ],
        "lookalikes": [
            "Least Chipmunk (Neotamias minimus) - smaller, stripes run all the way to base of tail",
            "Thirteen-lined Ground Squirrel (Ictidomys tridecemlineatus) - thirteen rows of spots and stripes"
        ],
        "habitat_notes": "Deciduous forest floors, rocky ledges, stone walls, fallen log tangles, gardens.",
        "field_verification_tip": "Notice the stripes: five distinct dark dorsal stripes ending at a reddish-brown rump."
    },
    {
        "id": "thamnophis_sirtalis",
        "common_name": "Common Garter Snake",
        "scientific_name": "Thamnophis sirtalis",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Reptilia",
            "order": "Squamata",
            "family": "Colubridae",
            "genus": "Thamnophis",
            "species": "Thamnophis sirtalis"
        },
        "visual_characteristics": [
            "Slender reptile with three yellowish or cream stripes running lengthwise on dark ground",
            "Central vertebral stripe accompanied by lateral stripes on scale rows 2 and 3",
            "Checkerboard pattern of black spots between stripes on greenish-gray ground"
        ],
        "distinguishing_features": [
            "Keeled (ridged) scales giving rough matte texture",
            "Harmless non-venomous colubrid with red tongue tipped with black",
            "Exudes musky scent from cloaca when handled defensively"
        ],
        "lookalikes": [
            "Ribbon Snake (Thamnophis saurita) - more slender, white spot in front of eye, lateral stripe on rows 3-4",
            "DeKay's Brownsnake (Storeria dekayi) - much smaller, tan-brown with parallel dark spots"
        ],
        "habitat_notes": "Meadows, marshes, stream margins, forest edges, suburban gardens, stone walls.",
        "field_verification_tip": "Look at the side stripes: Common Garter Snake side stripes sit on the 2nd and 3rd scale rows above the belly."
    },
    {
        "id": "chrysemys_picta",
        "common_name": "Painted Turtle",
        "scientific_name": "Chrysemys picta",
        "taxonomy": {
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "class": "Reptilia",
            "order": "Testudines",
            "family": "Emydidae",
            "genus": "Chrysemys",
            "species": "Chrysemys picta"
        },
        "visual_characteristics": [
            "Smooth, flattened dark olive or black upper shell (carapace)",
            "Vivid bright red and yellow margins and crescents along outer marginal scutes",
            "Yellow stripes along dark head and neck; yellow spot behind each eye"
        ],
        "distinguishing_features": [
            "Basks communally on half-submerged logs and rocks on sunny days",
            "Lower shell (plastron) is bright yellow or orange, often with dark central blotch",
            "Completely smooth shell without keels or jagged serrations"
        ],
        "lookalikes": [
            "Red-eared Slider (Trachemys scripta elegans) - bold crimson patch behind eyes, serrated rear shell",
            "Common Snapping Turtle (Chelydra serpentina) - massive head, saw-toothed tail, jagged shell"
        ],
        "habitat_notes": "Slow-moving freshwater ponds, marshes, shallow lakes with muddy bottoms and basking logs.",
        "field_verification_tip": "Look at the edge of the shell: Painted Turtles have brilliant red markings painted around the rim of the carapace."
    }
]

# ==============================================================================
# TAXONOMY EXTENSION REGISTRY: HOW TO CONTRIBUTE AND ADD NEW SPECIES
# ==============================================================================
# All biological traits must be grounded in peer-reviewed or verifiable natural
# history literature (e.g. Audubon, Sibley, Peterson, USDA Plants).
# NEVER fabricate diagnostic traits or hallucinate lookalikes.
#
# TEMPLATE FOR CONTRIBUTING SPECIES:
# {
#     "id": "<genus_species>",
#     "common_name": "<Common English Name>",
#     "scientific_name": "<Binomial nomenclature>",
#     "taxonomy": {
#         "kingdom": "Plantae | Animalia | Fungi",
#         "phylum": "...",
#         "class": "...",
#         "order": "...",
#         "family": "...",
#         "genus": "...",
#         "species": "..."
#     },
#     "visual_characteristics": [
#         "<Observable macroscopic feature 1>",
#         "<Observable macroscopic feature 2>",
#     ],
#     "distinguishing_features": [
#         "<Key trait separating this from nearest relatives in field>"
#     ],
#     "lookalikes": [
#         "<Lookalike Species (Scientific name) - key morphological difference>"
#     ],
#     "habitat_notes": "<Ecosystem, biome, light/moisture preferences>",
#     "field_verification_tip": "<One-line actionable sensory prompt for outdoor inspection>",
#     "verification_status": "verified | needs_human_verification"
# }
# ==============================================================================

# Species entries cataloged in the curated database with verified traits
VERIFIED_TAXA: List[str] = [t["id"] for t in TAXONOMY_DATABASE]

# Track candidate additions that require specialist in-field human verification:
NEEDS_HUMAN_VERIFICATION: List[str] = [
    "tsuga_canadensis",        # Eastern Hemlock (needle underside stomatal bands verification)
    "betula_alleghaniensis",   # Yellow Birch (wintergreen scent scrape check)
    "amanita_bisporigera",     # Eastern Destroying Angel (strict toxic mycological confirmation)
    "poecile_atricapillus",    # Black-capped Chickadee (distinction from Carolina Chickadee)
]


def get_curated_traits(identifier: str) -> Dict[str, Any]:
    """
    Safely retrieves curated field traits for a given taxon ID or common/scientific name.
    If the species has no entry in the knowledgebase, returns honest fallback prompts.
    Never fabricates biological facts.
    """
    clean = identifier.lower().strip()
    for entry in TAXONOMY_DATABASE:
        if (
            entry["id"] == clean
            or entry["scientific_name"].lower() == clean
            or entry["common_name"].lower() == clean
        ):
            return {
                "common_name": entry["common_name"],
                "scientific_name": entry["scientific_name"],
                "taxonomy": entry["taxonomy"],
                "visual_characteristics": entry["visual_characteristics"],
                "distinguishing_features": entry["distinguishing_features"],
                "lookalikes": entry.get("lookalikes", []),
                "habitat_notes": entry.get("habitat_notes", ""),
                "field_verification_tip": entry.get("field_verification_tip", ""),
                "has_curated_entry": True,
            }

    generic_prompt = "Not sure. Check leaf edges, bark, habitat, and markings."
    return {
        "common_name": identifier,
        "scientific_name": "",
        "taxonomy": {},
        "visual_characteristics": [generic_prompt],
        "distinguishing_features": [generic_prompt],
        "lookalikes": [],
        "habitat_notes": "",
        "field_verification_tip": generic_prompt,
        "has_curated_entry": False,
    }

