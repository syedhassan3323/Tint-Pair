import { buildTheme, exportCss, parseHex, contrastRatio, PRESETS,
  parseConfig, configFragment, DEFAULT_SEED, DEFAULT_RADIUS } from './theme.mjs';

export const PROJECTS = Object.freeze([
  { name: 'Website refresh', owner: 'Alex', status: 'active', progress: 72 },
  { name: 'Design system', owner: 'Sam', status: 'active', progress: 46 },
  { name: 'Mobile experience', owner: 'Jordan', status: 'review', progress: 88 },
  { name: 'Customer portal', owner: 'Riley', status: 'planned', progress: 12 },
  { name: 'Brand guidelines', owner: 'Morgan', status: 'complete', progress: 100 },
  { name: 'User research', owner: 'Casey', status: 'active', progress: 35 },
].map(Object.freeze));

export function filterProjects(query = '', status = 'all', projects = PROJECTS) {
  const term = String(query).trim().toLowerCase();
  return projects.filter(project => (status === 'all' || project.status === status) &&
    `${project.name} ${project.owner}`.toLowerCase().includes(term));
}

// Demo validation runs locally. These entries never leave the browser.
export function validateProjectForm(values = {}) {
  const errors = {};
  const name = typeof values.name === 'string' ? values.name.trim() : '';
  const email = typeof values.email === 'string' ? values.email.trim() : '';
  const budget = String(values.budget ?? '').trim();
  const notes = typeof values.notes === 'string' ? values.notes : '';
  if (name.length < 2 || name.length > 60) errors.name = 'Use a project name of 2–60 characters.';
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter an email address such as alex@example.com.';
  }
  if (!budget || !Number.isInteger(Number(budget)) || Number(budget) < 100 || Number(budget) > 100000) {
    errors.budget = 'Use a whole budget from $100 to $100,000.';
  }
  if (notes.length > 240) errors.notes = 'Keep the brief to 240 characters or fewer.';
  return errors;
}

