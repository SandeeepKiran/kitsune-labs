// Our own futuristic Yae Miko Electro Kitsune artwork (no game assets).
// Includes two modes controlled by [data-visual="totem" | "sigil"] in CSS:
// 1. Cyber-Kitsune & Sesshou Sakura Totem (.fox__totem-layer)
// 2. Minimalist Electro Sigils & Sacred Geometry (.fox__sigil-layer)
// Preserves .fox__tail, .fox__body, .fox__ear-r, .fox__charm for motion tests.

export function foxMark(size = 28): string {
  return `<svg class="fox-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="km-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f472b6"/>
        <stop offset="55%" stop-color="#c084fc"/>
        <stop offset="100%" stop-color="#eab308"/>
      </linearGradient>
    </defs>
    <!-- Outer shrine gold octagon frame -->
    <polygon points="16,1.5 26.5,5.5 30.5,16 26.5,26.5 16,30.5 5.5,26.5 1.5,16 5.5,5.5" fill="none" stroke="var(--gold)" stroke-width="1.2" opacity="0.7"/>
    <!-- Angular Cyber-Kitsune head -->
    <path d="M5,4 L12.5,11.5 L19.5,11.5 L27,4 L25,18 L16,28.5 L7,18 Z" fill="url(#km-grad)"/>
    <!-- Inner geometric facet -->
    <path d="M12.5,11.5 L16,17 L19.5,11.5 L22,18 L16,25 L10,18 Z" fill="#140926" opacity="0.82"/>
    <!-- Glowing Electro eyes -->
    <polygon points="10.2,15.2 13.8,16.5 11.2,17.8" fill="#fef08a"/>
    <polygon points="21.8,15.2 18.2,16.5 20.8,17.8" fill="#fef08a"/>
    <!-- Forehead Electro diamond crest -->
    <polygon points="16,9.5 17.6,12.2 16,14.9 14.4,12.2" fill="#eab308"/>
  </svg>`;
}

