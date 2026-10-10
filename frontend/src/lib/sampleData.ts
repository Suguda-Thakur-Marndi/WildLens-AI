import { Observation, FieldMission } from '@/src/types';

export const SAMPLE_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-001',
    common_name: 'Yellow Trout Lily',
    scientific_name: 'Erythronium americanum',
    family: 'Liliaceae',
    kingdom: 'Plantae',
    photo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD7S4LeZNWfZm1ctf9u3rkieaZRiW9670NhC06s5DyfxIBp-IV4HQjjgzyff27cS4wPfBQd_D8uTyiN4kTX3TFTV5yhT7Zs8JyctV4B9SJgbOqNJXUzpFJYpMMUrIbJL8Kr_YXDNc-GCpSM_8hrTXBjv61WvjsydB4omAXuS5h3k6SfrlYrJL-mn3R6CdQE-eNKqAvq2UHE_mLuJwaejuxJglYE0kQRxoqz8J1FooVR_ywH2QRukHW',
    date: 'Today, 10:14 AM',
    timestamp: Date.now() - 3600000 * 2,
    location: 'North Slope Ravine · Stream Bed',
    certainty: 91.4,
    status: 'User verified',
    elevation: '248 m',
    habitat: 'Deciduous Woodland',
    exposure: '1/320s · f/4.0',
    notes: 'Single nodding flower on damp mossy ground. Distinct purplish-brown mottled leaves resembling trout skin. 18 ramets in a 5m² radius.',
    diagnostic_traits: [
      'Two basal elliptical leaves mottled with purplish-brown bronze spots',
      'Six golden-yellow reflexed tepals curving backwards toward scape',
      'Six prominent stamens with chocolate brown anthers'
    ]
  },
  {
    id: 'obs-002',
    common_name: 'White Baneberry',
    scientific_name: 'Actaea pachypoda',
    family: 'Ranunculaceae',
    kingdom: 'Plantae',
    photo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2n9Zo8ee_zsnD1AdtFa8IWNHLZ8vyLpWRx9l3hAWwvn6l4_YRJ_xgBEL2gOeHuSY8kwj2Jm4irPVU7pVf4wYnSGBkz5kSZZYivZi2nGDu9X4F__E98whr6Ms4q_zc4CujXuSf1utetPwRG9FjGdmL-82cuQ8mTiPGKo44RDw9YbpYhMoE2ryLrYhCJa9Md09QQfKvv5S672zGaFS47MN3oRuOcjzbx2s2QD3YzrZL-TqU6rRV3T6X',
    date: 'Yesterday, 3:45 PM',
    timestamp: Date.now() - 86400000,
    location: 'Forest Loop · Hemlock Stand',
    certainty: 94.0,
    status: 'Unverified',
    elevation: '312 m',
    habitat: 'Northern Hardwood',
    exposure: '1/250s · f/5.6',
    notes: 'Distinctive porcelain white berries with striking dark central stigma spots on thickened magenta pedicels ("Doll\'s Eyes"). Toxic to mammals.',
    diagnostic_traits: [
      'Porcelain white spherical berries with black central dot',
      'Thickened crimson flower stalks (pedicels)',
      'Coarsely toothed bipinnate foliage'
    ]
  },
  {
    id: 'obs-003',
    common_name: 'Common Redpoll',
    scientific_name: 'Acanthis flammea',
    family: 'Fringillidae',
    kingdom: 'Animalia',
    photo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtxMiBqdFnmhB1JyWX4QrTbNyavnR7VSCZQ0BoknFhTmmIyQHEcKzTwykzKFhVHXln-HXnGA2uiOOtwcfwId5fHUIRWtD1gMAay4SOrIfrZ8NWm1zOJYN8VRkR0SwPMpbYwn7ZkyBNxqtZaQjD3iHhuHOW4htmGKqBm44bbzXKnApBr_LX013gqB64KZ6R7JOK3RD_FEHrJNXwLuPeAKcWweRdyQyVG9eNZX0iiz5su5xTBLPrT-up',
    date: '3 days ago',
    timestamp: Date.now() - 86400000 * 3,
    location: 'North Ridge · Alder Thicket',
    certainty: 88.0,
    status: 'Unverified',
    elevation: '420 m',
    habitat: 'Boreal Scrub',
    exposure: '1/1000s · f/4.0',
    notes: 'Flock of 6 foraging on frosted alder catkins. Vibrant crimson forehead cap and small yellow conical bill with black lores.',
    diagnostic_traits: [
      'Bright scarlet red patch on forehead crown',
      'Small pointed yellow seed-eating bill with black chin',
      'Heavily streaked brown and grayish flanks'
    ]
  },
  {
    id: 'obs-004',
    common_name: 'Turkey Tail Fungus',
    scientific_name: 'Trametes versicolor',
    family: 'Polyporaceae',
    kingdom: 'Fungi',
    photo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB33NEnK6AUlTkXt1Sw0pKR873lNIvwdXOElsAXqY1AJrsk9JcSL1bSte2gkC0aSk4rYzejLpJKDlS9rkzdywPMyvQivZM4uxhWbVgcCKGIDTALWi5kSZiZS9l92aULwzcFyo-90hz-bnkv-qQRcIAZZN9QrN5nm7vEQdlZWcis2Wdfo_RBRf2soIxcvGcQlodnO3dk_eEeTc-39BsyOQShpSQyBSlqdCqaA90Lesfw3CSjqu9D8-Ft',
    date: 'May 12, 11:20 AM',
    timestamp: Date.now() - 86400000 * 6,
    location: 'Creek Trail · Fallen Birch Log',
    certainty: 78.5,
    status: 'Unverified',
    elevation: '195 m',
    habitat: 'Riparian Woodland',
    exposure: '1/160s · f/8.0',
    notes: 'Dense imbricate clusters displaying velvety concentric bands of slate blue, rust, and cream. Underside shows minute white pores (3-8 per mm).',
    diagnostic_traits: [
      'Concentric multi-colored zones of brown, ochre, buff, and blue',
      'Finely velvety or tomentose upper cap surface',
      'Tiny white pore surface underneath (not gills)'
    ]
  },
  {
    id: 'obs-005',
    common_name: 'Monarch Chrysalis',
    scientific_name: 'Danaus plexippus',
    family: 'Nymphalidae',
    kingdom: 'Animalia',
    photo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA3mM48Rg2ohbcetB1MJU6FF6vV2Skd25hxsVGs6T1Fsf1dJ6C3jRo8G8oxytVbSH6VnONLvXoeN50WKfhA-VZyK79eHc4nrxbkv5XhJVhmR_DHx8zsTcljHNT4cl0bI5sqt89y5h2nsrsLbh20IujZQ71t3TRnyyK_WZ0scC_u-INtXqH4pjhuFLRIK93fP4dv0KjSnXCcoP7fuAx8g-eHakMM1vD8NR0GxrjrwDUQ7JV6yxpCZs2',
    date: 'May 8, 2:10 PM',
    timestamp: Date.now() - 86400000 * 10,
    location: 'Meadow Glade · Common Milkweed',
    certainty: 96.2,
    status: 'User verified',
    elevation: '180 m',
    habitat: 'Open Meadow',
    exposure: '1/500s · f/3.5',
    notes: 'Pupa suspended by black cremaster silk from underside of broad Asclepias leaf. Jade green with gleaming metallic golden dots along rim.',
    diagnostic_traits: [
      'Smooth jade-green cylindrical pupal capsule',
      'Transverse crown band of metallic gold-colored pips',
      'Suspended vertically under milkweed foliage'
    ]
  }
];

