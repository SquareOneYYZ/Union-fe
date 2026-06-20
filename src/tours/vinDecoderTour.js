const DEMO_VIN = 'WBA3A5C57DF123456';

const DEMO_RESULT = {
  vin: 'WBA3A5C57DF123456',
  make: 'BMW',
  model: '3 Series',
  modelYear: '2013',
  vehicleType: 'Passenger Car',
};

export const runTypewriterEffect = (inputEl) => new Promise((resolve) => {
  let index = 0;
  inputEl.focus();

  const type = () => {
    if (index <= DEMO_VIN.length) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(inputEl, DEMO_VIN.slice(0, index));
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      index += 1;
      setTimeout(type, 80);
    } else {
      resolve();
    }
  };

  type();
});

export const showGhostDropdown = (anchorEl) => new Promise((resolve) => {
  const rect = anchorEl.getBoundingClientRect();

  const overlay = document.createElement('div');
  overlay.id = 'vin-ghost-dropdown';
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 4}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 12px 16px;
    z-index: 99999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    animation: ghostFadeIn 0.3s ease;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes ghostFadeIn {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes ghostPulse {
        0%,100% { opacity: 0.5; }
        50%      { opacity: 1; }
      }
    </style>
    <div style="font-weight:600;font-size:13px;color:#fff;margin-bottom:4px;">
      ${DEMO_RESULT.vin}
    </div>
    <div style="font-size:11px;color:#888;animation:ghostPulse 1.5s infinite;">
      ${DEMO_RESULT.modelYear} · ${DEMO_RESULT.make} · ${DEMO_RESULT.model} · ${DEMO_RESULT.vehicleType}
    </div>
    <div style="margin-top:8px;font-size:10px;color:#4caf50;display:flex;align-items:center;gap:4px;">
      <span>✓</span> VIN Decoded Successfully
    </div>
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      overlay.remove();
      resolve();
    }, 300);
  }, 2500);
});

export const runFieldFillAnimation = () => new Promise((resolve) => {
  const fields = [
    { id: 'vin-make', value: DEMO_RESULT.make },
    { id: 'vin-model', value: DEMO_RESULT.model },
    { id: 'vin-model-year', value: DEMO_RESULT.modelYear },
  ];

  let i = 0;

  const highlightNext = () => {
    if (i >= fields.length) {
      resolve();
      return;
    }

    const { id, value } = fields[i];
    const el = document.querySelector(`#${id}`);

    if (el) {
      el.style.transition = 'box-shadow 0.3s ease, background 0.3s ease';
      el.style.boxShadow = '0 0 0 2px #4caf50';
      el.style.borderRadius = '13px';
      el.style.background = 'rgba(76,175,80,0.06)';
      const ghost = document.createElement('div');
      ghost.style.cssText = `
        position: absolute;
        top: -22px;
        left: 8px;
        font-size: 11px;
        color: #4caf50;
        font-weight: 600;
        background: #1e1e2e;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #4caf50;
        pointer-events: none;
        z-index: 9999;
      `;
      ghost.textContent = `→ ${value}`;
      el.style.position = 'relative';
      el.appendChild(ghost);

      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.background = '';
        ghost.remove();
        i += 1;
        setTimeout(highlightNext, 200);
      }, 600);
    } else {
      i += 1;
      highlightNext();
    }
  };

  highlightNext();
});

export const cleanupGhostEffects = () => {
  const dropdown = document.getElementById('vin-ghost-dropdown');
  if (dropdown) dropdown.remove();
};

export const runVinDemoAnimation = async () => {
  const vinInputEl = document.querySelector('#vin-field input');
  const vinAnchorEl = document.querySelector('#vin-field');

  if (!vinInputEl || !vinAnchorEl) {
    console.warn('[vinDecoderTour] VIN field not found for animation');
    return;
  }

  await runTypewriterEffect(vinInputEl);
  await showGhostDropdown(vinAnchorEl);
  await runFieldFillAnimation();
  cleanupGhostEffects();
};

const vinDecoderTour = {
  tourId: 'vinDecoder',
  steps: [
    {
      element: '#vin-field',
      popover: {
        title: '🔍 VIN Decoder',
        description: 'Enter a valid 17-character VIN here and press the search icon. Click Next to see a live demo of how it works.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#vin-field',
      popover: {
        title: '✅ Auto-filled!',
        description: `After entering a VIN like "${DEMO_VIN}", make, model, year and more are all populated automatically. Every field is editable if needed.`,
        side: 'left',
        align: 'start',
      },
    },
  ],
};

export default vinDecoderTour;