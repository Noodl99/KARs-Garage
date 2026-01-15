
/*
 * KARs Garage — Air Ride
 * - Valid <a> tags for SRC/Video cells and "Be the first!" links
 * - URL normalization and readable labels
 * - Speedrider sort triangles hidden until user clicks (like SRC tables)
 * - Red accent before times removed
 * - Correct rules parsing from column C "Subcategory" (check UNRESTRICTED first)
 */

/* === Remote CSVs === */
const SRC_CSV   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_TA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=1618721256&single=true&output=csv";
const SR_FR_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=109124482&single=true&output=csv";

const TA_LABEL = /time\s*attack/i;
const FR_LABEL = /free\s*run/i;
const RESTRICTED   = /\brestricted\b/i;
const UNRESTRICTED = /\bunrestricted\b/i;

/* Course order for TOC */
const COURSE_ORDER = [
  "Floria Fields","Waveflow Waters","Airtopia Ruins","Crystalline Fissure","Steamgust Forge",
  "Cavernous Corners","Cyberion Highway","Mount Amberfalls","Galactic Nova","Fantasy Meadows",
  "Celestial Valley","Sky Sands","Frozen Hillside","Magma Flows","Beanstalk Park",
  "Machine Passage","Checker Knights","Nebula Belt"
];

/* Banners */
const BANNERS = {
  "Airtopia Ruins": "images/airtopia_banner.webp",
  "Beanstalk Park": "images/beanstalk_banner.webp",
  "Cavernous Corners": "images/Cavernous_banner.webp",
  "Checker Knights": "images/checker_banner.webp",
  "Celestial Valley": "images/Celestial_banner.webp",
  "Crystalline Fissure":"images/Crystalline_banner.webp",
  "Cyberion Highway": "images/Cyberion_Banner.webp",
  "Fantasy Meadows": "images/Fantasy_banner.webp",
  "Floria Fields": "images/Floria_banner.webp",
  "Frozen Hillside": "images/Frozen_banner.webp",
  "Galactic Nova": "images/Nova_Banner.webp",
  "Machine Passage": "images/Machine_Banner.webp",
  "Magma Flows": "images/Magma_Banner.webp",
  "Mount Amberfalls": "images/Amberfalls_banner.webp",
  "Nebula Belt": "images/Nebula_Banner.webp",
  "Sky Sands": "images/Sky_Banner.webp",
  "Steamgust Forge": "images/Steamgust_Banner.webp",
  "Waveflow Waters": "images/Waveflow_Banner.webp"
};

/* === Machine / Rider icons for SRC tables ===
 * Files live under:
 *   icons/machines/*.png
 *   icons/riders/*.png
 * We match by exact label first, then fall back to normalized keys.
 */