export function sleepingFox(className = ''): string {
  return `<svg class="fox ${className}" viewBox="0 0 260 180" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="electro-fur" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="50%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#7e22ce"/>
    </linearGradient>
    <linearGradient id="electro-core" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e9d5ff"/>
      <stop offset="50%" stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
    <linearGradient id="shrine-gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>

  <!-- Sacred Electro Telemetry Ring (shared base, spins subtly) -->
  <g class="fox__ring">
    <circle cx="130" cy="92" r="72" fill="none" stroke="url(#electro-core)" stroke-width="1" stroke-dasharray="6 8" opacity="0.55"/>
    <polygon points="130,14 134,22 126,22" fill="#eab308" opacity="0.8"/>
    <polygon points="130,170 134,162 126,162" fill="#c084fc" opacity="0.8"/>
    <polygon points="52,92 60,88 60,96" fill="#f472b6" opacity="0.8"/>
    <polygon points="208,92 200,88 200,96" fill="#eab308" opacity="0.8"/>
  </g>

  <!-- Crackling Electro Lightning Arcs -->
  <g class="fox__arc" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="28,68 48,56 42,42 66,30" stroke="#c084fc" stroke-width="1.8" opacity="0.85"/>
    <polyline points="198,34 218,46 210,58 234,70" stroke="#fef08a" stroke-width="1.6" opacity="0.8"/>
    <polyline points="42,140 66,148 60,158 88,162" stroke="#f472b6" stroke-width="1.5" opacity="0.7"/>
  </g>

  <!-- Tail / Outer Electro Energy Plume (animated with .fox__tail sway) -->
  <g class="fox__tail">
    <!-- Totem tail blades -->
    <path class="fox__totem-only" d="M58,136 L22,110 L32,64 L72,42 L98,60 L64,78 L58,108 L92,126 Z" fill="url(#electro-fur)" opacity="0.88" stroke="#eab308" stroke-width="1"/>
    <path class="fox__totem-only" d="M32,64 L72,42 L88,54 L54,68 Z" fill="#fef08a" opacity="0.75"/>
    <!-- Sigil outer geometric arc -->
    <path class="fox__sigil-only" d="M62,130 A58,58 0 0,1 82,42" fill="none" stroke="url(#shrine-gold)" stroke-width="2.5"/>
  </g>

  <!-- Core Body / Sacred Octagon Frame (animated with .fox__body breathe) -->
  <g class="fox__body">
    <!-- Hexagonal Shrine Pedestal & Holographic Torso -->
    <polygon points="74,132 104,112 156,112 186,132 166,154 94,154" fill="#1a0d33" stroke="url(#electro-core)" stroke-width="1.5"/>
    <polygon points="88,132 108,118 152,118 172,132 156,146 104,146" fill="url(#electro-fur)" opacity="0.35"/>
    <!-- Electro Three-Mitsudomoe / Crest Center -->
    <polygon points="130,66 154,92 130,118 106,92" fill="none" stroke="#eab308" stroke-width="1.6"/>
    <polygon points="130,74 146,92 130,110 114,92" fill="url(#electro-fur)" opacity="0.75"/>
    <circle cx="130" cy="92" r="5" fill="#fef08a"/>
  </g>

  <!-- Angular Cyber-Kitsune Spirit Head & Shrine Ears -->
  <g class="fox__head">
    <!-- Left Ear -->
    <g class="fox__ear-l">
      <polygon class="fox__totem-only" points="154,68 162,20 188,56" fill="url(#electro-fur)" stroke="#eab308" stroke-width="1.2"/>
      <polygon class="fox__totem-only" points="160,60 165,32 180,54" fill="#140926" opacity="0.7"/>
      <polygon class="fox__sigil-only" points="130,22 142,46 118,46" fill="none" stroke="#c084fc" stroke-width="1.8"/>
    </g>
    <!-- Right Ear (animated with .fox__ear-r twitch) -->
    <g class="fox__ear-r">
      <polygon class="fox__totem-only" points="192,56 220,22 224,72" fill="url(#electro-fur)" stroke="#eab308" stroke-width="1.2"/>
      <polygon class="fox__totem-only" points="198,56 215,34 217,64" fill="#140926" opacity="0.7"/>
      <polygon class="fox__sigil-only" points="166,46 190,34 178,60" fill="none" stroke="#eab308" stroke-width="1.8"/>
    </g>

    <!-- Geometric Kitsune Visor / Mask (Totem mode) -->
    <g class="fox__totem-only">
      <polygon points="152,68 190,54 224,72 216,108 188,124 156,104" fill="#170b2c" stroke="url(#electro-core)" stroke-width="1.6"/>
      <polygon points="162,72 190,62 214,76 188,116 164,98" fill="url(#electro-fur)" opacity="0.55"/>
      <!-- Glowing Cyber Eyes -->
      <polygon points="166,84 182,88 170,92" fill="#fef08a"/>
      <polygon points="210,84 194,88 206,92" fill="#fef08a"/>
      <!-- Shrine Forehead Crest -->
      <polygon points="188,68 193,76 188,84 183,76" fill="#eab308"/>
    </g>

    <!-- Sacred Geometry Crest (Sigil mode) -->
    <g class="fox__sigil-only">
      <polygon points="130,36 178,64 178,120 130,148 82,120 82,64" fill="none" stroke="url(#electro-core)" stroke-width="1.8"/>
      <polygon points="130,48 168,114 92,114" fill="none" stroke="#eab308" stroke-width="1.4" opacity="0.85"/>
      <polygon points="130,136 168,70 92,70" fill="none" stroke="#c084fc" stroke-width="1.4" opacity="0.85"/>
    </g>

    <!-- Shrine Gold Ear Charm / Ofuda Drop (animated with .fox__charm swing) -->
    <g class="fox__charm">
      <line x1="221" y1="70" x2="229" y2="86" stroke="#eab308" stroke-width="2"/>
      <polygon points="229,84 235,92 229,100 223,92" fill="url(#shrine-gold)"/>
      <rect x="225" y="100" width="8" height="16" rx="1" fill="#f472b6" stroke="#eab308" stroke-width="1"/>
    </g>
  </g>
</svg>`;
}
