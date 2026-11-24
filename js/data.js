export const TITLE_SPACE =
  "Leave the upper half of the frame as calm, empty space so a title can be placed there later.";

/** Semantic "negative": Nano Banana has no negative-prompt field, so exclusions are described positively. */
export const DESERTED =
  "The scene is completely deserted and silent: no people, no animals, no birds, no vehicles, no footprints, no glowing lights or windows, no text or watermark.";

export const STYLES = {
  photo: {
    label: "Fotorealistis",
    text: "This must look like a real photograph, not a painting, illustration or CGI: shot on a full-frame camera with a 24mm lens at f/8 on a tripod, long exposure, natural available light only, real-world scale and weathered real materials, soft atmospheric haze, subtle film grain, slight lens vignetting and natural noise in the shadows, low contrast and desaturated tones without any oversaturated HDR look, in the spirit of large-format documentary landscape photography. It should feel quiet and meditative, suitable as a still background for a long ambient music video.",
  },
  matte: {
    label: "Matte Painting",
    text: "Render it as a cinematic, atmospheric matte painting with soft diffused light, low contrast and desaturated tones, minimal detail in the foreground, and a quiet, meditative feeling, suitable as a still background for a long ambient music video.",
  },
};

// Size/placement of the main structure (sentence: "A lone X stands {distance}.")
export const DISTANCES = [
  "in the middle distance, large enough to fill about a third of the frame height",
  "monumentally in the mid-ground, filling nearly half of the frame height",
  "far away on the horizon, small but still clearly recognizable in its details",
  "so tall that its upper part dissolves into the haze above",
];

export const EMPTINESS = [
  "endless negative space",
  "an infinite fading horizon",
  "layers of atmospheric haze receding into nothing",
  "a silent emptiness stretching forever",
];

export const LANDSCAPES = [
  {
    id: "abyssal", label: "Bawah Air (Abyssal)", landscape: "the lightless depths of the abyssal ocean",
    structure: ["sunken gothic cathedral", "submerged monolithic pillars"],
    decay: ["covered in silt and dark algae", "weathered stonework"],
    atmosphere: ["heavy underwater murk", "floating sediment", "layered murk fading into the deep"],
    lighting: ["faint diffused light barely reaching the depths"],
    foreground: ["a trail of broken stone columns on the seabed leading toward it", "rippled silt with a few fallen, half-buried statues"],
    palette: "muted teal, abyssal navy, and slate grey",
    swatch: ["#1d4a4f", "#101c33", "#5b6670"],
  },
  {
    id: "desert", label: "Gurun Pasir (Desert)", landscape: "a vast windswept desert",
    structure: ["half-buried cyclopean temple", "crumbling sandstone aqueduct"],
    decay: ["wind-eroded stone", "drifting sand dunes swallowing the base"],
    atmosphere: ["thick dust haze", "faint heat shimmer", "layered dust haze fading into the distance"],
    lighting: ["a pale veiled sun behind dust clouds"],
    foreground: ["half-buried fallen pillars leading the eye toward it", "sharp wind-carved ripples in the sand"],
    palette: "desaturated ochre, faded sepia, and dusty ash",
    swatch: ["#8a7146", "#6b5a45", "#8d8780"],
  },
  {
    id: "frozen", label: "Tundra / Es (Frozen)", landscape: "an endless frozen tundra",
    structure: ["monumental brutalist citadel", "giant frozen stone arches"],
    decay: ["encased in thick ice and rime frost", "snow-drifted ruins"],
    atmosphere: ["soft whiteout fog", "slowly drifting snow", "layered fog fading into the distance"],
    lighting: ["cold diffused arctic twilight"],
    foreground: ["a path of cracked blue ice leading toward it", "snow-covered fragments of broken arches"],
    palette: "icy pale blue, stark grey, and cold white",
    swatch: ["#a9c3d4", "#6e767c", "#e4ebef"],
  },
  {
    id: "forest", label: "Hutan Kabut (Forest)", landscape: "a dead fog-shrouded forest",
    structure: ["overgrown ancient viaduct", "forgotten moss-covered sanctuary"],
    decay: ["choked by dead vines and damp moss", "cracked wet stone"],
    atmosphere: ["dense low-lying mist", "light rain haze", "layered mist fading into the distance"],
    lighting: ["weak grey light filtering through a dead canopy"],
    foreground: ["a moss-covered stone causeway leading toward it", "still black water reflecting its silhouette"],
    palette: "muted moss green, charcoal, and damp slate",
    swatch: ["#4b5a3e", "#2b2d2f", "#4e5a62"],
  },
  {
    id: "alien", label: "Luar Angkasa / Planet Asing", landscape: "a barren alien planet",
    structure: ["derelict megastructure", "ancient obsidian monolith"],
    decay: ["weathered alien metal", "dust-covered geometric carvings"],
    atmosphere: ["thin cosmic dust", "eerie planetary fog", "layered fog fading into the distance"],
    lighting: ["distant dim starlight, soft faint shadows"],
    foreground: ["a line of smaller monoliths leading toward it", "glassy black rock faintly reflecting the sky"],
    palette: "pitch black, muted indigo, and cold silver",
    swatch: ["#08080c", "#34355e", "#a7adb8"],
  },
  {
    id: "urban", label: "Kota Kosong (Urban Liminal)", landscape: "an empty forgotten city",
    structure: ["endless flooded concrete atrium", "brutalist megablock"],
    decay: ["peeling damp concrete", "rusted steel beams", "stagnant still water"],
    atmosphere: ["heavy urban smog", "eerie stillness", "layered smog fading into the distance"],
    lighting: ["dim overcast sky, faint diffused skylight"],
    foreground: ["a flooded floor reflecting it like a dark mirror", "rows of identical concrete pillars leading toward it"],
    palette: "washed-out concrete grey, muted cyan, and rust",
    swatch: ["#7d7f80", "#4f7377", "#7a4a33"],
  },
];

// {L} is replaced by the landscape phrase.
export const MOODS = [
  { id: "solitude", label: "Ambient Solitude", desc: "Kesepian yang meditatif", weight: 4,
    camera: "A wide, minimalist landscape view of {L}, with a low horizon and the main structure placed off-center on a third of the frame.",
    feeling: "It feels overwhelmingly empty and lonely, as if time has stopped, and a contemplative silence hangs over everything." },
  { id: "kenopsia", label: "Kenopsia", desc: "Kemegahan yang ditinggalkan", weight: 2,
    camera: "A wide cinematic establishing shot of {L}, with the main structure placed on a third of the frame, large enough to show its weathered details.",
    feeling: "It carries an abandoned grandeur and a ghostly silence, a forsaken monument in slow, poetic decay." },
  { id: "megalophobia", label: "Megalophobia", desc: "Skala raksasa", weight: 2,
    camera: "A low-angle wide shot of {L}, so that the colossal structure towers over the empty land.",
    feeling: "Its scale is oppressive and dwarfing, an immense emptiness that makes the viewer feel insignificant." },
  { id: "liminal", label: "Liminal Space", desc: "Ruang transisi hampa", weight: 2,
    camera: "A perfectly symmetrical one-point perspective view of {L}, receding into infinite distance.",
    feeling: "It has an uncanny stillness, endless repeating architecture and a surreal sense of isolation." },
];

export const ASPECTS = ["16:9", "21:9", "9:16", "1:1", "3:2", "2:3"];