/* 1) Exact label → file path (your display strings) */
const ICONS_BY_LABEL = {
  rider: {
    'Pink Kirby':           'icons/riders/KARs_Kirby_icon.png',
    'Yellow/Green Kirby':   'icons/riders/KARs_Kirby_Yellow_icon.png',
    'Blue/Gray Kirby':      'icons/riders/KARs_Kirby_Blue_icon.png',
    'Red/Purple Kirby':     'icons/riders/KARs_Kirby_Red_icon.png',
    'King Dedede':          'icons/riders/KARs_King_Dedede_icon.png',
    'Meta Knight':          'icons/riders/KARs_Meta_Knight_icon.png',
    'Waddle Dee':           'icons/riders/KARs_Waddle_Dee_icon.png',
    'Bandana Dee':          'icons/riders/KARs_Bandana_Waddle_Dee_icon.png',
    'Waddle Doo':           'icons/riders/KARs_Waddle_Doo_icon.png',
    'Chef Kawasaki':        'icons/riders/KARs_Chef_Kawasaki_icon.png',
    'Knuckle Joe':          'icons/riders/KARs_Knuckle_Joe_icon.png',
    'Rick':                 'icons/riders/KARs_Rick_icon.png',
    'Gooey':                'icons/riders/KARs_Gooey_icon.png',
    'Cappy':                'icons/riders/KARs_Cappy_icon.png',
    'Rocky':                'icons/riders/KARs_Rocky_icon.png',
    'Scarfy':               'icons/riders/KARs_Scarfy_icon.png',
    'Starman':              'icons/riders/KARs_Starman_icon.png',
    'Lololo & Lalala':      'icons/riders/KARs_Lololo_%26_Lalala_icon.png', // URL-encoded ampersand
    'Marx':                 'icons/riders/KARs_Marx_icon.png',
    'Daroach':              'icons/riders/KARs_Daroach_icon.png',
    'Magolor':              'icons/riders/KARs_Magolor_icon.png',
    'Taranza':              'icons/riders/KARs_Taranza_icon.png',
    'Susie':                'icons/riders/KARs_Susie_icon.png',
    'Noir Dedede':          'icons/riders/KARs_Noir_Dedede_icon.png',
  },
  machine: {
    'Warp':             'icons/machines/KARs_Warp_Star_Icon.png',
    'Compact':          'icons/machines/KARs_Compact_Star_Icon.png',
    'Winged':           'icons/machines/KARs_Winged_Star_Icon.png',
    'Shadow':           'icons/machines/KARs_Shadow_Star_Icon.png',
    'Wagon':            'icons/machines/KARs_Wagon_Star_Icon.png',
    'Slick':            'icons/machines/KARs_Slick_Star_Icon.png',
    'Formula':          'icons/machines/KARs_Formula_Star_Icon.png',
    'Bulk':             'icons/machines/KARs_Bulk_Star_Icon.png',
    'Rocket':           'icons/machines/KARs_Rocket_Star_Icon.png',
    'Swerve':           'icons/machines/KARs_Swerve_Star_Icon.png',
    'Turbo':            'icons/machines/KARs_Turbo_Star_Icon.png',
    'Jet':              'icons/machines/KARs_Jet_Star_Icon.png',
    'Wheelie Bike':     'icons/machines/KARs_Wheelie_Bike_Icon.png',
    'Rex Wheelie':      'icons/machines/KARs_Rex_Wheeler_Icon.png',
    'Wheelie Scooter':  'icons/machines/KARs_Wheelie_Scooter_Icon.png',
    'Hop':              'icons/machines/KARs_Hop_Star_Icon.png',
    'Vampire':          'icons/machines/KARs_Vampire_Star_Icon.png',
    'Paper':            'icons/machines/KARs_Paper_Star_Icon.png',
    'Chariot':          'icons/machines/KARs_Chariot_Icon.png',
    'Battle Chariot':   'icons/machines/KARs_Battle_Chariot_Icon.png',
    'Tank':             'icons/machines/KARs_Tank_Star_Icon.png',
    'Bull Tank':        'icons/machines/KARs_Bull_Tank_Icon.png',
    'Transform':        'icons/machines/KARs_Transform_Star_Icon.png',
    'Dragoon':          'icons/machines/KARs_Dragoon_Icon.png',
    'Hydra':            'icons/machines/KARs_Hydra_Icon.png',
    'Leo':              'icons/machines/KARs_Leo_Icon.png',
    'Gigantes':         'icons/machines/KARs_Gigantes_Icon.png',
  }
};

