import { state } from '../core/state.js';

export function openModal(title, message, opts = {}) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-message').innerHTML = message;
  document.getElementById('modal-confirm').innerText = opts.confirmText || 'OK';
  const cancel = document.getElementById('modal-cancel');
  if (opts.cancelText) {
    cancel.style.display = '';
    cancel.innerText = opts.cancelText;
  } else {
    cancel.style.display = 'none';
  }
  state.modalCallback = opts.onConfirm || null;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

export function closeModal(confirmed) {
  document.getElementById('modal-backdrop').classList.add('hidden');
  if (confirmed && state.modalCallback) state.modalCallback();
  state.modalCallback = null;
}
