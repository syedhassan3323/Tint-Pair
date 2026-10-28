import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS, filterProjects, validateProjectForm } from './app.mjs';
import { parseHex, mixHex, contrastRatio, buildTheme, exportCss, PRESETS,
  DEFAULT_SEED, DEFAULT_RADIUS, parseConfig, configFragment } from './theme.mjs';

test('normalizes short and long hex to lowercase six-digit values', () => {
  assert.equal(parseHex('#AbC'), '#aabbcc');
  assert.equal(parseHex('  #7C3AED  '), '#7c3aed');
  assert.equal(parseHex('#000'), '#000000');
});

test('rejects invalid colors without interpreting names, alpha, or CSS', () => {
  for (const value of ['', 'red', 'abc', '#12', '#1234', '#12345678', '#gggggg',
    '#123456;', '#fff\nbody{}', null, undefined, 123, {}, '#ff ff']) {
    assert.equal(parseHex(value), null, String(value));
  }
  assert.throws(() => buildTheme('#oops'), TypeError);
  assert.throws(() => mixHex('red', '#fff', 0.5), TypeError);
  assert.throws(() => contrastRatio('#fff', null), TypeError);
});

test('mixing has exact endpoints and rounds encoded sRGB channels', () => {
  assert.equal(mixHex('#abc', '#123', 0), '#aabbcc');
  assert.equal(mixHex('#abc', '#123', 1), '#112233');
  assert.equal(mixHex('#000', '#fff', 0.5), '#808080');
  for (const weight of [-0.1, 1.1, NaN, Infinity, '0.5']) {
    assert.throws(() => mixHex('#000', '#fff', weight), RangeError);
  }
});

test('contrast follows relative luminance, including the linear branch', () => {
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(contrastRatio('#fff', '#000'), 21);
  assert.equal(contrastRatio('#abc', '#abc'), 1);
  assert.ok(Math.abs(contrastRatio('#777', '#fff') - 4.478089453577214) < 1e-12);
  const linearLuminance = (10 / 255) / 12.92;
  assert.ok(Math.abs(contrastRatio('#0a0a0a', '#000') - (linearLuminance + 0.05) / 0.05) < 1e-12);
});

test('themes are deterministic, normalized, and preserve the selected primary', () => {
  const first = buildTheme('#83F', 8);
  assert.deepEqual(first, buildTheme('#8833ff', 8));
  assert.equal(first.seed, '#8833ff');
  assert.equal(first.light.primary, first.seed);
  assert.equal(first.dark.primary, first.seed);
  assert.equal(first.light.radius, '8px');
  assert.equal(first.dark.radius, '8px');
  first.light.primary = '#000000';
  assert.equal(buildTheme('#83F', 8).light.primary, '#8833ff');
});

function assertTextPairs(theme) {
  for (const mode of ['light', 'dark']) {
    const tokens = theme[mode];
    assert.deepEqual(Object.keys(tokens).sort(), ['background', 'border', 'foreground',
      'muted', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
      'accent', 'accent-foreground', 'primary-soft', 'secondary-soft', 'accent-soft',
      'radius', 'surface'].sort());
    for (const [text, background] of [['foreground', 'background'], ['foreground', 'surface'],
      ['muted', 'surface'], ['primary-foreground', 'primary'],
      ['secondary-foreground', 'secondary'], ['accent-foreground', 'accent'],
      ['foreground', 'primary-soft'], ['foreground', 'secondary-soft'],
      ['foreground', 'accent-soft']]) {
      assert.ok(contrastRatio(tokens[text], tokens[background]) >= 4.5,
        `${theme.seed} ${mode}: ${text}/${background}`);
    }
    const black = contrastRatio(theme.seed, '#000');
    const white = contrastRatio(theme.seed, '#fff');
    assert.equal(tokens['primary-foreground'], black >= white ? '#000000' : '#ffffff');
  }
}

for (const preset of PRESETS) {
  const { name, color } = preset;
  test(`${name}: both modes meet all required unrounded text thresholds`, () => {
    assertTextPairs(buildTheme(color, 12, preset));
  });
}

test('text checks hold at black, white, gray and a deterministic RGB grid', () => {
  for (const seed of ['#000000', '#ffffff', '#777777', '#ffff00', '#00ffff', '#ff00ff']) {
    assertTextPairs(buildTheme(seed));
  }
  for (let r = 0; r <= 255; r += 51) {
    for (let g = 0; g <= 255; g += 51) {
      for (let b = 0; b <= 255; b += 51) {
        const seed = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
        assertTextPairs(buildTheme(seed));
      }
    }
  }
});