/* 2) Normalized key → file path (fallback if labels vary slightly) */
const ICONS_BY_KEY = {
  rider: {
    'pink-kirby':            'icons/riders/KARs_Kirby_icon.png',
    'yellow-green-kirby':    'icons/riders/KARs_Kirby_Yellow_icon.png',
    'blue-gray-kirby':       'icons/riders/KARs_Kirby_Blue_icon.png',
    'red-purple-kirby':      'icons/riders/KARs_Kirby_Red_icon.png',
    'king-dedede':           'icons/riders/KARs_King_Dedede_icon.png',
    'meta-knight':           'icons/riders/KARs_Meta_Knight_icon.png',
    'waddle-dee':            'icons/riders/KARs_Waddle_Dee_icon.png',
    'bandana-dee':           'icons/riders/KARs_Bandana_Waddle_Dee_icon.png',
    'waddle-doo':            'icons/riders/KARs_Waddle_Doo_icon.png',
    'chef-kawasaki':         'icons/riders/KARs_Chef_Kawasaki_icon.png',
    'knuckle-joe':           'icons/riders/KARs_Knuckle_Joe_icon.png',
    'rick':                  'icons/riders/KARs_Rick_icon.png',
    'gooey':                 'icons/riders/KARs_Gooey_icon.png',
    'cappy':                 'icons/riders/KARs_Cappy_icon.png',
    'rocky':                 'icons/riders/KARs_Rocky_icon.png',
    'scarfy':                'icons/riders/KARs_Scarfy_icon.png',
    'starman':               'icons/riders/KARs_Starman_icon.png',
    'lololo-lalala':         'icons/riders/KARs_Lololo_%26_Lalala_icon.png',
    'marx':                  'icons/riders/KARs_Marx_icon.png',
    'daroach':               'icons/riders/KARs_Daroach_icon.png',
    'magolor':               'icons/riders/KARs_Magolor_icon.png',
    'taranza':               'icons/riders/KARs_Taranza_icon.png',
    'susie':                 'icons/riders/KARs_Susie_icon.png',
    'noir-dedede':           'icons/riders/KARs_Noir_Dedede_icon.png',
  },
  machine: {
    'warp':              'icons/machines/KARs_Warp_Star_Icon.png',
    'compact':           'icons/machines/KARs_Compact_Star_Icon.png',
    'winged':            'icons/machines/KARs_Winged_Star_Icon.png',
    'shadow':            'icons/machines/KARs_Shadow_Star_Icon.png',
    'wagon':             'icons/machines/KARs_Wagon_Star_Icon.png',
    'slick':             'icons/machines/KARs_Slick_Star_Icon.png',
    'formula':           'icons/machines/KARs_Formula_Star_Icon.png',
    'bulk':              'icons/machines/KARs_Bulk_Star_Icon.png',
    'rocket':            'icons/machines/KARs_Rocket_Star_Icon.png',
    'swerve':            'icons/machines/KARs_Swerve_Star_Icon.png',
    'turbo':             'icons/machines/KARs_Turbo_Star_Icon.png',
    'jet':               'icons/machines/KARs_Jet_Star_Icon.png',
    'wheelie-bike':      'icons/machines/KARs_Wheelie_Bike_Icon.png',
    'rex-wheelie':       'icons/machines/KARs_Rex_Wheeler_Icon.png',
    'wheelie-scooter':   'icons/machines/KARs_Wheelie_Scooter_Icon.png',
    'hop':               'icons/machines/KARs_Hop_Star_Icon.png',
    'vampire':           'icons/machines/KARs_Vampire_Star_Icon.png',
    'paper':             'icons/machines/KARs_Paper_Star_Icon.png',
    'chariot':           'icons/machines/KARs_Chariot_Icon.png',
    'battle-chariot':    'icons/machines/KARs_Battle_Chariot_Icon.png',
    'tank':              'icons/machines/KARs_Tank_Star_Icon.png',
    'bull-tank':         'icons/machines/KARs_Bull_Tank_Icon.png',
    'transform':         'icons/machines/KARs_Transform_Star_Icon.png',
    'dragoon':           'icons/machines/KARs_Dragoon_Icon.png',
    'hydra':             'icons/machines/KARs_Hydra_Icon.png',
    'leo':               'icons/machines/KARs_Leo_Icon.png',
    'gigantes':          'icons/machines/KARs_Gigantes_Icon.png',
  }
};

