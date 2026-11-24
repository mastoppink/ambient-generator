export const TEMPLATE =
  "{COMPOSITION}, {DISTANCE}, a lone {STRUCTURE} barely visible far away in {LANDSCAPE}, {SCALE_MOOD}, {DECAY}, veiled by {ATMOSPHERE}, under {LIGHTING}, {PALETTE}, {EMPTINESS}, vast empty space occupying most of the frame, low flat horizon, profound solitude, eternal stillness, quiet desolation, meditative atmosphere, kenopsia, devoid of life, low contrast, desaturated, soft diffused light, minimalist composition, ambient album cover, cinematic matte painting";

export const TITLE_SPACE = "large calm empty area in the upper half for title text";

export const NEGATIVE =
  "people, silhouettes of people, animals, birds, vehicles, footprints, lights, glowing windows, lens flare, bright sunlight, dramatic lighting, high contrast, vibrant colors, saturated, close-up, foreground clutter, busy composition, intricate details in foreground, text, watermark, cheerful, cartoon, low quality";

export const DISTANCES = [
  "seen from miles away",
  "tiny on the distant horizon",
  "a faint silhouette at the edge of visibility",
  "dwarfed by endless emptiness",
];

export const EMPTINESS = [
  "endless negative space",
  "infinite fading horizon",
  "layers of atmospheric haze receding into nothing",
  "silent emptiness stretching forever",
];

export const LANDSCAPES = [
  {
    id: "abyssal", label: "Bawah Air (Abyssal)", landscape: "the lightless depths of the abyssal ocean",
    structure: ["sunken gothic cathedral", "submerged monolithic pillars"],
    decay: ["covered in silt and dark algae", "weathered stonework"],
    atmosphere: ["heavy underwater murk", "floating sediment", "layered murk fading into the deep"],
    lighting: ["faint diffused light barely reaching the depths"],
    palette: "muted teal, abyssal navy, and slate grey",
    swatch: ["#1d4a4f", "#101c33", "#5b6670"],
  },
  {
    id: "desert", label: "Gurun Pasir (Desert)", landscape: "a vast windswept desert",
    structure: ["half-buried cyclopean temple", "crumbling sandstone aqueduct"],
    decay: ["wind-eroded stone", "drifting sand dunes swallowing the base"],
    atmosphere: ["thick dust haze", "faint heat shimmer", "layered dust haze fading into the distance"],
    lighting: ["a pale veiled sun behind dust clouds"],
    palette: "desaturated ochre, faded sepia, and dusty ash",
    swatch: ["#8a7146", "#6b5a45", "#8d8780"],
  },
  {
    id: "frozen", label: "Tundra / Es (Frozen)", landscape: "an endless frozen tundra",
    structure: ["monumental brutalist citadel", "giant frozen stone arches"],
    decay: ["encased in thick ice and rime frost", "snow-drifted ruins"],
    atmosphere: ["soft whiteout fog", "slowly drifting snow", "layered fog fading into the distance"],
    lighting: ["cold diffused arctic twilight"],
    palette: "icy pale blue, stark grey, and cold white",
    swatch: ["#a9c3d4", "#6e767c", "#e4ebef"],
  },
  {
    id: "forest", label: "Hutan Kabut (Forest)", landscape: "a dead fog-shrouded forest",
    structure: ["overgrown ancient viaduct", "forgotten moss-covered sanctuary"],
    decay: ["choked by dead vines and damp moss", "cracked wet stone"],
    atmosphere: ["dense low-lying mist", "light rain haze", "layered mist fading into the distance"],
    lighting: ["weak grey light filtering through a dead canopy"],
    palette: "muted moss green, charcoal, and damp slate",
    swatch: ["#4b5a3e", "#2b2d2f", "#4e5a62"],
  },
  {
    id: "alien", label: "Luar Angkasa / Planet Asing", landscape: "a barren alien planet",
    structure: ["derelict megastructure", "ancient obsidian monolith"],
    decay: ["weathered alien metal", "dust-covered geometric carvings"],
    atmosphere: ["thin cosmic dust", "eerie planetary fog", "layered fog fading into the distance"],
    lighting: ["distant dim starlight, soft faint shadows"],
    palette: "pitch black, muted indigo, and cold silver",
    swatch: ["#08080c", "#34355e", "#a7adb8"],
  },
  {
    id: "urban", label: "Kota Kosong (Urban Liminal)", landscape: "an empty forgotten city",
    structure: ["endless flooded concrete atrium", "brutalist megablock"],
    decay: ["peeling damp concrete", "rusted steel beams", "stagnant still water"],
    atmosphere: ["heavy urban smog", "eerie stillness", "layered smog fading into the distance"],
    lighting: ["dim overcast sky, faint diffused skylight"],
    palette: "washed-out concrete grey, muted cyan, and rust",
    swatch: ["#7d7f80", "#4f7377", "#7a4a33"],
  },
];

export const MOODS = [
  { id: "solitude", label: "Ambient Solitude", desc: "Kesepian yang meditatif", weight: 4,
    composition: "ultra wide minimalist landscape shot, tiny subject on a low horizon",
    scaleMood: "overwhelming emptiness, profound loneliness, time has stopped, contemplative silence" },
  { id: "kenopsia", label: "Kenopsia", desc: "Kemegahan yang ditinggalkan", weight: 2,
    composition: "ultra wide distant establishing shot, subject small in lower third",
    scaleMood: "abandoned grandeur, ghostly silence, poetic decay, forsaken monument" },
  { id: "megalophobia", label: "Megalophobia", desc: "Skala raksasa", weight: 2,
    composition: "extreme long shot from far below the horizon, colossal yet distant silhouette",
    scaleMood: "dwarfing perspective, towering oppressive scale, immense emptiness" },
  { id: "liminal", label: "Liminal Space", desc: "Ruang transisi hampa", weight: 2,
    composition: "symmetrical one-point perspective receding into infinite distance",
    scaleMood: "uncanny stillness, endless repeating architecture, surreal isolation" },
];

export const FORMATS = [
  { id: "plain", label: "Plain" },
  { id: "midjourney", label: "Midjourney" },
  { id: "sd", label: "Stable Diffusion" },
  { id: "flux", label: "Flux" },
];

export const ASPECTS = ["16:9", "21:9", "9:16", "1:1", "3:2", "2:3"];