test('radius accepts only whole numbers from zero through twenty-four', () => {
  for (const radius of [0, 12, 24]) {
    assert.equal(buildTheme('#abc', radius).dark.radius, `${radius}px`);
  }
  for (const radius of [-1, 25, 1.5, NaN, Infinity, '12', null]) {
    assert.throws(() => buildTheme('#abc', radius), RangeError);
  }
});

test('export contains every exact preview token under the correct selector', () => {
  for (const preset of PRESETS) {
    for (const radius of [0, 12, 24]) {
      const theme = buildTheme(preset.color, radius, preset);
      const css = exportCss(theme);
      assert.ok(css.startsWith('@import "tailwindcss";'));
      for (const [selector, mode] of [[':root', 'light'], ['.dark', 'dark']]) {
        const body = css.slice(css.indexOf(`${selector} {`) + selector.length + 2).split('}')[0];
        const tokens = Object.fromEntries([...body.matchAll(/--tp-([\w-]+):\s*([^;]+);/g)]
          .map(([, key, value]) => [key, value.trim()]));
        assert.deepEqual(tokens, theme[mode]);
      }
      assert.match(css, /@theme inline \{/);
      assert.match(css, /--color-primary: var\(--tp-primary\);/);
      assert.match(css, /--radius-card: var\(--tp-radius\);/);
      assert.match(css, /--color-secondary: var\(--tp-secondary\);/);
      assert.match(css, /--color-accent-foreground: var\(--tp-accent-foreground\);/);
      assert.match(css, /@custom-variant dark \(&:where\(\.dark, \.dark \*\)\);/);
      for (const [, name, target] of css.matchAll(/(--[\w-]+): var\((--[\w-]+)\)/g)) {
        assert.notEqual(name, target, 'variables must not reference themselves');
      }
    }
  }
});

test('export rejects untrusted configuration rather than inserting CSS', () => {
  assert.throws(() => exportCss({ seed: '#fff; body{}', radius: 12 }), TypeError);
  assert.throws(() => exportCss({ seed: '#fff', radius: '0; color:red' }), RangeError);
});

test('URL fragments restore valid values and safely default invalid ones', () => {
  assert.deepEqual(parseConfig('#seed=%2383F&radius=24&tracking=ignored'),
    { seed: '#8833ff', radius: 24 });
  assert.deepEqual(parseConfig('#seed=%23fff&radius=0'), { seed: '#ffffff', radius: 0 });
  for (const fragment of ['', '#seed=nope&radius=25', '#seed=%&radius=Infinity',
    '#seed=%3Cscript%3E&radius=1.5', '#radius=', '#radius=01', '#radius=-1']) {
    assert.deepEqual(parseConfig(fragment), { seed: DEFAULT_SEED, radius: DEFAULT_RADIUS });
  }
  assert.deepEqual(parseConfig('#seed=bad&radius=8'), { seed: DEFAULT_SEED, radius: 8 });
  assert.deepEqual(parseConfig('#seed=%23fff&radius=bad'), { seed: '#ffffff', radius: DEFAULT_RADIUS });
});

test('sharing serializes only validated seed and radius and round-trips', () => {
  const config = { seed: '#F90', radius: 18, arbitrary: 'not included' };
  const fragment = configFragment(config);
  assert.equal(fragment, '#seed=%23ff9900&radius=18');
  assert.deepEqual(parseConfig(fragment), { seed: '#ff9900', radius: 18 });
  assert.throws(() => configFragment({ seed: 'no', radius: 10 }), TypeError);
});

test('optional colors normalize and remain exact in both modes and exports', () => {
  const theme = buildTheme('#83f', 10, { secondary: '#F90', accent: '#0AB' });
  assert.equal(theme.secondary, '#ff9900');
  assert.equal(theme.accent, '#00aabb');
  for (const mode of ['light', 'dark']) {
    assert.equal(theme[mode].secondary, theme.secondary);
    assert.equal(theme[mode].accent, theme.accent);
  }
  assertTextPairs(theme);
  assert.match(exportCss(theme), /--tp-secondary: #ff9900;/);
  assert.match(exportCss(theme), /--tp-accent: #00aabb;/);
  for (const name of ['secondary', 'accent']) {
    assert.throws(() => buildTheme('#fff', 12, { [name]: 'red' }), TypeError);
    assert.throws(() => exportCss({ ...theme, [name]: '#fff; color:red' }), TypeError);
  }
});

test('automatic colors follow primary while explicit colors stay selected', () => {
  const first = buildTheme('#7c3aed');
  const second = buildTheme('#f97316');
  assert.equal(first.secondary, mixHex(first.seed, '#64748b', 0.6));
  assert.equal(first.accent, mixHex(first.seed, '#14b8a6', 0.6));
  assert.notEqual(first.secondary, second.secondary);
  assert.notEqual(first.accent, second.accent);
  const custom = buildTheme('#f97316', 12, { secondary: first.secondary, accent: first.accent });
  assert.equal(custom.secondary, first.secondary);
  assert.equal(custom.accent, first.accent);
});

test('sharing round-trips full palettes, ignores extras, and defaults invalid optional colors', () => {
  const theme = buildTheme('#83f', 24, { secondary: '#f90', accent: '#0ab' });
  const fragment = configFragment({ ...theme, appearance: 'dark', tracking: 'ignored' });
  assert.deepEqual(parseConfig(fragment), {
    seed: '#8833ff', radius: 24, secondary: '#ff9900', accent: '#00aabb',
  });
  assert.equal(fragment.includes('appearance'), false);
  assert.equal(fragment.includes('tracking'), false);
  assert.deepEqual(parseConfig('#seed=%23fff&secondary=oops&accent=%23abc&radius=8'),
    { seed: '#ffffff', radius: 8, accent: '#aabbcc' });
  const restored = parseConfig(fragment);
  assert.deepEqual(buildTheme(restored.seed, restored.radius, restored), theme);
});

test('backgrounds and borders stay near neutral for saturated seeds', () => {
  for (const seed of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#f97316']) {
    const theme = buildTheme(seed);
    for (const mode of ['light', 'dark']) {
      for (const token of ['background', 'surface', 'border']) {
        const channels = theme[mode][token].slice(1).match(/../g).map(hex => parseInt(hex, 16));
        assert.ok(Math.max(...channels) - Math.min(...channels) <= 22,
          `${seed} ${mode} ${token} should stay neutral`);
      }
      assert.notEqual(theme[mode].background, theme[mode].surface);
    }
  }
});

test('soft fills follow palette colors while keeping readable neutral text', () => {
  for (const seed of ['#000', '#fff', '#f90', '#00f']) {
    const theme = buildTheme(seed, 12, { secondary: '#fff', accent: '#000' });
    for (const mode of ['light', 'dark']) {
      for (const name of ['primary', 'secondary', 'accent']) {
        assert.equal(theme[mode][`${name}-soft`], mixHex(theme[mode].surface,
          theme[mode][name], mode === 'dark' ? 0.18 : 0.09));
        assert.ok(contrastRatio(theme[mode].foreground, theme[mode][`${name}-soft`]) >= 4.5);
      }
    }
  }
});

test('project search matches names or owners without changing the sample data', () => {
  const original = structuredClone(PROJECTS);
  assert.equal(filterProjects().length, 6);
  assert.deepEqual(filterProjects('  WEBSITE  ').map(p => p.name), ['Website refresh']);
  assert.deepEqual(filterProjects('jOrDaN').map(p => p.name), ['Mobile experience']);
  assert.deepEqual(filterProjects('nothing matches'), []);
  assert.deepEqual(filterProjects('[<script>'), []);
  assert.deepEqual(PROJECTS, original);
});

test('project status filters combine with search and support empty results', () => {
  assert.equal(filterProjects('', 'active').length, 3);
  assert.equal(filterProjects('', 'complete').length, 1);
  assert.deepEqual(filterProjects('sam', 'active').map(p => p.name), ['Design system']);
  assert.deepEqual(filterProjects('sam', 'review'), []);
  assert.deepEqual(filterProjects('', 'unknown'), []);
});

test('preview form accepts valid entries and trims required text for validation', () => {
  const values = { name: '  A new project  ', email: ' alex@example.com ', budget: '2500', notes: '' };
  const original = { ...values };
  assert.deepEqual(validateProjectForm(values), {});
  assert.deepEqual(validateProjectForm({ ...values, budget: 100000 }), {});
  assert.deepEqual(validateProjectForm({ ...values, name: 'AB', budget: 100, notes: 'x'.repeat(240) }), {});
  assert.deepEqual(values, original);
});

test('preview form reports missing fields and rejects malformed or out-of-range entries', () => {
  assert.deepEqual(Object.keys(validateProjectForm()).sort(), ['budget', 'email', 'name']);
  const valid = { name: 'Website refresh', email: 'alex@example.com', budget: '2500' };
  for (const name of [' ', 'A', 'x'.repeat(61)]) {
    assert.ok(validateProjectForm({ ...valid, name }).name);
  }
  for (const email of ['', 'alex', 'alex@', 'alex@example', 'a b@example.com', 'a'.repeat(121) + '@x.com']) {
    assert.ok(validateProjectForm({ ...valid, email }).email);
  }
  for (const budget of ['', ' ', 'oops', '-1', '99', '100001', '100.5', Infinity, NaN]) {
    assert.ok(validateProjectForm({ ...valid, budget }).budget);
  }
  assert.ok(validateProjectForm({ ...valid, notes: 'x'.repeat(241) }).notes);
});