/* Helpers */
function normKey(s) {
  return String(s ?? '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

/* Pick best icon src for the given kind/label */
function iconSrc(kind, label) {
  const byLabel = ICONS_BY_LABEL[kind]?.[label];
  if (byLabel) return byLabel;
  const key = normKey(label);
  return ICONS_BY_KEY[kind]?.[key] ?? null;
}

/* Build a Machine/Rider cell that contains an icon (if available) + text (for accessibility) */
function buildIconCell(kind, value) {
  const label = String(value ?? '');
  const src   = iconSrc(kind, label);

  if (src) {
    return {
      cls: `cell--${kind} has-icon`,
      html: `
        <span class="cell-icon" aria-hidden="true">
          <img src="${src}" alt="" />
        </span>
        <span class="cell-text">${esc(label)}</span>
      `
    };
  }
  return {
    cls: `cell--${kind}`,
    html: `<span class="cell-text">${esc(label)}</span>`
  };
}

/* --- Exact "Be the first!" URLs --- */
const SRC_EMPTY_LINKS = {
  TA: {
    Restricted: {
      "Floria Fields": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Floria_Fields&variable_Rules=Restricted",
      "Waveflow Waters": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Waveflow_Waters&variable_Rules=Restricted",
      "Airtopia Ruins": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Airtopia_Ruins&variable_Rules=Restricted",
      "Crystalline Fissure": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Crystalline_Fissure&variable_Rules=Restricted",
      "Steamgust Forge": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Steamgust_Forge&variable_Rules=Restricted",
      "Cavernous Corners": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cavernous_Corners&variable_Rules=Restricted",
      "Cyberion Highway": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cyberion_Highway&variable_Rules=Restricted",
      "Mount Amberfalls": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Mount_Amberfalls&variable_Rules=Restricted",
      "Galactic Nova": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Galactic_Nova&variable_Rules=Restricted",
      "Fantasy Meadows": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Fantasy_Meadows&variable_Rules=Restricted",
      "Celestial Valley": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Celestial_Valley&variable_Rules=Restricted",
      "Sky Sands": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Sky_Sands&variable_Rules=Restricted",
      "Frozen Hillside": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Frozen_Hillside&variable_Rules=Restricted",
      "Magma Flows": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Magma_Flows&variable_Rules=Restricted",
      "Beanstalk Park": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Beanstalk_Park&variable_Rules=Restricted",
      "Machine Passage": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Machine_Passage&variable_Rules=Restricted",
      "Checker Knights": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Checker_Knights&variable_Rules=Restricted",
      "Nebula Belt": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Nebula_Belt&variable_Rules=Restricted"
    },
    Unrestricted: {
      "Floria Fields": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Floria_Fields&variable_Rules=Unrestricted",
      "Waveflow Waters": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Waveflow_Waters&variable_Rules=Unrestricted",
      "Airtopia Ruins": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Airtopia_Ruins&variable_Rules=Unrestricted",
      "Crystalline Fissure": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Crystalline_Fissure&variable_Rules=Unrestricted",
      "Steamgust Forge": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Steamgust_Forge&variable_Rules=Unrestricted",
      "Cavernous Corners": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cavernous_Corners&variable_Rules=Unrestricted",
      "Cyberion Highway": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cyberion_Highway&variable_Rules=Unrestricted",
      "Mount Amberfalls": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Mount_Amberfalls&variable_Rules=Unrestricted",
      "Galactic Nova": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Galactic_Nova&variable_Rules=Unrestricted",
      "Fantasy Meadows": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Fantasy_Meadows&variable_Rules=Unrestricted",
      "Celestial Valley": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Celestial_Valley&variable_Rules=Unrestricted",
      "Sky Sands": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Sky_Sands&variable_Rules=Unrestricted",
      "Frozen Hillside": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Frozen_Hillside&variable_Rules=Unrestricted",
      "Magma Flows": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Magma_Flows&variable_Rules=Unrestricted",
      "Beanstalk Park": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Beanstalk_Park&variable_Rules=Unrestricted",
      "Machine Passage": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Machine_Passage&variable_Rules=Unrestricted",
      "Checker Knights": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Checker_Knights&variable_Rules=Unrestricted",
      "Nebula Belt": "https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Nebula_Belt&variable_Rules=Unrestricted"
    }
  },
  FR: {
    Restricted: {
      "Floria Fields": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Floria_Fields&variable_Rules=Restricted",
      "Waveflow Waters": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Waveflow_Waters&variable_Rules=Restricted",
      "Airtopia Ruins": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Airtopia_Ruins&variable_Rules=Restricted",
      "Crystalline Fissure": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Crystalline_Fissure&variable_Rules=Restricted",
      "Steamgust Forge": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Steamgust_Forge&variable_Rules=Restricted",
      "Cavernous Corners": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cavernous_Corners&variable_Rules=Restricted",
      "Cyberion Highway": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cyberion_Highway&variable_Rules=Restricted",
      "Mount Amberfalls": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Mount_Amberfalls&variable_Rules=Restricted",
      "Galactic Nova": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Galactic_Nova&variable_Rules=Restricted",
      "Fantasy Meadows": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Fantasy_Meadows&variable_Rules=Restricted",
      "Celestial Valley": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Celestial_Valley&variable_Rules=Restricted",
      "Sky Sands": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Sky_Sands&variable_Rules=Restricted",
      "Frozen Hillside": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Frozen_Hillside&variable_Rules=Restricted",
      "Magma Flows": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Magma_Flows&variable_Rules=Restricted",
      "Beanstalk Park": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Beanstalk_Park&variable_Rules=Restricted",
      "Machine Passage": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Machine_Passage&variable_Rules=Restricted",
      "Checker Knights": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Checker_Knights&variable_Rules=Restricted",
      "Nebula Belt": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Nebula_Belt&variable_Rules=Restricted"
    },
    Unrestricted: {
      "Floria Fields": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Floria_Fields&variable_Rules=Unrestricted",
      "Waveflow Waters": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Waveflow_Waters&variable_Rules=Unrestricted",
      "Airtopia Ruins": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Airtopia_Ruins&variable_Rules=Unrestricted",
      "Crystalline Fissure": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Crystalline_Fissure&variable_Rules=Unrestricted",
      "Steamgust Forge": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Steamgust_Forge&variable_Rules=Unrestricted",
      "Cavernous Corners": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cavernous_Corners&variable_Rules=Unrestricted",
      "Cyberion Highway": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cyberion_Highway&variable_Rules=Unrestricted",
      "Mount Amberfalls": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Mount_Amberfalls&variable_Rules=Unrestricted",
      "Galactic Nova": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Galactic_Nova&variable_Rules=Unrestricted",
      "Fantasy Meadows": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Fantasy_Meadows&variable_Rules=Unrestricted",
      "Celestial Valley": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Celestial_Valley&variable_Rules=Unrestricted",
      "Sky Sands": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Sky_Sands&variable_Rules=Unrestricted",
      "Frozen Hillside": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Frozen_Hillside&variable_Rules=Unrestricted",
      "Magma Flows": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Magma_Flows&variable_Rules=Unrestricted",
      "Beanstalk Park": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Beanstalk_Park&variable_Rules=Unrestricted",
      "Machine Passage": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Machine_Passage&variable_Rules=Unrestricted",
      "Checker Knights": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Checker_Knights&variable_Rules=Unrestricted",
      "Nebula Belt": "https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Nebula_Belt&variable_Rules=Unrestricted"
    }
  }
};

/* --- CSV parsing (handles quotes, commas, newlines) --- */
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\r') { /* swallow CR */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += ch; }
    }
  }
  // flush last field/row
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  // drop empty lines
  return rows.filter(r => r.length && r.some(v => String(v).trim().length));
}

