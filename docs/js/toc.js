'use strict';

(function() {
  const list = document.getElementById('toc-list');
  const container = document.getElementById('toc');
  const content = document.getElementById('content');
  if (!list || !container || !content) return;

  const headings = Array.from(content.querySelectorAll('h2, h3'))
    .filter(h => h.textContent && h.textContent.trim().length);

  if (headings.length < 2) {
    container.classList.add('toc-empty');
    return;
  }

  const slug = (text) => text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

  const links = [];
  headings.forEach(h => {
    if (!h.id) h.id = slug(h.textContent);
    const li = document.createElement('li');
    li.className = 'toc-item toc-item-' + h.tagName.toLowerCase();
    const a = document.createElement('a');
    a.className = 'toc-link';
    a.href = '#' + h.id;
    a.textContent = h.textContent.replace(/\s*#\s*$/, '').trim();
    li.appendChild(a);
    list.appendChild(li);
    links.push({ link: a, heading: h });
  });

  let active = null;
  const setActive = (target) => {
    if (active === target) return;
    if (active) active.link.classList.remove('active');
    if (target) target.link.classList.add('active');
    active = target;
  };

  const update = () => {
    const offset = 120;
    let current = null;
    for (const entry of links) {
      const rect = entry.heading.getBoundingClientRect();
      if (rect.top <= offset) current = entry;
      else break;
    }
    if (!current) current = links[0];
    setActive(current);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
})();