function initApp() {
  const $ = selector => document.querySelector(selector);
  const status = $('#status');
  const error = $('#color-error');
  const fallback = $('#fallback');
  const views = new Map();
  const fields = new Map([['primary', { picker: $('#picker'), hex: $('#hex') }]]);
  const overrides = { secondary: null, accent: null };
  let theme;

  for (const name of ['secondary', 'accent']) {
    const row = document.createElement('div');
    const heading = document.createElement('div');
    heading.className = 'color-heading';
    const label = document.createElement('label');
    label.htmlFor = `${name}-hex`;
    label.textContent = `${name[0].toUpperCase()}${name.slice(1)} color`;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'auto-color';
    reset.title = `Derive ${name} from primary color`;
    reset.setAttribute('aria-label', `Automatically derive ${name} color`);
    reset.addEventListener('click', () => {
      overrides[name] = null;
      fields.get(name).hex.removeAttribute('aria-invalid');
      theme = buildTheme(theme.seed, theme.radius, overrides);
      render();
      fields.get(name).hex.value = theme[name];
      updateError();
      status.textContent = `${label.textContent} now follows the primary color.`;
    });
    heading.append(label, reset);
    const control = document.createElement('div');
    control.className = 'color-control';
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.setAttribute('aria-label', `Choose ${name} color`);
    const hex = document.createElement('input');
    Object.assign(hex, { id: `${name}-hex`, maxLength: 16, spellcheck: false,
      autocomplete: 'off' });
    hex.setAttribute('aria-describedby', 'hex-hint color-error');
    control.append(picker, hex);
    row.append(heading, control);
    $('#extra-colors').append(row);
    fields.set(name, { picker, hex, reset });
  }

  for (const [mode, name, description] of [
    ['light', 'Light theme', 'A little brighter'],
    ['dark', 'Dark theme', 'After hours'],
  ]) {
    const fragment = $('#preview-template').content.cloneNode(true);
    const card = fragment.querySelector('.preview-card');
    const title = card.querySelector('h3');
    title.textContent = name;
    title.id = `${mode}-heading`;
    card.setAttribute('aria-labelledby', title.id);
    card.querySelector('.mode-description').textContent = description;
    card.querySelector('nav').setAttribute('aria-label', `${name} dashboard preview`);
    card.querySelector('.dashboard').style.colorScheme = mode;
    for (const [index, group] of [...card.querySelectorAll('fieldset')].entries()) {
      for (const radio of group.querySelectorAll('input[type="radio"]')) radio.name = `${mode}-choice-${index}`;
    }
    setupForm(card, mode);
    setupTable(card);
    card.querySelector('.primary-button').addEventListener('click', () => {
      const input = card.querySelector('[data-content="dashboard"] .project-input');
      if (!input.value.trim()) {
        status.textContent = 'Give your project a name to try the full form.';
        input.focus();
        return;
      }
      const nameField = card.querySelector('[data-field="name"]');
      nameField.value = input.value.trim().slice(0, 60);
      selectView('forms');
      nameField.focus();
    });
    card.querySelector('.secondary-button').addEventListener('click', () => {
      selectView('tables');
      card.querySelector('.project-search').focus();
    });
    for (const button of card.querySelectorAll('.sample-buttons button')) {
      button.addEventListener('click', () => {
        status.textContent = `${name}: ${button.textContent.trim()} button preview. No data is saved.`;
      });
    }
    views.set(mode, card);
    $('#previews').append(fragment);
  }

  function setupForm(card, mode) {
    const form = card.querySelector('.preview-form');
    const feedback = form.querySelector('.form-feedback');
    const notes = form.querySelector('.form-notes');
    const counter = form.querySelector('.notes-count');
    for (const field of form.querySelectorAll('[data-field]')) {
      const message = form.querySelector(`[data-error="${field.dataset.field}"]`);
      field.id = `${mode}-project-${field.dataset.field}`;
      message.id = `${field.id}-error`;
      field.setAttribute('aria-describedby', message.id);
    }
    function showErrors(errors) {
      for (const field of form.querySelectorAll('[data-field]')) {
        const message = form.querySelector(`[data-error="${field.dataset.field}"]`);
        const text = errors[field.dataset.field];
        if (text) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
        message.textContent = text ? `Error: ${text}` : '';
        message.hidden = !text;
      }
    }
    function currentErrors() { return validateProjectForm(Object.fromEntries(new FormData(form))); }
    form.addEventListener('submit', event => {
      event.preventDefault();
      form.dataset.submitted = 'true';
      const errors = currentErrors();
      showErrors(errors);
      feedback.hidden = false;
      feedback.textContent = Object.keys(errors).length
        ? 'Please correct the marked fields and try again.'
        : `Preview validated: “${form.querySelector('[name="name"]').value.trim()}”. No data was sent or saved.`;
      form.querySelector('[aria-invalid="true"]')?.focus();
    });
    form.addEventListener('input', () => {
      counter.textContent = `${notes.value.length} / 240 characters`;
      if (form.dataset.submitted === 'true') {
        const errors = currentErrors();
        showErrors(errors);
        feedback.textContent = Object.keys(errors).length
          ? 'Please correct the marked fields and try again.' : 'All fields look good. Submit to preview.';
      }
    });
    form.addEventListener('reset', () => queueMicrotask(() => {
      delete form.dataset.submitted;
      showErrors({});
      counter.textContent = `${notes.value.length} / 240 characters`;
      feedback.hidden = true;
      feedback.textContent = '';
    }));
  }

  function setupTable(card) {
    const container = card.querySelector('[data-content="tables"]');
    const search = container.querySelector('.project-search');
    const filter = container.querySelector('.project-status');
    const body = container.querySelector('tbody');
    function refresh() {
      const projects = filterProjects(search.value, filter.value);
      body.replaceChildren();
      for (const project of projects) {
        const tone = project.status === 'active' ? 'primary' : project.status === 'planned' ? 'secondary' : 'accent';
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const title = document.createElement('strong');
        title.textContent = project.name;
        const owner = document.createElement('p');
        owner.className = 'muted';
        owner.textContent = project.owner;
        name.append(title, owner);
        const state = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `badge badge-${tone}`;
        badge.textContent = project.status[0].toUpperCase() + project.status.slice(1);
        state.append(badge);
        const completion = document.createElement('td');
        const label = document.createElement('span');
        label.textContent = `${project.progress}%`;
        const progress = document.createElement('progress');
        progress.max = 100;
        progress.value = project.progress;
        progress.className = `progress-${tone}`;
        progress.setAttribute('aria-label', `${project.name} progress`);
        progress.textContent = `${project.progress}%`;
        completion.append(label, progress);
        row.append(name, state, completion);
        body.append(row);
      }
      container.querySelector('.table-empty').hidden = projects.length !== 0;
      container.querySelector('.table-count').textContent = `${projects.length} of ${PROJECTS.length} projects`;
    }
    search.addEventListener('input', refresh);
    filter.addEventListener('change', refresh);
    container.querySelector('.clear-filters').addEventListener('click', () => {
      search.value = '';
      filter.value = 'all';
      refresh();
      search.focus();
    });
    refresh();
  }

  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.setAttribute('aria-label', `${preset.name} palette`);
    button.title = `${preset.name}: ${preset.color}, ${preset.secondary}, ${preset.accent}`;
    button.dataset.name = preset.name;
    const colors = document.createElement('span');
    colors.className = 'preset-colors';
    colors.setAttribute('aria-hidden', 'true');
    for (const color of [preset.color, preset.secondary, preset.accent]) {
      const swatch = document.createElement('i');
      swatch.style.backgroundColor = color;
      colors.append(swatch);
    }
    const label = document.createElement('span');
    label.textContent = preset.name;
    button.append(colors, label);
    button.addEventListener('click', () => {
      Object.assign(overrides, { secondary: preset.secondary, accent: preset.accent });
      theme = buildTheme(preset.color, theme.radius, overrides);
      clearErrors();
      render(true);
      status.textContent = `${preset.name} palette applied to both themes.`;
    });
    $('#presets').append(button);
  }

  function updateError() {
    const invalid = [...fields].filter(([, field]) => field.hex.hasAttribute('aria-invalid'));
    error.textContent = invalid.length
      ? `Invalid ${invalid.map(([name]) => name).join(', ')} color. Use #RGB or #RRGGBB. Keeping the last valid palette.` : '';
  }

  function clearErrors() {
    for (const field of fields.values()) field.hex.removeAttribute('aria-invalid');
    updateError();
  }

  function render(syncColors = false) {
    for (const [name, field] of fields) {
      const color = name === 'primary' ? theme.seed : theme[name];
      field.picker.value = color;
      if (syncColors || (!field.hex.hasAttribute('aria-invalid') && document.activeElement !== field.hex)) {
        field.hex.value = color;
      }
      if (field.reset) {
        field.reset.textContent = overrides[name] == null ? 'Auto' : 'Reset to auto';
        field.reset.setAttribute('aria-pressed', String(overrides[name] == null));
      }
    }
    $('#radius').value = theme.radius;
    $('#radius-value').textContent = `${theme.radius}px`;
    for (const button of $('#presets').children) {
      const preset = PRESETS.find(item => item.name === button.dataset.name);
      button.setAttribute('aria-pressed', String(preset.color === theme.seed &&
        preset.secondary === theme.secondary && preset.accent === theme.accent));
    }
    for (const card of views.values()) {
      const mode = card.querySelector('.dashboard').style.colorScheme;
      const tokens = theme[mode];
      for (const [name, value] of Object.entries(tokens)) {
        card.querySelector('.dashboard').style.setProperty(`--tp-${name}`, value);
      }
      const swatches = card.querySelector('.token-swatches');
      const inspector = card.querySelector('.token-inspector');
      swatches.replaceChildren();
      inspector.replaceChildren();
      for (const [name, value] of Object.entries(tokens)) {
        const button = document.createElement('button');
        button.className = 'token-row';
        button.type = 'button';
        button.setAttribute('aria-label', `Copy ${name}: ${value}`);
        const dot = document.createElement('span');
        dot.className = 'inspector-dot';
        if (name !== 'radius') dot.style.backgroundColor = value;
        const label = document.createElement('span');
        label.textContent = name;
        const code = document.createElement('code');
        code.textContent = value;
        button.append(dot, label, code);
        button.addEventListener('click', () => copyText(value, `${name}: ${value} copied.`, 'Copy token'));
        inspector.append(button);
        if (name === 'radius') continue;
        const swatch = document.createElement('span');
        swatch.className = 'token-swatch';
        swatch.style.setProperty('--swatch', value);
        swatch.setAttribute('role', 'img');
        swatch.setAttribute('aria-label', `${name}: ${value}`);
        swatch.title = `${name}: ${value}`;
        swatches.append(swatch);
      }
      const pairs = [
        ['Text / background', 'foreground', 'background'],
        ['Text / surface', 'foreground', 'surface'],
        ['Muted / surface', 'muted', 'surface'],
        ...['primary', 'secondary', 'accent'].map(name =>
          [`${name[0].toUpperCase()}${name.slice(1)} text / fill`, `${name}-foreground`, name]),
        ...['primary', 'secondary', 'accent'].map(name =>
          [`Text / ${name} soft`, 'foreground', `${name}-soft`]),
      ];
      const ratios = pairs.map(([, text, background]) => contrastRatio(tokens[text], tokens[background]));
      card.querySelector('.contrast-min').textContent = `${Math.min(...ratios).toFixed(2)}:1 min`;
      const list = card.querySelector('.contrast-pairs');
      list.replaceChildren();
      pairs.forEach(([label], index) => {
        const term = document.createElement('dt');
        const value = document.createElement('dd');
        term.textContent = label;
        value.textContent = `${ratios[index].toFixed(2)}:1`;
        list.append(term, value);
      });
    }
    $('#css-output').textContent = exportCss(theme);
  }

  for (const [name, field] of fields) {
    function updateColor(value, sync) {
      const color = parseHex(value);
      if (!color) {
        field.hex.setAttribute('aria-invalid', 'true');
        updateError();
        return;
      }
      field.hex.removeAttribute('aria-invalid');
      if (name !== 'primary') overrides[name] = color;
      theme = buildTheme(name === 'primary' ? color : theme.seed, theme.radius, overrides);
      render();
      if (sync) field.hex.value = color;
      updateError();
      status.textContent = `Both themes updated. ${name} is ${color}.`;
    }
    field.hex.addEventListener('input', () => updateColor(field.hex.value, false));
    field.hex.addEventListener('change', () => {
      if (parseHex(field.hex.value)) field.hex.value = name === 'primary' ? theme.seed : theme[name];
    });
    field.picker.addEventListener('input', () => updateColor(field.picker.value, true));
  }

  function restore() {
    const config = parseConfig(location.hash);
    Object.assign(overrides, { secondary: config.secondary ?? null, accent: config.accent ?? null });
    theme = buildTheme(config.seed, config.radius, overrides);
    clearErrors();
    render(true);
  }

  function showFallback(text, title) {
    $('#fallback-title').textContent = title;
    const field = $('#fallback-text');
    field.value = text;
    fallback.showModal();
    field.focus();
    field.select();
  }

  async function copyText(text, success, title) {
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = success;
    } catch {
      showFallback(text, title);
      status.textContent = 'Clipboard unavailable. Select and copy the text in the dialog.';
    }
  }

  function selectView(view) {
    const buttons = [...document.querySelectorAll('[data-view]')];
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
    for (const content of document.querySelectorAll('[data-content]')) {
      content.hidden = content.dataset.content !== view;
    }
    const label = buttons.find(button => button.dataset.view === view).textContent;
    for (const card of views.values()) card.querySelector('.dash-nav-label').textContent = label;
    status.textContent = `${label} view selected for both themes.`;
  }
  for (const button of document.querySelectorAll('[data-view]')) {
    button.addEventListener('click', () => selectView(button.dataset.view));
  }
  $('#radius').addEventListener('input', () => {
    theme = buildTheme(theme.seed, Number($('#radius').value), overrides);
    render();
    status.textContent = `Corner radius set to ${theme.radius} pixels in both themes.`;
  });
  $('#reset').addEventListener('click', () => {
    Object.assign(overrides, { secondary: null, accent: null });
    theme = buildTheme(DEFAULT_SEED, DEFAULT_RADIUS);
    clearErrors();
    render(true);
    status.textContent = 'Theme reset to the default palette and radius.';
  });
  $('#copy').addEventListener('click', () => copyText(exportCss(theme),
    'Tailwind CSS copied. Your light and dark themes are ready.', 'Copy your CSS'));
  $('#download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportCss(theme)], { type: 'text/css;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tintpair-theme.css';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Theme CSS download started.';
  });
  $('#share').addEventListener('click', () => {
    const url = new URL(location.href);
    url.hash = configFragment(theme);
    history.replaceState(null, '', url);
    $('#share-url').value = url.href;
    $('#share-dialog').showModal();
    $('#share-url').focus();
    $('#share-url').select();
  });
  $('#copy-link').addEventListener('click', () => copyText($('#share-url').value,
    'Theme link copied. It includes all three colors and radius.', 'Copy your theme link'));
  $('#native-share').hidden = typeof navigator.share !== 'function';
  $('#native-share').addEventListener('click', async () => {
    try {
      await navigator.share({ title: 'TintPair theme', url: $('#share-url').value });
      status.textContent = 'Theme shared.';
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'Sharing is unavailable. Use Copy link instead.';
    }
  });
  $('#close-share').addEventListener('click', () => $('#share-dialog').close());
  $('#close-fallback').addEventListener('click', () => fallback.close());
  window.addEventListener('hashchange', () => {
    restore();
    status.textContent = 'Theme restored from the link. Invalid values use safe defaults.';
  });
  const appearance = $('#appearance');
  let siteMode = 'light';
  try {
    const saved = localStorage.getItem('tintpair-appearance');
    if (saved === 'light' || saved === 'dark') siteMode = saved;
  } catch { /* The theme controls still work when storage is unavailable. */ }
  function applyAppearance() {
    document.documentElement.dataset.appearance = siteMode;
    appearance.setAttribute('aria-pressed', String(siteMode === 'dark'));
    appearance.title = `Switch to ${siteMode === 'dark' ? 'light' : 'dark'} mode`;
    document.querySelector('meta[name="theme-color"]').content = siteMode === 'dark' ? '#0c1119' : '#f2f5fa';
  }
  appearance.addEventListener('click', () => {
    siteMode = siteMode === 'dark' ? 'light' : 'dark';
    applyAppearance();
    try { localStorage.setItem('tintpair-appearance', siteMode); } catch { /* Optional persistence. */ }
    status.textContent = `Site appearance: ${siteMode}. Both exported themes are unchanged.`;
  });
  applyAppearance();
  restore();

}

if (typeof document !== 'undefined') initApp();