/* --- Helpers --- */
function idxOf(header, colName) {
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(colName).toLowerCase());
  return i < 0 ? null : i;
}

function makeAnchorId(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Normalize arbitrary URL-ish values to a safe, clickable URL */
function normalizeUrl(u) {
  if (!u) return '';
  const raw = String(u).trim();

  // already well-formed
  if (/^https?:\/\//i.test(raw)) return raw;

  // "https//example.com" -> add missing colon
  if (/^https?\/\/(?=\w)/i.test(raw)) return raw.replace(/^https?/i, m => m + ':');

  // "www.example.com" -> https://www.example.com
  if (/^www\./i.test(raw)) return 'https://' + raw;

  // "example.com[/path]" -> https://example.com[/path]
  if (/^[a-z0-9\-_.]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return 'https://' + raw;

  return raw;
}

/* Create a human-friendly label for a URL */
function labelForUrl(u) {
  try {
    const url = new URL(u);
    const path = url.pathname.replace(/\/+$/, '');
    const host = url.hostname.replace(/^www\./i, '');
    return host + (path && path !== '/' ? path : '');
  } catch {
    return String(u).replace(/^https?:\/\/(?:www\.)?/i, '');
  }
}

/* For speedrider.coresv.net links, prefer English by forcing lang=en */
function preferEnglishUrl(u) {
  const href = normalizeUrl(u);
  if (!href) return '';

  try {
    const url = new URL(href);
    // Only touch Speedrider host(s)
    if (/^(.+\.)?speedrider\.coresv\.net$/i.test(url.hostname)) {
      // Add or overwrite the lang param
      url.searchParams.set('lang', 'en');
      return url.toString();
    }
    return href;
  } catch {
    return href;
  }
}

/* Build an anchor cell */
function linkCell(url) {
  const href = normalizeUrl(url);
  if (!href) return '';
  const label = labelForUrl(href);
  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
}

/* Build empty-table link from exact map */
function buildSrcCategoryUrl(course, mode, rules) {
  const byMode = SRC_EMPTY_LINKS[mode] ?? {};
  const byRule = byMode[rules] ?? {};
  return byRule[course] ?? '';
}

/* Parse time to ms for sorting */
function toMillis(t) {
  const s = String(t ?? '').trim();
  let m;

  // mm'ss"ff (ff=2 or 3 digits)
  if ((m = s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))) {
    const mm = +m[1], ss = +m[2], frac = +m[3];
    const ms = m[3].length === 2 ? frac * 10 : frac;
    return (mm * 60 + ss) * 1000 + ms;
  }
  // mm:ss.mmm
  if ((m = s.match(/^(\d+):(\d{2})\.(\d{3})$/))) {
    const mm = +m[1], ss = +m[2], ms = +m[3];
    return (mm * 60 + ss) * 1000 + ms;
  }
  // hh:mm:ss.mmm
  if ((m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))) {
    const hh = +m[1], mm = +m[2], ss = +m[3], ms = +m[4];
    return ((hh * 3600) + (mm * 60) + ss) * 1000 + ms;
  }
  return Number.POSITIVE_INFINITY;
}

/* --- SRC tables --- */
function renderSrcTable(mountId, rows, ctx) {
  const mount = document.getElementById(mountId);
  if (!mount) return;


  const COLS = ["Player","Time","Machine","Rider","SRC Link","Video"];
  const colgroup = `
    <colgroup>
      <col style="width:18%">
      <col style="width:16%">
      <col style="width:18%">
      <col style="width:18%">
      <col style="width:15%">
      <col style="width:15%">
    </colgroup>
  `;


  let html = `<div class="table-scroll"><table class="table">${colgroup}<thead><tr>`;
  COLS.forEach(c => { html += `<th data-col="${c}">${c}<span class="sort-ind"></span></th>`; });
  html += '</tr></thead><tbody>';

  if (rows && rows.length) {
    const sorted = rows.slice().sort((a,b) => (a._ms - b._ms));
    sorted.forEach(r => {
      html += '<tr>';
      html += `<td>${r.Player ?? ''}</td>`;
      html += `<td class="td--time">${r.Time ?? ''}</td>`;
      const mCell = buildIconCell('machine', r.Machine);
      const rCell = buildIconCell('rider',   r.Rider);
      html += `<td class="${mCell.cls}">${mCell.html}</td>`;
      html += `<td class="${rCell.cls}">${rCell.html}</td>`;
      html += `<td>${linkCell(r.Link)}</td>`;
      html += `<td>${linkCell(r.Video)}</td>`;
      html += '</tr>';
    });
  } else {
    const url = buildSrcCategoryUrl(ctx.course, ctx.mode, ctx.rules);
    const linkHtml = url ? `<a href="${url}" target="_blank" rel="noopener">Be the first!</a>` : '';
    html += `<tr><td class="empty" colspan="${COLS.length}">
      <span class="empty-msg">
        <span>No runs submitted for this category.</span>
        ${linkHtml}
      </span>
    </td></tr>`;
  }
  html += '</tbody></table></div>';
  mount.innerHTML = html;

  // Click-sort logic
  const ths = mount.querySelectorAll('th'); let sortState = {};
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      const dir = (sortState.col === col && sortState.dir === 'asc') ? 'desc' : 'asc';
      sortState = { col, dir };
      const tbody = mount.querySelector('tbody');
      const rowsEl = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('.empty'));
      const idx = COLS.indexOf(col) + 1;
      rowsEl.sort((rA, rB) => {
        const a = rA.querySelector(`td:nth-child(${idx})`).textContent.trim();
        const b = rB.querySelector(`td:nth-child(${idx})`).textContent.trim();
        let cmp;
        if (col === 'Time') { cmp = toMillis(a) - toMillis(b); }
        else { cmp = a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }); }
        return dir === 'asc' ? cmp : -cmp;
      });
      rowsEl.forEach(el => tbody.appendChild(el));
      mount.querySelectorAll('.sort-ind').forEach(i => i.textContent = '');
      th.querySelector('.sort-ind').textContent = dir === 'asc' ? '▲' : '▼';
    });
  });
}

