export const DEFAULT_SEED = '#7c3aed';
export const DEFAULT_RADIUS = 12;
export const PRESETS = Object.freeze([
  { name: 'Violet', color: DEFAULT_SEED, secondary: '#475569', accent: '#14b8a6' },
  { name: 'Ocean', color: '#2563eb', secondary: '#475569', accent: '#06b6d4' },
  { name: 'Teal', color: '#0d9488', secondary: '#334155', accent: '#f59e0b' },
  { name: 'Orange', color: '#f97316', secondary: '#57534e', accent: '#0284c7' },
  { name: 'Rose', color: '#e11d48', secondary: '#575366', accent: '#8b5cf6' },
  { name: 'Slate', color: '#475569', secondary: '#1e293b', accent: '#38bdf8' },
  { name: 'Forest', color: '#15803d', secondary: '#44403c', accent: '#eab308' },
  { name: 'Indigo', color: '#4f46e5', secondary: '#64748b', accent: '#f472b6' },
  { name: 'Amber', color: '#d97706', secondary: '#57534e', accent: '#059669' },
  { name: 'Berry', color: '#a21caf', secondary: '#475569', accent: '#fb7185' },
  { name: 'Sky', color: '#0284c7', secondary: '#334155', accent: '#a3e635' },
  { name: 'Ink', color: '#18181b', secondary: '#71717a', accent: '#a78bfa' },
].map(Object.freeze));

export function parseHex(value) {
  if (typeof value !== 'string') return null;
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const digits = match[1].toLowerCase();
  return `#${digits.length === 3 ? [...digits].map(c => c + c).join('') : digits}`;
}

function channels(value) {
  const color = parseHex(value);
  if (!color) throw new TypeError('Expected a #RGB or #RRGGBB color.');
  return [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
}

// weight is the share of the second color, mixed in encoded sRGB channels.
export function mixHex(first, second, weight) {
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
    throw new RangeError('Mix weight must be between 0 and 1.');
  }
  const a = channels(first);
  const b = channels(second);
  return '#' + a.map((channel, index) =>
    Math.round(channel * (1 - weight) + b[index] * weight)
      .toString(16).padStart(2, '0')).join('');
}

function luminance(color) {
  const linear = channels(color).map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Scan whole percentages toward the mode's text endpoint; test unrounded ratios.
function readableText(candidate, backgrounds, endpoint) {
  for (let step = 0; step <= 100; step++) {
    const color = mixHex(candidate, endpoint, step / 100);
    if (backgrounds.every(background => contrastRatio(color, background) >= 4.5)) {
      return color;
    }
  }
  throw new RangeError('Unable to generate a readable text color.');
}

export function buildTheme(seed = DEFAULT_SEED, radius = DEFAULT_RADIUS, colors = {}) {
  const primary = parseHex(seed);
  if (!primary) throw new TypeError('Enter a color such as #7c3aed or #83f.');
  if (!Number.isInteger(radius) || radius < 0 || radius > 24) {
    throw new RangeError('Radius must be a whole number from 0 to 24.');
  }
  if (!colors || typeof colors !== 'object') throw new TypeError('Expected color options.');
  const palette = { primary };
  for (const [name, fallback] of [['secondary', '#64748b'], ['accent', '#14b8a6']]) {
    const value = colors[name] ?? mixHex(primary, fallback, 0.6);
    palette[name] = parseHex(value);
    if (!palette[name]) throw new TypeError(`Invalid ${name} color.`);
  }
  const paletteTokens = {};
  for (const [name, color] of Object.entries(palette)) {
    paletteTokens[name] = color;
    paletteTokens[`${name}-foreground`] = contrastRatio(color, '#000000') >=
      contrastRatio(color, '#ffffff') ? '#000000' : '#ffffff';
  }
  function mode(dark) {
    const textEndpoint = dark ? '#ffffff' : '#000000';
    // Neutrals carry only a trace of the brand; saturated fills stay intentional.
    const background = mixHex(dark ? '#101419' : '#f3f5f8', primary, 0.015);
    const surface = dark ? mixHex('#1c222b', primary, 0.02) : '#ffffff';
    const soft = Object.fromEntries(Object.entries(palette).map(([name, color]) =>
      [`${name}-soft`, mixHex(surface, color, dark ? 0.18 : 0.09)]));
    const foreground = readableText(dark ? '#ecf0f6' : '#192231',
      [background, surface, ...Object.values(soft)], textEndpoint);
    return {
      background,
      surface,
      foreground,
      muted: readableText(dark ? '#a3adbd' : '#5f6b7c',
        [surface], textEndpoint),
      ...paletteTokens,
      ...soft,
      border: mixHex(surface, foreground, dark ? 0.17 : 0.14),
      radius: `${radius}px`,
    };
  }
  return { seed: primary, radius, secondary: palette.secondary, accent: palette.accent,
    light: mode(false), dark: mode(true) };
}

export function exportCss(theme) {
  // Rebuild validated input so arbitrary values can never enter generated CSS.
  const validated = buildTheme(theme.seed, theme.radius, theme);
  const block = (selector, tokens) => `${selector} {\n${Object.entries(tokens)
    .map(([name, value]) => `  --tp-${name}: ${value};`).join('\n')}\n}`;
  const mappings = Object.keys(validated.light).map(name => name === 'radius'
    ? '  --radius-card: var(--tp-radius);'
    : `  --color-${name}: var(--tp-${name});`).join('\n');
  return `@import "tailwindcss";\n\n/* Generated by TintPair. Toggle .dark on <html>. */\n` +
    `${block(':root', validated.light)}\n\n${block('.dark', validated.dark)}\n\n` +
    `@theme inline {\n${mappings}\n}\n\n` +
    '@custom-variant dark (&:where(.dark, .dark *));\n';
}

// Older one-color links remain valid. Optional palette colors are validated independently.
export function parseConfig(fragment = '') {
  const params = new URLSearchParams(String(fragment).replace(/^#/, ''));
  const value = params.get('radius');
  const config = {
    seed: parseHex(params.get('seed')) ?? DEFAULT_SEED,
    radius: /^(?:\d|1\d|2[0-4])$/.test(value ?? '') ? Number(value) : DEFAULT_RADIUS,
  };
  for (const name of ['secondary', 'accent']) {
    const color = parseHex(params.get(name));
    if (color) config[name] = color;
  }
  return config;
}

export function configFragment(theme) {
  const valid = buildTheme(theme.seed, theme.radius, theme);
  const params = { seed: valid.seed, radius: String(valid.radius) };
  for (const name of ['secondary', 'accent']) {
    if (theme[name] != null) params[name] = valid[name];
  }
  return '#' + new URLSearchParams(params).toString();
}
