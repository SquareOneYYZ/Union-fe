export const createCtrlButton = (ariaLabel, className = '', onClick = null) => {
  if (!ariaLabel) {
    throw new Error('createCtrlButton: ariaLabel must be a non-empty string.');
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', ariaLabel);
  button.title = ariaLabel;

  if (className) {
    button.className = className;
  }

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
};

export const createCtrlContainer = (extraClass = '') => {
  const container = document.createElement('div');
  container.className = ['maplibregl-ctrl-group', 'maplibregl-ctrl', extraClass]
    .filter(Boolean)
    .join(' ');
  return container;
};
