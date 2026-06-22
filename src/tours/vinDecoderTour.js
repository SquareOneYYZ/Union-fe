const DEMO_VIN = 'WBA3A5C57DF123456';

const DEMO_RESULT = {
  vin: 'WBA3A5C57DF123456',
  make: 'BMW',
  model: '3 Series',
  modelYear: '2013',
  vehicleType: 'Passenger Car',
  manufacturer: 'BMW Manufacturer',
  trim: 'Sport Line',
  bodyClass: 'Sedan',
  displacementL: '2.0',
  engineCylinders: '4',
  engineHP: '248',
  driveType: 'RWD',
  fuelTypePrimary: 'Gasoline',
  batteryType: 'N/A',
};

const FIELDS = [
  { id: 'vin-make', label: 'Make', value: DEMO_RESULT.make },
  { id: 'vin-manufacturer', label: 'Manufacturer', value: DEMO_RESULT.manufacturer },
  { id: 'vin-model', label: 'Model', value: DEMO_RESULT.model },
  { id: 'vin-model-year', label: 'Model Year', value: DEMO_RESULT.modelYear },
  { id: 'vin-trim', label: 'Trim', value: DEMO_RESULT.trim },
  { id: 'vin-body-class', label: 'Body Class', value: DEMO_RESULT.bodyClass },
  { id: 'vin-vehicle-type', label: 'Vehicle Type', value: DEMO_RESULT.vehicleType },
  { id: 'vin-displacement-l', label: 'Displacement (L)', value: DEMO_RESULT.displacementL },
  { id: 'vin-engine-cylinders', label: 'Engine Cylinders', value: DEMO_RESULT.engineCylinders },
  { id: 'vin-engine', label: 'Engine HP', value: DEMO_RESULT.engineHP },
  { id: 'vin-drive-type', label: 'Drive Type', value: DEMO_RESULT.driveType },
  { id: 'vin-fuel-type', label: 'Fuel Type', value: DEMO_RESULT.fuelTypePrimary },
  { id: 'vin-battery-type', label: 'Battery Type', value: DEMO_RESULT.batteryType },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value',
).set;

const setInputValue = (inputEl, value) => {
  nativeSetter.call(inputEl, value);
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
};

let closeObserver;

export const watchTourClose = () => {
  if (closeObserver) {
    closeObserver.disconnect();
  }

  closeObserver = new MutationObserver(() => {
    const popover = document.querySelector('.driver-popover');

    if (!popover) {
      cleanupGhostEffects();
      closeObserver.disconnect();
      closeObserver = null;
    }
  });

  closeObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};
export const runTypewriterEffect = (inputEl, signal) =>
  new Promise((resolve) => {
    let index = 0;
    inputEl.focus();

    const type = () => {
      if (signal?.aborted) { resolve(); return; }
      if (index <= DEMO_VIN.length) {
        nativeSetter.call(inputEl, DEMO_VIN.slice(0, index));
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        index++;
        setTimeout(type, 80);
      } else {
        resolve();
      }
    };

    type();
  });

