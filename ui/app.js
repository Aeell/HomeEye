(() => {
}


// Update timestamp every second
setInterval(() => { if (state.showTimestamp) drawTimestamp(el.cv.width); }, 1000);


// Fetch config from server
async function boot(){
try {
const r = await fetch('/config.json');
const cfg = await r.json();
state.streamUrl = cfg.streamUrl; // e.g. http://host:8421/stream.mjpg
el.img.src = state.streamUrl;
el.status.textContent = `Streaming from ${state.streamUrl}`;
} catch(err){
el.status.textContent = 'Failed to load config';
console.error(err);
}
applyTheme();
el.gridToggle.checked = state.showGrid;
el.tsToggle.checked = state.showTimestamp;
el.boxesToggle.checked = state.showBoxes;
el.themeToggle.checked = (state.theme==='dark');
draw();
connectWs();
}


// WebSocket for placeholder boxes
let ws;
function connectWs(){
try {
ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
ws.onopen = () => { el.status.textContent = 'Connected'; };
ws.onmessage = (ev) => {
try {
const msg = JSON.parse(ev.data);
if (msg.type === 'boxes') { state.boxes = msg.boxes||[]; if (state.showBoxes) draw(); }
} catch(e){}
};
ws.onclose = () => { el.status.textContent = 'Disconnected'; setTimeout(connectWs, 2000); };
ws.onerror = () => { /* ignore */ };
} catch {}
}


// Redraw when image loads/resizes
el.img.addEventListener('load', draw);


boot();
})();
