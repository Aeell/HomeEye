(() => {
  // State management
  const state = {
    theme: 'dark',
    showGrid: true,
    showTimestamp: true,
    showBoxes: false,
    streamUrl: '',
    boxes: []
  };

  // DOM elements
  const el = {
    img: document.getElementById('mjpeg'),
    cv: document.getElementById('overlay'),
    ts: document.getElementById('timestamp'),
    themeToggle: document.getElementById('themeToggle'),
    gridToggle: document.getElementById('gridToggle'),
    tsToggle: document.getElementById('tsToggle'),
    boxesToggle: document.getElementById('boxesToggle'),
    snapshotBtn: document.getElementById('snapshotBtn'),
    status: document.getElementById('status'),
    connectionStatus: document.getElementById('connectionStatus'),
    clientCount: document.getElementById('clientCount')
  };

  // Apply theme
  function applyTheme() {
    document.documentElement.className = state.theme;
  }

  // Draw overlays
  function draw() {
    const ctx = el.cv.getContext('2d');
    const w = el.cv.width = el.img.naturalWidth || el.img.width;
    const h = el.cv.height = el.img.naturalHeight || el.img.height;

    ctx.clearRect(0, 0, w, h);

    // Draw grid
    if (state.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * w / 4, 0);
        ctx.lineTo(i * w / 4, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * h / 4);
        ctx.lineTo(w, i * h / 4);
        ctx.stroke();
      }
    }

    // Draw boxes
    if (state.showBoxes && state.boxes.length) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255,0,0,0.1)';
      state.boxes.forEach(box => {
        const x = box.x * w, y = box.y * h, bw = box.w * w, bh = box.h * h;
        ctx.fillRect(x, y, bw, bh);
        ctx.strokeRect(x, y, bw, bh);
        if (box.label) {
          ctx.fillStyle = '#ff0000';
          ctx.font = '12px monospace';
          ctx.fillText(box.label, x, y - 5);
          ctx.fillStyle = 'rgba(255,0,0,0.1)';
        }
      });
    }
  }

  // Draw timestamp
  function drawTimestamp(width) {
    const now = new Date();
    el.ts.textContent = now.toLocaleString();
    el.ts.style.left = `${width - el.ts.offsetWidth - 10}px`;
  }

  // Show status message
  function showStatus(message, type = 'info') {
    el.status.textContent = message;
    el.status.className = type;
    setTimeout(() => {
      el.status.className = '';
    }, 3000);
  }

  // Event listeners
  el.themeToggle.addEventListener('change', () => {
    state.theme = el.themeToggle.checked ? 'dark' : 'light';
    applyTheme();
  });

  el.gridToggle.addEventListener('change', () => {
    state.showGrid = el.gridToggle.checked;
    draw();
  });

  el.tsToggle.addEventListener('change', () => {
    state.showTimestamp = el.tsToggle.checked;
    el.ts.style.display = state.showTimestamp ? 'block' : 'none';
  });

  el.boxesToggle.addEventListener('change', () => {
    state.showBoxes = el.boxesToggle.checked;
    draw();
  });

  el.snapshotBtn.addEventListener('click', async () => {
    try {
      const hostname = state.streamUrl.split('/')[2].split(':')[0];
      const snapshotUrl = `http://${hostname}:${state.streamUrl.split(':')[2].split('/')[0].replace('stream.mjpg', 'snapshot.jpg')}`;
      const response = await fetch(snapshotUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `homeeye-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('Snapshot downloaded', 'success');
      } else {
        throw new Error('Failed to get snapshot');
      }
    } catch (err) {
      console.error('Snapshot error:', err);
      showStatus('Snapshot failed', 'error');
    }
  });

  // Update timestamp every second
  setInterval(() => {
    if (state.showTimestamp) drawTimestamp(el.cv.width);
  }, 1000);

  // Fetch config from server
  async function boot() {
    try {
      const r = await fetch('/config.json');
      const cfg = await r.json();
      state.streamUrl = cfg.streamUrl;
      el.img.src = state.streamUrl;
      el.status.textContent = `Streaming from ${state.streamUrl}`;
    } catch (err) {
      el.status.textContent = 'Failed to load config';
      console.error('Boot error:', err);
    }
    applyTheme();
    el.gridToggle.checked = state.showGrid;
    el.tsToggle.checked = state.showTimestamp;
    el.boxesToggle.checked = state.showBoxes;
    el.themeToggle.checked = (state.theme === 'dark');
    draw();
    connectWs();
  }

  // WebSocket for placeholder boxes
  let ws;
  function connectWs() {
    try {
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      ws.onopen = () => {
        el.connectionStatus.textContent = '🟢';
        showStatus('Connected');
        fetchHealth();
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'boxes') {
            state.boxes = msg.boxes || [];
            if (state.showBoxes) draw();
          }
        } catch (e) {
          console.error('WS message error:', e);
        }
      };
      ws.onclose = () => {
        el.connectionStatus.textContent = '🔴';
        showStatus('Disconnected');
        setTimeout(connectWs, 2000);
      };
      ws.onerror = (err) => {
        el.connectionStatus.textContent = '🔴';
        console.error('WS error:', err);
      };
    } catch (err) {
      console.error('WS connect error:', err);
    }
  }

  // Fetch health info
  async function fetchHealth() {
    try {
      const response = await fetch('/healthz');
      const health = await response.json();
      el.clientCount.textContent = `Clients: ${health.clients || 0}`;
    } catch (err) {
      console.error('Health fetch error:', err);
    }
  }

  // Redraw when image loads/resizes
  el.img.addEventListener('load', draw);

  // Initialize
  boot();
})();