/* --- Speedrider strips --- */
const SR_STATE = new Map();

function renderSpeedriderStrip(mountId, entries) {
  const mount = document.getElementById(mountId); if (!mount) return;
  if (!entries || entries.length === 0) { mount.innerHTML = '<p class="muted">No data</p>'; return; }

  const sorted = entries.slice().sort((a,b) => {
    const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
    const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
    return ax - bx;
  });

  SR_STATE.set(mountId, { entries: sorted, sortKey:'time', dir:'asc' });

  mount.innerHTML = `
    <div class="sr-strip" data-mount="${mountId}">
      <div class="sr-left">
        <div class="sr-left-row" data-sort="time">Time <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="machine">Machine <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="rider">Rider <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="player">Player <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="link" aria-disabled="true">Link</div>
      </div>
      <div class="sr-records"></div>
    </div>
  `;
  paintSrRecords(mountId);

  const strip = mount.querySelector('.sr-strip');
  strip.querySelectorAll('.sr-left-row').forEach(row => {
    const key = row.getAttribute('data-sort');
    if (key === 'link') return;
    row.addEventListener('click', () => {
      const state = SR_STATE.get(mountId);
      let dir = 'asc';
      if (state.sortKey === key) dir = (state.dir === 'asc') ? 'desc' : 'asc';
      sortSr(mountId, key, dir);
      updateSrSortIndicators(strip, key, dir);
    });
  });
}

function updateSrSortIndicators(strip, activeKey, dir) {
  strip.querySelectorAll('.sr-left-row .sr-sort-ind').forEach(ind => ind.textContent = '');
  const row = strip.querySelector(`.sr-left-row[data-sort="${activeKey}"] .sr-sort-ind`);
  if (row) row.textContent = dir === 'asc' ? '◀' : '▶';
}

function sortSr(mountId, key, dir) {
  const state = SR_STATE.get(mountId);
  const entries = state.entries.slice();
  const cmpStr = (a,b) => a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' });
  let cmp;

  switch (key) {
    case 'machine': cmp = (a,b) => cmpStr(a.Machine ?? '', b.Machine ?? ''); break;
    case 'rider':   cmp = (a,b) => cmpStr(a.Rider ?? '',   b.Rider ?? '');   break;
    case 'player':  cmp = (a,b) => cmpStr(a.Player ?? '',  b.Player ?? '');  break;
    case 'time':    cmp = (a,b) => {
      const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
      const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
      return ax - bx;
    }; break;
    default:        cmp = () => 0;
  }
  entries.sort((a,b) => (dir === 'asc' ? cmp(a,b) : -cmp(a,b)));
  SR_STATE.set(mountId, { entries, sortKey:key, dir });
  paintSrRecords(mountId);
}

