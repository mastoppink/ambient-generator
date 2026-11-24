export const TEMPLATE =
  "{COMPOSITION}, a colossal {STRUCTURE} abandoned in {LANDSCAPE}, {SCALE_MOOD}, {DECAY}, surrounded by {ATMOSPHERE}, illuminated by {LIGHTING}, {PALETTE}, desolate environment concept art, kenopsia, megalophobia, dark ambient aesthetic, melancholic and solemn atmosphere, frozen in time, devoid of life, vast negative space, cinematic matte painting, ultra-detailed";

export const NEGATIVE =
  "people, silhouettes, animals, vehicles, bright sunlight, vibrant colors, cheerful, cluttered, cartoon, low quality";

export const LANDSCAPES = [
  {
    id: "abyssal", label: "Bawah Air (Abyssal)", landscape: "the lightless depths of the abyssal ocean",
    structure: ["sunken gothic cathedral", "submerged monolithic pillars"],
    decay: ["covered in silt and dark algae", "weathered stonework"],
    atmosphere: ["heavy underwater murk", "floating sediment"],
    lighting: ["dim volumetric god rays piercing deep water"],
    palette: "muted teal, abyssal navy, and slate grey",
    swatch: ["#1d4a4f", "#101c33", "#5b6670"],
  },
  {
    id: "desert", label: "Gurun Pasir (Desert)", landscape: "a vast windswept desert",
    structure: ["half-buried cyclopean temple", "crumbling sandstone aqueduct"],
    decay: ["wind-eroded stone", "drifting sand dunes swallowing the base"],
    atmosphere: ["thick dust haze", "heat shimmer"],
    lighting: ["pale overcast sun behind dust clouds"],
    palette: "desaturated ochre, faded sepia, and dusty ash",
    swatch: ["#8a7146", "#6b5a45", "#8d8780"],
  },
  {
    id: "frozen", label: "Tundra / Es (Frozen)", landscape: "an endless frozen tundra",
    structure: ["monumental brutalist citadel", "giant frozen stone arches"],
    decay: ["encased in thick ice and rime frost", "snow-drifted ruins"],
    atmosphere: ["blinding whiteout fog", "drifting snow"],
    lighting: ["cold diffused arctic twilight"],
    palette: "icy pale blue, stark grey, and cold white",
    swatch: ["#a9c3d4", "#6e767c", "#e4ebef"],
  },
  {
    id: "forest", label: "Hutan Kabut (Forest)", landscape: "a dead fog-shrouded forest",
    structure: ["overgrown ancient viaduct", "forgotten moss-covered sanctuary"],
    decay: ["choked by dead vines and damp moss", "cracked wet stone"],
    atmosphere: ["dense low-lying mist", "heavy rain haze"],
    lighting: ["weak grey light filtering through dead canopy"],
    palette: "muted moss green, charcoal, and damp slate",
    swatch: ["#4b5a3e", "#2b2d2f", "#4e5a62"],
  },
  {
    id: "alien", label: "Luar Angkasa / Planet Asing", landscape: "a barren alien planet",
    structure: ["derelict megastructure", "ancient obsidian monolith"],
    decay: ["weathered alien metal", "dust-covered geometric carvings"],
    atmosphere: ["thin cosmic dust", "eerie planetary fog"],
    lighting: ["distant dim starlight, harsh soft shadows"],
    palette: "pitch black, muted indigo, and cold silver",
    swatch: ["#08080c", "#34355e", "#a7adb8"],
  },
  {
    id: "urban", label: "Kota Kosong (Urban Liminal)", landscape: "an empty forgotten city",
    structure: ["endless flooded concrete atrium", "abandoned brutalist megablock"],
    decay: ["peeling damp concrete", "rusted steel beams", "stagnant puddles"],
    atmosphere: ["heavy urban smog", "eerie stillness"],
    lighting: ["dim overcast sky, faint diffused skylight"],
    palette: "washed-out concrete grey, muted cyan, and rust",
    swatch: ["#7d7f80", "#4f7377", "#7a4a33"],
  },
];

export const MOODS = [
  { id: "kenopsia", label: "Kenopsia", desc: "Kemegahan yang ditinggalkan",
    composition: "cinematic wide establishing shot",
    scaleMood: "abandoned grandeur, ghostly silence, poetic decay, forsaken monument" },
  { id: "megalophobia", label: "Megalophobia", desc: "Skala raksasa",
    composition: "extreme wide low-angle shot",
    scaleMood: "dwarfing perspective, towering oppressive scale, immense emptiness" },
  { id: "liminal", label: "Liminal Space", desc: "Ruang transisi hampa",
    composition: "symmetrical one-point perspective shot",
    scaleMood: "uncanny stillness, endless repeating architecture, surreal isolation" },
];

export const FORMATS = [
  { id: "plain", label: "Plain" },
  { id: "midjourney", label: "Midjourney" },
  { id: "sd", label: "Stable Diffusion" },
];

export const ASPECTS = ["21:9", "16:9", "3:2", "1:1", "2:3", "9:16"];
