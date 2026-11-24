export const TITLE_SPACE =
  "Keep one calm, uncluttered area of the frame, such as the sky or the haze, where a title could be placed later.";

/** Semantic "negative": Nano Banana has no negative-prompt field, so exclusions are described positively. */
export const DESERTED =
  "The ground is clean and calm, with very little debris or clutter. The scene is completely deserted and silent: no people, no animals, no birds, no vehicles, no footprints, no glowing lights or windows, no text or watermark.";

export const STYLES = {
  photo: {
    label: "Fotorealistis",
    text: "This must look like a real photograph, not a painting, illustration or CGI: shot on a full-frame camera on a tripod, long exposure, deep focus with everything from foreground to background acceptably sharp, true monumental scale with no tilt-shift or miniature look, natural available light only, real-world scale and weathered real materials, soft atmospheric haze, subtle film grain, slight lens vignetting and natural noise in the shadows, low contrast and desaturated tones without any oversaturated HDR look, in the spirit of large-format documentary landscape photography. It should feel quiet and meditative, suitable as a still background for a long ambient music video.",
  },
  matte: {
    label: "Matte Painting",
    text: "Render it as a cinematic, atmospheric matte painting with soft diffused light, low contrast and desaturated tones, minimal detail in the foreground, true monumental scale with no miniature look, and a quiet, meditative feeling, suitable as a still background for a long ambient music video.",
  },
};

// Framing: camera position, lens, placement. "fg: false" = the framing has its own foreground, skip the foreground field.
export const FRAMINGS = [
  { label: "Simetris + pantulan", text: "Composition: perfectly centered and symmetrical, shot head-on at eye level with a 35mm lens; the structure sits in the exact middle and is mirrored in still water or polished ice below it, the horizon cutting the frame in half." },
  { label: "Dibingkai reruntuhan", fg: false, text: "Composition: frame within a frame, the structure is seen through a large broken archway or shattered window in the dark, out-of-focus foreground, which surrounds it on all sides; 28mm lens." },
  { label: "Dari dalam ke luar", fg: false, text: "Composition: shot from deep inside the ruin looking outward, its dark collapsed walls and columns forming the edges of the frame, while the open landscape and a second, more distant part of the structure glow faintly through the opening; 24mm lens." },
  { label: "Drone dari atas", fg: false, text: "Composition: high aerial view looking steeply down from a drone, the structure seen from above in the lower part of the frame, surrounded by vast textured ground patterns that fade into haze at the top; 35mm lens." },
  { label: "Telefoto berlapis", text: "Composition: long telephoto shot with a 200mm lens, strongly compressing distance; the structure and several fainter layers of ruins and terrain behind it are stacked like paper cut-outs, each layer paler in the haze." },
  { label: "Low angle menjulang", text: "Composition: extreme low angle from close to the base, looking almost straight up with a 16mm ultra-wide lens; the structure towers out of frame at the top, converging lines vanishing into the haze." },
  { label: "Muncul sebagian", text: "Composition: only part of the structure enters from the left edge of the frame, huge and cropped, the rest emerging from or dissolving into the fog; the right two-thirds of the frame is empty space; 50mm lens." },
  { label: "Horizon tinggi", text: "Composition: high horizon near the top of the frame; the ground dominates with rich textures receding into the distance, and the structure stands small but sharp near the top-left, against a thin band of sky; 24mm lens." },
  { label: "Diagonal menjauh", text: "Composition: the structure stretches diagonally from the near-left corner deep into the distance on the right, its repeated forms shrinking and fading into the haze; 28mm lens, slightly elevated viewpoint." },
  { label: "Kecil di kiri, ruang luas", text: "Composition: the structure is placed in the far left third, quite small but clearly readable, facing a huge empty space to the right; slightly elevated viewpoint, 35mm lens." },
];

