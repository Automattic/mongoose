'use strict';

(function() {
  const picker = document.getElementById('version-picker');
  if (!picker) return;

  const button = picker.querySelector('.version-picker-button');
  if (!button) return;

  function setOpen(open) {
    picker.classList.toggle('open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  button.addEventListener('click', function(e) {
    e.stopPropagation();
    setOpen(!picker.classList.contains('open'));
  });

  document.addEventListener('click', function(e) {
    if (!picker.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