export const showGhostDropdown = (anchorEl, signal) =>
  new Promise((resolve) => {
    document.getElementById('vin-ghost-dropdown')?.remove();

    const rect = anchorEl.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'vin-ghost-dropdown';
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 6}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      background: #1a1a2e;
      border: 1px solid rgba(76,175,80,0.35);
      border-radius: 10px;
      padding: 14px 16px;
      z-index: 99999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: ghFadeIn 0.3s ease;
    `;
    overlay.innerHTML = `
      <style>
        @keyframes ghFadeIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ghPulse {
          0%,100% { opacity:0.5; }
          50%      { opacity:1; }
        }
      </style>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:16px;">🚗</span>
        <span style="font-weight:700;font-size:13px;color:#fff;">
          ${DEMO_RESULT.modelYear} ${DEMO_RESULT.make} ${DEMO_RESULT.model}
        </span>
      </div>
      <div style="font-size:11px;color:#aaa;animation:ghPulse 1.8s infinite;margin-bottom:10px;">
        ${DEMO_RESULT.trim} · ${DEMO_RESULT.bodyClass} · ${DEMO_RESULT.fuelTypePrimary}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${[
        DEMO_RESULT.engineHP + ' HP',
        DEMO_RESULT.engineCylinders + '-cyl',
        DEMO_RESULT.driveType,
        DEMO_RESULT.displacementL + 'L',
      ].map((t) => `<span style="
          font-size:10px;color:#4caf50;border:1px solid rgba(76,175,80,0.4);
          border-radius:4px;padding:2px 7px;background:rgba(76,175,80,0.08);
        ">${t}</span>`).join('')}
      </div>
      <div style="margin-top:10px;font-size:10px;color:#4caf50;display:flex;align-items:center;gap:5px;">
        <span>✓</span><span>VIN decoded — all fields ready to populate</span>
      </div>
    `;
    document.body.appendChild(overlay);

    const dismiss = () => {
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';
      sleep(300).then(() => { overlay.remove(); resolve(); });
    };

    const tid = setTimeout(dismiss, 2500);
    signal?.addEventListener('abort', () => { clearTimeout(tid); dismiss(); }, { once: true });
  });

export const populateAllFields = () => {
  FIELDS.forEach(({ id, value }) => {
    const wrapperEl = document.getElementById(id);
    if (!wrapperEl) return;

    const inputEl = wrapperEl.querySelector('input')
      ?? wrapperEl.querySelector('textarea');
    if (!inputEl) return;

    setInputValue(inputEl, value);
  });
};

export const runVinDemoAnimation = async () => {
  const inputEl = document.querySelector('#vin-field input');
  const anchorEl = document.querySelector('#vin-field');
  if (!inputEl || !anchorEl) {
    console.warn('[vinDecoderTour] VIN field not found');
    return;
  }

  const ac = new AbortController();
  await runTypewriterEffect(inputEl, ac.signal);
  await showGhostDropdown(anchorEl, ac.signal);
  populateAllFields();
};

export const cleanupGhostEffects = () => {
  document.getElementById('vin-ghost-dropdown')?.remove();
  const vinInput = document.querySelector('#vin-field input');
  if (vinInput) setInputValue(vinInput, '');

  FIELDS.forEach(({ id }) => {
    const wrapperEl = document.getElementById(id);
    if (!wrapperEl) return;
    const inputEl = wrapperEl.querySelector('input')
      ?? wrapperEl.querySelector('textarea');
    if (inputEl) setInputValue(inputEl, '');
  });
};

const vinDecoderTour = {
  tourId: 'vinDecoder',

  config: {
    showProgress: true,
    allowClose: true,
    onDestroyStarted: () => cleanupGhostEffects(),
    onDestroyed: () => cleanupGhostEffects(),
  },

  steps: [
    {
      element: '#vin-field',
      popover: {
        title: '🔍 VIN Decoder',
        description: 'Enter a valid 17-character VIN and press search. Click Next to see a live demo of how all fields get populated.',
        side: 'left',
        align: 'start',
        onNextClick: (el, step, { driver: driverObj }) => {
          watchTourClose();
          runVinDemoAnimation();
          driverObj.moveNext();
        },
      },
    },

    {
      element: '#vin-field',
      popover: {
        title: '⌨️ VIN Decoded',
        description: `"${DEMO_VIN}" was entered, the decoder card appeared, and all fields below were populated automatically. Click Next to review each field.`,
        side: 'left',
        align: 'start',
      },
    },

    ...FIELDS.map(({ id, label, value }) => ({
      element: `#${id}`,
      popover: {
        title: `✅ ${label}`,
        description: `<strong>${value}</strong> — automatically populated from the decoded VIN. This field is fully editable.`,
        side: 'left',
        align: 'start',
      },
    })),

    {
      element: '#vin-field',
      popover: {
        title: '🎉 All Fields Populated!',
        description: 'Every field was decoded and filled instantly from the VIN. All values remain editable. Click Done to finish.',
        side: 'left',
        align: 'start',
        onNextClick: (el, step, { driver: driverObj }) => {
          cleanupGhostEffects();
          driverObj.destroy();
        },
      },
    },
  ],
};

export default vinDecoderTour;