// Our own fox drawings (from docs/design-reference). Static markup, safe for innerHTML.

export function foxMark(size = 28): string {
  return `<svg class="fox-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M3 3 L12 11 L20 11 L29 3 L27 17 L16 29 L5 17 Z" fill="var(--lilac)"/>
    <circle cx="11.5" cy="16" r="1.5" fill="var(--ink)"/>
    <circle cx="20.5" cy="16" r="1.5" fill="var(--ink)"/>
    <path d="M16 29 L13 22 L19 22 Z" fill="var(--ink)"/>
  </svg>`;
}

export function sleepingFox(className = ''): string {
  return `<svg class="fox ${className}" viewBox="0 0 240 170" aria-hidden="true" focusable="false">
  <g class="fox__tail">
    <path d="M70 128 C18 120 4 70 40 44 C70 22 112 34 112 62 C92 52 62 58 60 82 C58 104 80 118 110 124 C100 132 86 132 70 128 Z" fill="#f6c4d8"/>
    <path d="M40 44 C70 22 112 34 112 62 C100 50 80 46 64 52 C54 46 46 44 40 44 Z" fill="#fff6f8"/>
  </g>
  <g class="fox__body">
    <ellipse cx="128" cy="118" rx="78" ry="40" fill="#f6c4d8"/>
    <ellipse cx="132" cy="132" rx="58" ry="20" fill="#fde3ea"/>
    <g transform="translate(96 104)">
      <g fill="#fff" opacity=".9">
        <ellipse cx="0" cy="-6" rx="3.6" ry="6"/>
        <ellipse cx="0" cy="-6" rx="3.6" ry="6" transform="rotate(72)"/>
        <ellipse cx="0" cy="-6" rx="3.6" ry="6" transform="rotate(144)"/>
        <ellipse cx="0" cy="-6" rx="3.6" ry="6" transform="rotate(216)"/>
        <ellipse cx="0" cy="-6" rx="3.6" ry="6" transform="rotate(288)"/>
      </g>
      <circle r="2.4" fill="#e2b24c"/>
    </g>
  </g>
  <g class="fox__head">
    <g class="fox__ear-l">
      <path d="M164 70 L170 26 L192 62 Z" fill="#f6c4d8"/>
      <path d="M169 62 L172 38 L184 60 Z" fill="#e59bbd"/>
    </g>
    <g class="fox__ear-r">
      <path d="M196 62 L218 30 L222 76 Z" fill="#f6c4d8"/>
      <path d="M202 62 L216 42 L216 68 Z" fill="#e59bbd"/>
    </g>
    <ellipse cx="192" cy="96" rx="38" ry="32" fill="#f6c4d8"/>
    <path d="M168 108 C176 124 206 126 222 108 C214 116 182 118 168 108 Z" fill="#fff6f8"/>
    <path d="M174 94 q8 6 16 0" stroke="#5a3a6a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M200 94 q8 6 16 0" stroke="#5a3a6a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="196" cy="108" rx="3.4" ry="2.4" fill="#5a3a6a"/>
    <ellipse cx="170" cy="104" rx="6" ry="3" fill="#e59bbd" opacity=".45"/>
    <ellipse cx="222" cy="104" rx="6" ry="3" fill="#e59bbd" opacity=".45"/>
    <g class="fox__charm">
      <path d="M221 70 L228 86" stroke="#e2b24c" stroke-width="2.2"/>
      <circle cx="229" cy="90" r="5.5" fill="#e2b24c"/>
      <path d="M226 95 L223 108 M229 96 L229 110 M232 95 L235 108" stroke="#d9466f" stroke-width="1.8"/>
    </g>
  </g>
</svg>`;
}