export const FIELD_MISSIONS: FieldMission[] = [
  {
    id: 'mission-01',
    title: 'The Lichen Micro-Safari',
    subtitle: 'Daily Naturalist Challenge',
    category: 'botany',
    duration: '10 min',
    difficulty: 'Easy',
    description: 'Find three distinct species of lichen on tree bark, stone, or old timber. Learn to distinguish between crustose (crust-like), foliose (leafy), and fruticose (shrubby hair-like) morphologies.',
    quote: '“Look closer; a single boulder holds an entire archipelago.”',
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjT3TGfSdp5sHWY7UHHD6rBzip6dhTM7D9BjIlAkgd1tCZRYc5_xnFAoTBu1PRCsyVDQ3xjuEJ3uQTX2ULA63mw_MDnvJGyA_inoZWJgsx2pxPq2KJ0fzgwlCKuGtFj3ysLmWcK4tCyRDCCcYK2epP_a5a0_-tTUpIbEWEaB5Q2VEG9OIv7ReMnLGtX7aIa8SMo4EQkEizdOpJzkSRClofO_Q3ed_ACb1OWyCFYWxHKnjlKvoCioVu',
    instructions: [
      'Locate a mature deciduous tree or unshaded stone surface.',
      'Gently touch the lichen without scratching or peeling it.',
      'Identify whether the growth is tightly glued (crustose) or has loose leaf-like margins (foliose).',
      'Observe the micro-habitat: which side of the trunk faces north or holds more dampness?'
    ],
    prompts: [
      'Did you notice any tiny cup-like apothecia (fruiting bodies)?',
      'How does the lichen color change between dry sunlight and moist shade?',
      'Take 2 minutes to inspect the tiny insects navigating the lichen surface.'
    ]
  },
  {
    id: 'mission-02',
    title: 'The Silent Bird Watcher',
    subtitle: 'Auditory & Visual Stalking',
    category: 'wildlife',
    duration: '15 min',
    difficulty: 'Moderate',
    description: 'Find a sheltered observation spot near forest edge or scrub. Remain completely still for 10 minutes without approaching. Observe natural flocking and feeding behavior without alarming birds.',
    quote: '“When the human becomes still, the forest resumes its conversation.”',
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtxMiBqdFnmhB1JyWX4QrTbNyavnR7VSCZQ0BoknFhTmmIyQHEcKzTwykzKFhVHXln-HXnGA2uiOOtwcfwId5fHUIRWtD1gMAay4SOrIfrZ8NWm1zOJYN8VRkR0SwPMpbYwn7ZkyBNxqtZaQjD3iHhuHOW4htmGKqBm44bbzXKnApBr_LX013gqB64KZ6R7JOK3RD_FEHrJNXwLuPeAKcWweRdyQyVG9eNZX0iiz5su5xTBLPrT-up',
    instructions: [
      'Choose a spot with your back against a tree trunk or boulder.',
      'Keep your device in your pocket and hands relaxed.',
      'Wait at least 3 minutes for the initial sentinel alarm calls to subside.',
      'Note the feeding rhythm: how many seconds does a bird pause to scan for raptors?'
    ],
    prompts: [
      'Did you detect any bird calls before seeing movement?',
      'How do small passerines position themselves relative to wind direction?',
      'Remember: no need to snap a photo if it risks flushing the bird.'
    ]
  },
  {
    id: 'mission-03',
    title: 'Twin Leaf Comparison',
    subtitle: 'Comparative Leaf Morphology',
    category: 'botany',
    duration: '8 min',
    difficulty: 'Easy',
    description: 'Collect or observe two leaves from different plant species growing within arm’s reach. Compare their margins, venation patterns, petiole attachment, and tactile surface coatings.',
    quote: '“Geometry is the silent language written across every leaf blade.”',
    image_url: '/sample_images/white_oak_leaf.jpg',
    instructions: [
      'Select one sunny canopy leaf and one shaded understory leaf.',
      'Trace the main veins with your fingertip from petiole to margin.',
      'Observe margin edges: are they smooth (entire), serrated (toothed), or lobed?',
      'Turn the leaf over: is the underside lighter, fuzzy, or waxy?'
    ],
    prompts: [
      'Hold the leaves up against sunlight. What secondary venation network appears?',
      'Why might sun leaves have thicker wax layers than shade leaves?',
      'Notice any herbivore nibble marks or leaf miner trails.'
    ]
  },
  {
    id: 'mission-04',
    title: 'Five-Minute Forest Symphony',
    subtitle: 'Aural Landscape Mapping',
    category: 'sensory',
    duration: '5 min',
    difficulty: 'Easy',
    description: 'Sit in a quiet natural clearing. Close your eyes for 5 full minutes. Categorize and map four distinct layers of outdoor sound: immediate wind, avian calls, water movement, and distant terrain resonance.',
    quote: '“Close your eyes so the woodland can expand beyond your sight.”',
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB33NEnK6AUlTkXt1Sw0pKR873lNIvwdXOElsAXqY1AJrsk9JcSL1bSte2gkC0aSk4rYzejLpJKDlS9rkzdywPMyvQivZM4uxhWbVgcCKGIDTALWi5kSZiZS9l92aULwzcFyo-90hz-bnkv-qQRcIAZZN9QrN5nm7vEQdlZWcis2Wdfo_RBRf2soIxcvGcQlodnO3dk_eEeTc-39BsyOQShpSQyBSlqdCqaA90Lesfw3CSjqu9D8-Ft',
    instructions: [
      'Find a stable dry seat and turn phone brightness down completely.',
      'Close eyes and take three measured breaths.',
      'Mentally separate sounds into cardinal directions: North, East, South, West.',
      'Count how many distinct bird song melodies overlap simultaneously.'
    ],
    prompts: [
      'What was the highest frequency sound you isolated? What was the lowest?',
      'How does the sound of wind vary between conifers and broadleaf trees?',
      'Open your eyes gently. How does the visual space feel now?'
    ]
  },
  {
    id: 'mission-05',
    title: 'The Pollinator Dance',
    subtitle: 'Insect-Flower Symbiosis',
    category: 'wildlife',
    duration: '12 min',
    difficulty: 'Moderate',
    description: 'Observe blooming wildflowers from at least 1 meter distance. Track a solitary bee, hoverfly, or butterfly as it visits blossoms. Record visitation duration and nectar-feeding stance.',
    quote: '“Every blossom is an open landing strip engineered over 100 million years.”',
    image_url: '/sample_images/monarch_butterfly.jpg',
    instructions: [
      'Locate a patch of open blossoms receiving direct morning sunlight.',
      'Stand still so your shadow does not fall across the target flowers.',
      'Follow a single pollinator for at least 5 consecutive flower visits.',
      'Observe whether pollen accumulates on thoracic hairs or abdominal scopa.'
    ],
    prompts: [
      'Does the insect land on specific floral petals or dive directly for nectaries?',
      'Do competing insects avoid flowers that were just visited?',
      'Notice any floral scent carried on the warm breeze.'
    ]
  }
];

