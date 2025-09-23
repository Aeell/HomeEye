(() => {
	// Clean, self-contained client for HomeEye UI
	const state = {
		theme: 'dark',
		showGrid: true,
		showTimestamp: true,
		showBoxes: false,
		streamUrl: '',
		boxes: []
	};

	const el = {
		img: document.getElementById('mjpeg'),
		cv: document.getElementById('overlay'),
		status: document.getElementById('status'),
		timestamp: document.getElementById('timestamp'),
		gridToggle: document.getElementById('gridToggle'),
		tsToggle: document.getElementById('tsToggle'),
		boxesToggle: document.getElementById('boxesToggle'),
		themeToggle: document.getElementById('themeToggle')
	};

	const ctx = el.cv.getContext('2d');

	function resizeCanvas() {
		el.cv.width = el.img.clientWidth || el.img.naturalWidth || 640;
		el.cv.height = el.img.clientHeight || el.img.naturalHeight || 360;
	}

	function clear() { ctx.clearRect(0, 0, el.cv.width, el.cv.height); }

	function drawGrid() {
		if (!state.showGrid) return;
		const cols = 4, rows = 4;
		ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
		for (let i = 1; i < cols; i++) { const x = (el.cv.width / cols) * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, el.cv.height); ctx.stroke(); }
		for (let i = 1; i < rows; i++) { const y = (el.cv.height / rows) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(el.cv.width, y); ctx.stroke(); }
	}

	function drawTimestamp() { if (!state.showTimestamp) { el.timestamp.textContent = ''; return; } el.timestamp.textContent = new Date().toLocaleString(); }

	function drawBoxes() {
		if (!state.showBoxes || !state.boxes) return;
		for (const b of state.boxes) {
			const x = Math.floor(b.x * el.cv.width), y = Math.floor(b.y * el.cv.height);
			const w = Math.floor(b.w * el.cv.width), h = Math.floor(b.h * el.cv.height);
			ctx.strokeStyle = 'rgba(255,0,0,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
			ctx.fillStyle = 'rgba(255,0,0,0.6)'; ctx.font = '14px sans-serif'; ctx.fillText(b.label || 'motion', x + 4, y + 16);
		}
	}

	function draw() { resizeCanvas(); clear(); drawGrid(); drawBoxes(); drawTimestamp(); }

	function applyTheme() { document.documentElement.classList.toggle('dark', state.theme === 'dark'); }

	setInterval(() => { drawTimestamp(); }, 1000);

	async function boot() {
		try {
			const r = await fetch('/config.json');
			const cfg = await r.json();
			state.streamUrl = cfg.streamUrl; el.img.src = state.streamUrl; el.status.textContent = `Streaming from ${state.streamUrl}`;
			state.theme = cfg.theme || state.theme;
		} catch (err) { el.status.textContent = 'Failed to load config'; console.error(err); }
		applyTheme();
		el.gridToggle.checked = state.showGrid; el.tsToggle.checked = state.showTimestamp; el.boxesToggle.checked = state.showBoxes; el.themeToggle.checked = (state.theme === 'dark');
		draw(); connectWs();
	}

	// websocket
	let ws = null;
	function connectWs(){
		try {
			const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
			ws = new WebSocket(url);
			ws.onopen = () => { el.status.textContent = 'Connected'; };
			ws.onmessage = (ev) => { try { const msg = JSON.parse(ev.data); if (msg.type === 'boxes') { state.boxes = msg.boxes || []; if (state.showBoxes) draw(); } } catch(e) { console.error(e); } };
			ws.onclose = () => { el.status.textContent = 'Disconnected'; setTimeout(connectWs, 2000); };
			ws.onerror = (e) => { console.warn('ws error', e); };
		} catch (e) { console.error('connectWs failed', e); }
	}

	// UI control wiring
	el.gridToggle.addEventListener('change', (e) => { state.showGrid = e.target.checked; draw(); });
	el.tsToggle.addEventListener('change', (e) => { state.showTimestamp = e.target.checked; draw(); });
	el.boxesToggle.addEventListener('change', (e) => { state.showBoxes = e.target.checked; draw(); });
	el.themeToggle.addEventListener('change', (e) => { state.theme = e.target.checked ? 'dark' : 'light'; applyTheme(); });

	el.img.addEventListener('load', draw);
	window.addEventListener('resize', draw);

	boot();
})();