function paintSrRecords(mountId) {
  const strip = document.querySelector(`[data-mount="${mountId}"]`);
  const list = strip.querySelector('.sr-records');
  const { entries } = SR_STATE.get(mountId);

  list.innerHTML = entries.map((e, i) => {
    const cls = (i === 0) ? 'sr-col first' : (i === entries.length - 1 ? 'sr-col last' : 'sr-col');
    const rawHref = normalizeUrl(e["Node Link"] ?? '') || normalizeUrl(e["Player Link"] ?? '');
    const nodeHref = preferEnglishUrl(rawHref);
    const linkHtml = nodeHref ? `<a href="${nodeHref}" target="_blank" rel="noopener">${labelForUrl(nodeHref)}</a>` : '';
    return `
      <div class="${cls}">
        <div class="sr-time">${e.Time ?? ''}</div>
        <div class="sr-row">${e.Machine ?? ''}</div>
        <div class="sr-row">${e.Rider ?? ''}</div>
        <div class="sr-row">${e.Player ?? ''}</div>
        <div class="sr-row">${linkHtml}</div>
      </div>
    `;
  }).join('');
}

/* --- Build Speedrider index --- */
function buildSrIndex(rows) {
  const header = rows[0].map(h => String(h).trim());
  const IDX = {
    Course:     idxOf(header,"Course"),
    Machine:    idxOf(header,"Machine"),
    Rider:      idxOf(header,"Rider"),
    Player:     idxOf(header,"Player"),
    Time:       idxOf(header,"Time"),
    TimeSec:    idxOf(header,"Time (sec)"),
    NodeLink:   idxOf(header,"Node Link"),
    PlayerLink: idxOf(header,"Player Link")
  };

  const byCourse = new Map();
  rows.slice(1).forEach(r => {
    const course = r[IDX.Course] ?? ''; if (!course) return;
    const entry = {
      "Time":        r[IDX.Time],
      "Machine":     r[IDX.Machine],
      "Rider":       r[IDX.Rider],
      "Player":      r[IDX.Player],
      "Node Link":   r[IDX.NodeLink],
      "Player Link": r[IDX.PlayerLink],
      _sec: Number(r[IDX.TimeSec] ?? NaN)
    };
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push(entry);
  });
  return byCourse;
}

