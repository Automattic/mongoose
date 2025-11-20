'use strict';

// Attach copy-button logic only after the full DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Inline SVG icons so no external asset load is required
  const copyIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  const checkIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 6L9 17l-5-5"></path>
    </svg>
  `;

  // Inject a copy button into each <pre><code> block used in docs
  document.querySelectorAll('pre code').forEach(block => {
    const wrapper = block.parentElement;
    wrapper.style.position = 'relative'; // ensures button can be positioned correctly

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', 'Copy code to clipboard'); // accessibility support
    btn.innerHTML = copyIcon; // initial icon state

    // Handle the copy-to-clipboard action
    btn.onclick = async() => {
      if (btn.dataset.locked) return; // prevents multiple fast clicks
      btn.dataset.locked = '1';

      // Uses Clipboard API to copy code block text
      await navigator.clipboard.writeText(block.textContent);

      // Show success tick briefly
      btn.innerHTML = checkIcon;
      btn.classList.add('copied');

      // Restore original icon after delay
      setTimeout(() => {
        btn.innerHTML = copyIcon;
        btn.classList.remove('copied');
        btn.dataset.locked = '';
      }, 1200);
    };

    wrapper.appendChild(btn); // attach button to code block
  });
});