// Unexpected but believable detail, to avoid predictable images.
export const TWISTS = [
  "",
  "the whole structure leans noticeably to one side, as if slowly sinking into the ground",
  "a wide staircase climbs its side and ends abruptly in mid-air",
  "a faint twin of the same structure repeats behind it, half-dissolved in the haze",
  "it is split in two by a wide crack, with haze flowing slowly through the gap",
  "a vast circular opening pierces its center, revealing the pale sky behind",
  "a single colossal fallen statue head lies half-buried near its base",
  "its upper part is perfectly intact while its base has crumbled away, as if it should not still be standing",
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
    foreground: ["two or three low, broken stone columns half-buried in the silt, loosely leading toward it", "rippled silt with a single fallen, half-buried statue"],
    medium: "It is clearly deep underwater: dense blue-green water haze, suspended particles, faint wavering caustic light from far above, and no trees, plants or land vegetation anywhere",
    palette: "muted teal, abyssal navy, and slate grey",
    swatch: ["#1d4a4f", "#101c33", "#5b6670"],
  },
  {
    id: "desert", label: "Gurun Pasir (Desert)", landscape: "a vast windswept desert",
    structure: ["half-buried cyclopean temple", "crumbling sandstone aqueduct"],
    decay: ["wind-eroded stone", "drifting sand dunes swallowing the base"],
    atmosphere: ["thick dust haze", "faint heat shimmer", "layered dust haze fading into the distance"],
    lighting: ["a pale veiled sun behind dust clouds"],
    foreground: ["one or two half-buried fallen pillars leading the eye toward it", "sharp wind-carved ripples in the sand"],
    medium: "It is clearly a vast dry desert: wind-blown sand hangs in the air, everything is dusted with fine sand, and there is no vegetation",
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
    medium: "It is clearly a frozen world: blowing ice crystals hang in the air, frost and snow settle on every surface, and nothing grows",
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
    medium: "It is clearly a dead, wet forest: damp air, bare grey trunks fading into the fog, wet reflective stone, and no green leaves",
    palette: "muted moss green, charcoal, and damp slate",
    swatch: ["#4b5a3e", "#2b2d2f", "#4e5a62"],
  },
  {
    id: "alien", label: "Luar Angkasa / Planet Asing", landscape: "a barren alien planet",
    structure: ["derelict megastructure", "ancient obsidian monolith"],
    decay: ["weathered alien metal", "dust-covered geometric carvings"],
    atmosphere: ["thin cosmic dust", "eerie planetary fog", "layered fog fading into the distance"],
    lighting: ["distant dim starlight, soft faint shadows"],
    foreground: ["two or three smaller, weathered monoliths loosely leading toward it", "glassy black rock faintly reflecting the sky"],
    medium: "It is clearly another planet: thin cold atmosphere, alien rock formations, and no plants, water or earthly vegetation",
    palette: "pitch black, muted indigo, and cold silver",
    swatch: ["#08080c", "#34355e", "#a7adb8"],
  },
  {
    id: "urban", label: "Kota Kosong (Urban Liminal)", landscape: "an empty forgotten city",
    structure: ["endless flooded concrete atrium", "brutalist megablock"],
    decay: ["peeling damp concrete", "rusted steel beams", "stagnant still water"],
    atmosphere: ["heavy urban smog", "eerie stillness", "layered smog fading into the distance"],
    lighting: ["dim overcast sky, faint diffused skylight"],
    foreground: ["a flooded floor reflecting it like a dark mirror", "a few identical concrete pillars receding toward it"],
    medium: "It is clearly an abandoned interior megastructure: still stagnant water, damp concrete, faint reflections, and no plants or furniture",
    palette: "washed-out concrete grey, muted cyan, and rust",
    swatch: ["#7d7f80", "#4f7377", "#7a4a33"],
  },
];

// {L} is replaced by the landscape phrase.
export const MOODS = [
  { id: "solitude", label: "Ambient Solitude", desc: "Kesepian yang meditatif", weight: 4,
    camera: "A quiet, minimalist photograph of {L}.",
    feeling: "It feels overwhelmingly empty and lonely, as if time has stopped, and a contemplative silence hangs over everything." },
  { id: "kenopsia", label: "Kenopsia", desc: "Kemegahan yang ditinggalkan", weight: 2,
    camera: "A cinematic photograph of {L}, full of abandoned grandeur.",
    feeling: "It carries an abandoned grandeur and a ghostly silence, a forsaken monument in slow, poetic decay." },
  { id: "megalophobia", label: "Megalophobia", desc: "Skala raksasa", weight: 2,
    camera: "A photograph of {L} that emphasizes overwhelming, dwarfing scale.",
    feeling: "Its scale is oppressive and dwarfing, an immense emptiness that makes the viewer feel insignificant." },
  { id: "liminal", label: "Liminal Space", desc: "Ruang transisi hampa", weight: 2,
    camera: "An uncanny, perfectly still photograph of {L}, full of endless repetition.",
    feeling: "It has an uncanny stillness, endless repeating architecture and a surreal sense of isolation." },
];

export const ASPECTS = ["16:9", "21:9", "9:16", "1:1", "3:2", "2:3"];

/** Follow-up edit instructions for Nano Banana (sent in the same chat, after an image was generated). */
export const REVISIONS = [
  { label: "Terlihat miniatur", text: "Remove the miniature / tilt-shift look: use deep focus so the foreground and background are both sharp, and make the structure feel truly monumental and real-world sized." },
  { label: "Terlihat tempelan", text: "Integrate the structure into the scene: apply the same haze, light direction and color grading to it, soften its contrast with distance, and cover it with the same dust or sediment as the ground." },
  { label: "Subjek terlalu kecil", text: "Make the main structure noticeably larger and closer, about a third of the frame height, while keeping the empty space around it." },
  { label: "Subjek terlalu besar", text: "Move the camera further back so the structure becomes smaller and more distant, with more empty space and haze around it." },
  { label: "Terlalu ramai", text: "Simplify the image: remove most of the debris, branches and small objects, keep the ground calm and clean, and keep only the main structure and the atmosphere." },
  { label: "Terlalu terang", text: "Make the whole image darker and moodier: lower the exposure, deepen the shadows, and keep only a faint, soft light." },
  { label: "Terlalu gelap", text: "Lift the shadows slightly so the structure and its details are readable, while keeping the dark, quiet mood." },
  { label: "Warna terlalu kuat", text: "Desaturate the colors and lower the contrast for a muted, calm, filmic look." },
  { label: "Kabut kurang", text: "Add more layered atmospheric haze between the camera and the structure, so the background fades softly." },
  { label: "Terlalu berkabut", text: "Reduce the haze slightly so the structure's shape and weathered details are clearer, keeping a soft atmosphere." },
  { label: "Mirip bangunan terkenal", text: "Redesign the structure so it no longer resembles any real or famous landmark: give it an original, unique architecture while keeping the same style and mood." },
  { label: "Kurang nyata", text: "Make it look like a real photograph: natural light, real weathered materials, subtle film grain and lens imperfections, no painterly or CGI look." },
  { label: "Ada objek aneh", text: "Remove any people, animals, vehicles, text, doors, lights or other out-of-place objects from the scene." },
  { label: "Ruang judul kurang", text: "Keep a larger calm, empty area of sky or haze, free of details, where a title can be placed." },
];