export const PRESET_TEST_SPECIMENS = [
  {
    name: 'Yellow Trout Lily',
    file: 'yellow_trout_lily.jpg',
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD7S4LeZNWfZm1ctf9u3rkieaZRiW9670NhC06s5DyfxIBp-IV4HQjjgzyff27cS4wPfBQd_D8uTyiN4kTX3TFTV5yhT7Zs8JyctV4B9SJgbOqNJXUzpFJYpMMUrIbJL8Kr_YXDNc-GCpSM_8hrTXBjv61WvjsydB4omAXuS5h3k6SfrlYrJL-mn3R6CdQE-eNKqAvq2UHE_mLuJwaejuxJglYE0kQRxoqz8J1FooVR_ywH2QRukHW',
    candidate: {
      common_name: 'Yellow Trout Lily',
      scientific_name: 'Erythronium americanum',
      confidence: 0.914,
      family: 'Liliaceae',
      kingdom: 'Plantae',
      description: 'A quintessential native woodland spring ephemeral whose glossy, mottled leaves resemble the flanks of a brook trout. Arising in early April before canopy closure, it vanishes below soil by midsummer heat.',
      diagnostic_traits: [
        'Mottled foliage pairs: Two basal elliptical leaves mottled with purplish-brown bronze spots indicate a mature flowering specimen.',
        'Six reflexed yellow tepals: Floral tepals curve backwards toward the flowering scape, exposing delicate stamens.',
        'Six stamens with yellow or brown anthers: Prominent anthers are chocolate brown or yellow morphotypes.'
      ],
      lookalikes: [
        {
          common_name: 'White Trout Lily',
          scientific_name: 'Erythronium albidum',
          confidence: 0.061,
          difference: 'Displays snow-white to lavender tepals with softer marbling. Rule out: flower here is clearly butter yellow.'
        },
        {
          common_name: 'Glacier Lily',
          scientific_name: 'Erythronium grandiflorum',
          confidence: 0.018,
          difference: 'Yellow blossoms, but leaves are solid waxy green without brownish mottling. Subalpine western range.'
        }
      ]
    }
  },
  {
    name: 'Monarch Butterfly',
    file: 'monarch_butterfly.jpg',
    image_url: '/sample_images/monarch_butterfly.jpg',
    candidate: {
      common_name: 'Monarch Butterfly',
      scientific_name: 'Danaus plexippus',
      confidence: 0.948,
      family: 'Nymphalidae',
      kingdom: 'Animalia',
      description: 'An iconic migratory brush-footed butterfly known for bold black veins dividing brilliant tawny-orange wings edged in double rows of white dots.',
      diagnostic_traits: [
        'Tawny-orange wings with distinct black vein outlines and white marginal spotting',
        'Males display a small black scent gland pouch on inner hindwing veins',
        'Bold white dots decorating black thorax and head'
      ],
      lookalikes: [
        {
          common_name: 'Viceroy Butterfly',
          scientific_name: 'Limenitis archippus',
          confidence: 0.042,
          difference: 'Possesses a black postmedian horizontal line crossing hindwing veins. Smaller wing span.'
        }
      ]
    }
  },
  {
    name: 'American Robin',
    file: 'american_robin.jpg',
    image_url: '/sample_images/american_robin.jpg',
    candidate: {
      common_name: 'American Robin',
      scientific_name: 'Turdus migratorius',
      confidence: 0.932,
      family: 'Turdidae',
      kingdom: 'Animalia',
      description: 'A widespread songbird of the true thrush family, famous for its rich brick-red breast, dark charcoal head, white eye crescents, and energetic terrestrial foraging.',
      diagnostic_traits: [
        'Vibrant rufous to orange-red underparts contrasting with slate-gray back',
        'Broken white eye ring and streaked white chin throat patch',
        'Bright yellow bill with small dark tip'
      ],
      lookalikes: [
        {
          common_name: 'Varied Thrush',
          scientific_name: 'Ixoreus naevius',
          confidence: 0.051,
          difference: 'Distinct black breast band over orange chest, orange wing bars, and orange eyebrow stripe.'
        }
      ]
    }
  },
  {
    name: 'White Oak Leaf',
    file: 'white_oak_leaf.jpg',
    image_url: '/sample_images/white_oak_leaf.jpg',
    candidate: {
      common_name: 'White Oak',
      scientific_name: 'Quercus alba',
      confidence: 0.905,
      family: 'Fagaceae',
      kingdom: 'Plantae',
      description: 'A cornerstone long-lived North American deciduous canopy tree. Leaves display 7 to 9 rounded finger-like lobes lacking bristly tips.',
      diagnostic_traits: [
        'Alternating rounded lobes with deep sinuses, strictly lacking spine or bristle tips',
        'Bright green upper blade with pale glaucous whitish undersurface',
        'Light gray bark peeling in loose vertical shingled plates'
      ],
      lookalikes: [
        {
          common_name: 'Bur Oak',
          scientific_name: 'Quercus macrocarpa',
          confidence: 0.068,
          difference: 'Deep waist sinuses cutting almost to midrib, and fringed mossy acorn cups.'
        }
      ]
    }
  }
];
