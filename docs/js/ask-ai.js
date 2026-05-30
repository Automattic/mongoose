'use strict';

(function() {
  const endpoint = 'https://mothership.mongoosestudio.app/.netlify/functions/mongodbKnowledge';
  const floatingForm = document.getElementById('assistant-floating-form');
  const floatingInput = document.getElementById('assistant-floating-input');
  const floatingSubmit = document.getElementById('assistant-floating-submit');
  const panel = document.getElementById('assistant-panel');
  const closeButton = document.getElementById('assistant-panel-close');
  const thread = document.getElementById('assistant-thread');
  const panelForm = document.getElementById('assistant-panel-form');
  const panelInput = document.getElementById('assistant-panel-input');
  const panelSubmit = document.getElementById('assistant-panel-submit');
  const resizeHandle = document.getElementById('assistant-panel-resize');

  let hasAskedQuestion = false;
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  if (floatingForm == null || panel == null || panelForm == null) {
    return;
  }

  floatingForm.addEventListener('submit', event => {
    event.preventDefault();
    submitQuestion(floatingInput.value);
  });

  floatingInput.addEventListener('focus', openExistingConversation);
  floatingInput.addEventListener('click', openExistingConversation);

  panelForm.addEventListener('submit', event => {
    event.preventDefault();
    submitQuestion(panelInput.value);
  });

  panelInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(panelInput.value);
    }
  });

  closeButton.addEventListener('click', closePanel);
  resizeHandle?.addEventListener('pointerdown', startResize);

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      floatingInput.focus();
    }
  });

  async function submitQuestion(value) {
    const question = value.trim();
    if (!question) {
      floatingInput.focus();
      return;
    }

    hasAskedQuestion = true;
    openPanel();
    floatingInput.value = '';
    panelInput.value = '';

    appendUserMessage(question);
    const reply = appendAssistantMessage();
    const sources = [];

    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mongodb-chat-latest',
          stream: true,
          store: true,
          input: question
        })
      });

      if (!response.ok || response.body == null) {
        throw new Error(`MongoDB Knowledge API request failed with ${response.status}`);
      }

      reply.body.textContent = '';

      await readEventStream(response.body, event => {
        if (event.type === 'response.output_text.delta') {
          reply.markdown += event.delta;
          renderMarkdown(reply.body, reply.markdown);
          scrollThreadToBottom();
        } else if (event.type === 'response.output_text.annotation.added') {
          sources.push(event.annotation);
        }
      });

      renderSources(reply.message, sources);
    } catch (error) {
      console.error(error);
      reply.body.textContent = 'Unable to answer right now. Please try again.';
    } finally {
      setLoading(false);
      panelInput.focus();
      scrollThreadToBottom();
    }
  }

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('assistant-open');
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('assistant-open');
  }

  function openExistingConversation() {
    if (!hasAskedQuestion) {
      return;
    }
    openPanel();
    panelInput.focus();
    scrollThreadToBottom();
  }

  function appendUserMessage(text) {
    const message = document.createElement('div');
    message.className = 'assistant-message assistant-message-user';
    message.innerHTML = `<div class="assistant-message-body"></div>`;
    message.firstChild.textContent = text;
    thread.appendChild(message);
    scrollThreadToBottom();
  }

  function appendAssistantMessage() {
    const message = document.createElement('div');
    const body = document.createElement('div');

    message.className = 'assistant-message assistant-message-assistant';
    body.className = 'assistant-message-body assistant-status';
    body.textContent = 'Thinking...';
    message.appendChild(body);
    thread.appendChild(message);
    scrollThreadToBottom();

    return { message, body, markdown: '' };
  }

  function setLoading(isLoading) {
    floatingSubmit.disabled = isLoading;
    panelSubmit.disabled = isLoading;
    panelInput.disabled = isLoading;
  }

  async function readEventStream(body, onEvent) {
    const reader = body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += value;
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      events.forEach(event => parseEvent(event, onEvent));
    }

    if (buffer) {
      parseEvent(buffer, onEvent);
    }
  }

  function parseEvent(rawEvent, onEvent) {
    const data = rawEvent
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n');

    if (data && data !== '[DONE]') {
      onEvent(JSON.parse(data));
    }
  }

  function renderMarkdown(element, markdown) {
    element.classList.remove('assistant-status');
    element.innerHTML = window.marked?.parse ? window.marked.parse(markdown) : markdown;
  }

  function renderSources(message, sources) {
    sources = sources.filter(source => !source.filename?.startsWith('promotion://skill?'));

    if (sources.length === 0) {
      return;
    }

    const title = document.createElement('div');
    const list = document.createElement('ol');
    title.className = 'assistant-sources-title';
    title.textContent = 'Sources';
    list.className = 'assistant-sources-list';

    for (const source of sources) {
      const item = document.createElement('li');
      if (source.url) {
        item.innerHTML = `<a target="_blank" rel="noopener"></a>`;
        item.firstChild.href = source.url;
        item.firstChild.textContent = source.title || source.url;
      } else {
        item.textContent = source.filename || source.file_id;
      }
      list.appendChild(item);
    }

    message.appendChild(title);
    message.appendChild(list);
  }

  function startResize(event) {
    event.preventDefault();
    resizeStartX = event.clientX;
    resizeStartWidth = panel.getBoundingClientRect().width;
    resizeHandle.setPointerCapture(event.pointerId);
    document.body.classList.add('assistant-resizing');
    window.addEventListener('pointermove', resizePanel);
    window.addEventListener('pointerup', stopResize, { once: true });
    window.addEventListener('pointercancel', stopResize, { once: true });
  }

  function resizePanel(event) {
    const width = Math.max(340, Math.min(576, window.innerWidth, resizeStartWidth + resizeStartX - event.clientX));
    panel.style.setProperty('--assistant-panel-width', `${width}px`);
  }

  function stopResize() {
    document.body.classList.remove('assistant-resizing');
    window.removeEventListener('pointermove', resizePanel);
  }

  function scrollThreadToBottom() {
    thread.scrollTop = thread.scrollHeight;
  }
})();