/* --- MAIN --- */
async function loadAll() {
  // Footer year (redundant if script.js runs first; safe to keep)
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const [srcRes, srTaRes, srFrRes] = await Promise.all([
    fetch(SRC_CSV,   { cache:'no-cache' }),
    fetch(SR_TA_CSV, { cache:'no-cache' }),
    fetch(SR_FR_CSV, { cache:'no-cache' })
  ]);

  const [srcText, srTaText, srFrText] = await Promise.all([srcRes.text(), srTaRes.text(), srFrRes.text()]);
  const srcRows  = parseCSV(srcText);
  const srTaRows = parseCSV(srTaText);
  const srFrRows = parseCSV(srFrText);

  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category:   idxOf(srcHeader,"Category"),
    Subcategory:idxOf(srcHeader,"Subcategory"),
    Machine:    idxOf(srcHeader,"Machine"),
    Rider:      idxOf(srcHeader,"Rider"),
    Player:     idxOf(srcHeader,"Player"),
    Time:       idxOf(srcHeader,"Time"),
    Link:       idxOf(srcHeader,"Link"),
    Video:      idxOf(srcHeader,"Video")
  };

  // Build SRC by Course -> { TA: {Restricted,Unrestricted}, FR: {Restricted,Unrestricted} }
  const srcByCourse = new Map();
  srcRows.slice(1).forEach(r => {
    const category = r[SRC_IDX.Category] ?? '';
    const subcat   = r[SRC_IDX.Subcategory] ?? '';
    if (!category || !subcat) return;

    const mode = TA_LABEL.test(category) ? 'TA' : (FR_LABEL.test(category) ? 'FR' : 'OTHER');
    if (mode === 'OTHER') return;

    // "Course + Rules" or artifacts; split on " + "
    const parts = String(subcat).trim().replace(/\s*\+$/, '').split(/\s*\+\s*/);
    const course = (parts[0] ?? '').trim();
    const rulesText = (parts[1] ?? '').trim() || subcat;

    let rules = '';
    if (UNRESTRICTED.test(rulesText)) rules = 'Unrestricted';
    else if (RESTRICTED.test(rulesText)) rules = 'Restricted';
    if (!course || !rules) return;

    const rowObj = {
      Player:  r[SRC_IDX.Player],
      Time:    r[SRC_IDX.Time],
      Machine: r[SRC_IDX.Machine],
      Rider:   r[SRC_IDX.Rider],
      Link:    normalizeUrl(r[SRC_IDX.Link]),
      Video:   normalizeUrl(r[SRC_IDX.Video]),
      _ms:     toMillis(r[SRC_IDX.Time])
    };

    if (!srcByCourse.has(course)) {
      srcByCourse.set(course, { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} });
    }
    srcByCourse.get(course)[mode][rules].push(rowObj);
  });

  const srTaByCourse = buildSrIndex(srTaRows);
  const srFrByCourse = buildSrIndex(srFrRows);

  const content = document.getElementById('content');
  const nav     = document.getElementById('course-nav');

  const courseSet = new Set([...srcByCourse.keys(), ...srTaByCourse.keys(), ...srFrByCourse.keys()]);
  const orderedCourses = COURSE_ORDER.filter(c => courseSet.has(c));

  // Build TOC
  let navHtml = '';
  orderedCourses.forEach(course => {
    const id = makeAnchorId(course);
    if (course === 'Fantasy Meadows') {
      navHtml += '<div class="legacy-sep" aria-hidden="true"></div>';
    }
    navHtml += `<a href="#${id}">${course}</a>`;
  });
  nav.innerHTML = navHtml;

  // Build sections
  const sectionIds = [];
  orderedCourses.forEach(courseName => {
    const id = makeAnchorId(courseName);
    sectionIds.push(id);

    const srcCourse = srcByCourse.get(courseName) ?? { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} };
    const srTaCourse = srTaByCourse.get(courseName) ?? [];
    const srFrCourse = srFrByCourse.get(courseName) ?? [];

    const sec = document.createElement('section');
    sec.className = 'course';

    const bannerPath = BANNERS[courseName] ?? '';

    sec.innerHTML = `
      <span id="${id}" class="anchor"></span>
      <figure class="banner-wrap">
        <figcaption class="banner-title">${courseName}</figcaption>
      </figure>
      <div class="tables-grid">
        <article class="table-card"><h3>Time Attack - Restricted</h3><div id="${id}-ta-r"></div></article>
        <article class="table-card"><h3>Time Attack - Unrestricted</h3><div id="${id}-ta-u"></div></article>
        <article class="table-card"><h3>Free Run - Restricted</h3><div id="${id}-fr-r"></div></article>
        <article class="table-card"><h3>Free Run - Unrestricted</h3><div id="${id}-fr-u"></div></article>
        <article class="table-card wide"><h3>Speedrider - Time Attack Records by Machine</h3><div id="${id}-sr-ta"></div></article>
        <article class="table-card wide"><h3>Speedrider - Free Run Records by Machine</h3><div id="${id}-sr-fr"></div></article>
      </div>
      <hr class="section-divider" />
    `;

    const fig = sec.querySelector('.banner-wrap');
    if (bannerPath) {
      const img = document.createElement('img');
      img.className = 'course-banner';
      img.src = bannerPath;
      img.alt = `${courseName} banner`;
      fig.insertBefore(img, fig.firstChild);
    }

    content.appendChild(sec);

    renderSrcTable(`${id}-ta-r`, srcCourse.TA.Restricted,   { course:courseName, mode:'TA', rules:'Restricted'   });
    renderSrcTable(`${id}-ta-u`, srcCourse.TA.Unrestricted, { course:courseName, mode:'TA', rules:'Unrestricted' });
    renderSrcTable(`${id}-fr-r`, srcCourse.FR.Restricted,   { course:courseName, mode:'FR', rules:'Restricted'   });
    renderSrcTable(`${id}-fr-u`, srcCourse.FR.Unrestricted, { course:courseName, mode:'FR', rules:'Unrestricted' });

    renderSpeedriderStrip(`${id}-sr-ta`, srTaCourse);
    renderSpeedriderStrip(`${id}-sr-fr`, srFrCourse);
  });

  setupScrollSpy(sectionIds);

  // Smooth scroll for TOC links
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

function setupScrollSpy(sectionIds) {
  const links = sectionIds
    .map(id => ({ id, el: document.querySelector(`#course-nav a[href="#${id}"]`) }))
    .filter(x => x.el);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = links.find(l => l.id === id)?.el; if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.el.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { root:null, rootMargin:'0px 0px -60% 0px', threshold:0.25 });

  sectionIds.forEach(id => {
    const anchor = document.getElementById(id);
    if (anchor) observer.observe(anchor);
  });
}

document.addEventListener('DOMContentLoaded', loadAll);