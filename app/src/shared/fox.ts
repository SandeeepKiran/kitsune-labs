// Sleek curved Kitsune line-art mark & calm minimalist illustration (no 3D polygons, no cartoon face).
// Preserves .fox__tail, .fox__body, .fox__ear-r, .fox__charm for motion tests, and renders
// consistently across Chrome and Firefox in both emblem modes.

export function foxMark(size = 28): string {
  return `<span class="fox-badge" style="width:${size}px;height:${size}px" aria-hidden="true">
    <svg class="fox-mark" width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" viewBox="0 0 24 24" fill="none" stroke="var(--logo-stroke)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      <path d="M5 4.5C5 4.5 8.5 9 10 9.5C11.3 9.9 12.7 9.9 14 9.5C15.5 9 19 4.5 19 4.5C20.2 9.5 19.5 14.5 12 20C4.5 14.5 3.8 9.5 5 4.5Z"/>
      <path d="M8.5 13.5L12 17L15.5 13.5"/>
    </svg>
  </span>`;
}

export function sleepingFox(className = ''): string {
  return `<svg class="fox ${className}" viewBox="0 0 240 160" aria-hidden="true" focusable="false">
  <!-- Subtle concentric ambient rings (centered at 120, 80) -->
  <g class="fox__ring">
    <circle class="fox__totem-only" cx="120" cy="80" r="64" fill="none" stroke="var(--sakura)" stroke-width="1" stroke-dasharray="4 6" opacity="0.28"/>
    <circle cx="120" cy="80" r="50" fill="none" stroke="var(--sakura)" stroke-width="1" opacity="0.18"/>
  </g>

  <!-- Soft outer aura arc behind the badge (animated with .fox__tail sway around 120, 80) -->
  <g class="fox__tail">
    <path d="M76 112 A54 54 0 0 1 76 48" fill="none" stroke="var(--logo-border)" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
    <path d="M164 48 A54 54 0 0 1 164 112" fill="none" stroke="var(--logo-border)" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>
  </g>

  <!-- Sleek rounded app-icon badge + curved Kitsune silhouette (animated with .fox__body breathe around 120, 80) -->
  <g class="fox__body">
    <rect x="82" y="42" width="76" height="76" rx="20" fill="var(--logo-bg)" stroke="var(--logo-border)" stroke-width="1.8"/>
    <path d="M98 56 C98 56 109 70 113.5 71.5 C117.5 72.8 122.5 72.8 126.5 71.5 C131 70 142 56 142 56 C145.5 71.5 143.5 87 120 104 C96.5 87 94.5 71.5 98 56 Z" fill="none" stroke="var(--logo-stroke)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M109 84 L120 95 L131 84" fill="none" stroke="var(--logo-stroke)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Subtle inner ear highlight & floating sakura dot (animated with .fox__ear-r and .fox__charm) -->
  <g class="fox__head">
    <g class="fox__ear-r">
      <path d="M131 66 L138 59" fill="none" stroke="var(--sakura)" stroke-width="1.6" stroke-linecap="round" opacity="0.65"/>
    </g>
    <g class="fox__charm">
      <circle cx="120" cy="64" r="2.2" fill="var(--sakura)" opacity="0.75"/>
    </g>
  </g>
</svg>`;
}
