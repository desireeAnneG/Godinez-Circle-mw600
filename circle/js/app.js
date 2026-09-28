/* ============================================================
   Circle — shared app logic
   Data lives in MySQL, reached through the Express API in server.js.
   Avatars are generated on the fly
   from DiceBear (illustrated, cartoon-style, seeded by name).
   ============================================================ */

// If the page is opened straight from disk (file://), talk to the local server.
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';

const RELATIONSHIPS = ['Best Friend', 'Friend', 'Family', 'Classmate', 'Acquaintance'];

const FAV_COLORS = [
  { name: 'Purple', hex: '#7C6AE8' },
  { name: 'Pink',   hex: '#F4A6C6' },
  { name: 'Blue',   hex: '#6FA8E8' },
  { name: 'Green',  hex: '#6FCF97' },
  { name: 'Orange', hex: '#F5A65B' },
  { name: 'Red',    hex: '#E86A6A' },
  { name: 'Yellow', hex: '#F2C94C' }
];

/* ---------- icons (inline SVG strings, 20x20, stroke-based) ---------- */

const ICONS = {
  home: `<svg viewBox="0 0 20 20" fill="none"><path d="M3 9.5 10 3l7 6.5M5 8v8a1 1 0 0 0 1 1h3v-5h2v5h3a1 1 0 0 0 1-1V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  users: `<svg viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="8.2" r="2" stroke="currentColor" stroke-width="1.6"/><path d="M2.3 16c.5-2.9 2.3-4.6 4.7-4.6s4.2 1.7 4.7 4.6M12.3 16c.4-2.1 1.6-3.4 3.3-3.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  userPlus: `<svg viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M2.3 17c.6-3.5 2.8-5.6 5.7-5.6s5.1 2.1 5.7 5.6M16 5.5v6M13 8.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  user: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3.3 17c.7-3.7 3.1-5.9 6.7-5.9s6 2.2 6.7 5.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  search: `<svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.3" stroke="currentColor" stroke-width="1.6"/><path d="M16.3 16.3 13 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  heart: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 17s-6.5-4-6.5-8.5A3.8 3.8 0 0 1 10 6a3.8 3.8 0 0 1 6.5 2.5C16.5 13 10 17 10 17Z"/></svg>`,
  pencil: `<svg viewBox="0 0 20 20" fill="none"><path d="M12.8 3.5 16.5 7.2 7 16.7 3 17.5l.8-4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  instagram: `<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="4.2" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="3.2" stroke="currentColor" stroke-width="1.6"/><circle cx="14.1" cy="5.9" r="0.9" fill="currentColor"/></svg>`,
  message: `<svg viewBox="0 0 20 20" fill="none"><path d="M3 10c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5-3.1 6.5-7 6.5c-.9 0-1.7-.1-2.5-.4L4 17.5l1-3.3C3.7 12.9 3 11.5 3 10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  mail: `<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 5.5 10 11l7-5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  palette: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 3a7 7 0 1 0 0 14c1 0 1.5-.6 1.5-1.4 0-.4-.2-.7-.2-1.1 0-.7.6-1.2 1.3-1.2H14a3 3 0 0 0 3-3c0-4-3.1-7.3-7-7.3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7" cy="9" r="1" fill="currentColor"/><circle cx="7.5" cy="12.5" r="1" fill="currentColor"/><circle cx="11.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
  food: `<svg viewBox="0 0 20 20" fill="none"><path d="M6 3v6M4.5 3v4a1.5 1.5 0 0 0 3 0V3M6 9v8M14.5 3c-1.4 0-2 1.6-2 4s.6 3.5 2 3.5V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  book: `<svg viewBox="0 0 20 20" fill="none"><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3H10v14H4.5A1.5 1.5 0 0 1 3 15.5v-11ZM17 4.5A1.5 1.5 0 0 0 15.5 3H10v14h5.5a1.5 1.5 0 0 0 1.5-1.5v-11Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  gamepad: `<svg viewBox="0 0 20 20" fill="none"><rect x="2.3" y="7" width="15.4" height="8" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M6 9.3v3.4M4.3 11h3.4M13.4 10h.01M15.4 11.6h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  camera: `<svg viewBox="0 0 20 20" fill="none"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H6l.8-1.5h6.4L14 6h1.5A1.5 1.5 0 0 1 17 7.5v7A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10.5" r="2.6" stroke="currentColor" stroke-width="1.5"/></svg>`,
  coffee: `<svg viewBox="0 0 20 20" fill="none"><path d="M4 8h10v4.5A3.5 3.5 0 0 1 10.5 16h-3A3.5 3.5 0 0 1 4 12.5V8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 9h1a2 2 0 1 1 0 4h-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  music: `<svg viewBox="0 0 20 20" fill="none"><circle cx="6.3" cy="14.5" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="13.7" cy="12.7" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M8.3 14.5V5.8L15.7 4v8.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trophy: `<svg viewBox="0 0 20 20" fill="none"><path d="M6 4h8v4a4 4 0 0 1-8 0V4ZM4 5.2h2v1.8a2 2 0 0 1-2 2 1.9 1.9 0 0 1 0-3.8ZM16 5.2h-2v1.8a2 2 0 0 0 2 2 1.9 1.9 0 0 0 0-3.8ZM10 12v3M7 17h6M8 15h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dot: `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="3.2"/></svg>`,
  arrowRight: `<svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronDown: `<svg viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M5.5 6l.7 9.5A1.5 1.5 0 0 0 7.7 17h4.6a1.5 1.5 0 0 0 1.5-1.5L14.5 6M8.5 9v5M11.5 9v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close: `<svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  location: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 17.5S15.5 12.4 15.5 8.3A5.5 5.5 0 0 0 4.5 8.3C4.5 12.4 10 17.5 10 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="8.3" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
  calendar: `<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 8.5h14M6.5 3v3M13.5 3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

function hobbyIcon(hobby){
  const h = (hobby || '').toLowerCase();
  if(h.includes('game') || h.includes('gaming')) return ICONS.gamepad;
  if(h.includes('read') || h.includes('book')) return ICONS.book;
  if(h.includes('photo') || h.includes('camera')) return ICONS.camera;
  if(h.includes('coffee')) return ICONS.coffee;
  if(h.includes('draw') || h.includes('art') || h.includes('paint') || h.includes('design')) return ICONS.palette;
  if(h.includes('music') || h.includes('guitar') || h.includes('sing')) return ICONS.music;
  if(h.includes('sport') || h.includes('badminton') || h.includes('basketball') || h.includes('board')) return ICONS.trophy;
  return ICONS.dot;
}

/* ---------- API helpers (all async — they talk to server.js) ---------- */

async function api(path, options = {}){
  let res;
  try{
    res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch(e){
    throw new Error("Can't reach the server. Is it running? (npm start)");
  }
  if(res.status === 204) return null;

  let data = null;
  try{ data = await res.json(); } catch(e){ /* no body */ }

  if(!res.ok) throw new Error((data && data.error) || `Request failed (${res.status}).`);
  return data;
}

function getFriends(){ return api('/friends'); }

function getFriend(id){ return api('/friends/' + encodeURIComponent(id)); }

function addFriend(friend){
  return api('/friends', { method: 'POST', body: JSON.stringify(friend) });
}

function updateFriend(id, updates){
  return api('/friends/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(updates) });
}

function deleteFriend(id){
  return api('/friends/' + encodeURIComponent(id), { method: 'DELETE' });
}

function getProfile(){ return api('/profile'); }

function saveProfile(profile){
  return api('/profile', { method: 'PUT', body: JSON.stringify(profile) });
}

/* ---------- small utilities ---------- */

function avatarUrl(seed){
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'friend')}&backgroundColor=d1d4f9,ffd5dc,c0aede,b6e3f4,ffdfbf&radius=50`;
}

/* profile.photo (a custom uploaded picture) wins over the generated avatar.
   Falls back to a feminine-styled avatar (long hair, no facial hair) since
   this profile is Desiree's. */
function profileAvatarSrc(profile){
  if(profile && profile.photo) return profile.photo;
  const seed = encodeURIComponent(profile ? profile.name : 'friend');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=d1d4f9,ffd5dc,c0aede,b6e3f4,ffdfbf&radius=50&facialHairChance=0&top[]=LongHairStraight&top[]=LongHairCurly&top[]=LongHairBun&top[]=LongHairCurvy&top[]=LongHairBob`;
}

/* Resize + compress an uploaded image file to a small square JPEG data URL,
   so it stays small enough to store in the database. */
function fileToResizedDataUrl(file, maxSize = 260){
  return new Promise((resolve, reject) => {
    if(!file || !file.type.startsWith('image/')){
      reject(new Error('Please choose an image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function formatDate(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseTags(str){
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

function showToast(message){
  let toast = document.querySelector('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function qs(name){ return new URLSearchParams(window.location.search).get(name); }

/* ---------- sidebar ---------- */

function renderSidebar(active){
  const items = [
    { key: 'home', href: 'index.html', label: 'Home', icon: ICONS.home },
    { key: 'friends', href: 'friends.html', label: 'Friends', icon: ICONS.users },
    { key: 'add', href: 'friend-form.html', label: 'Add Friend', icon: ICONS.userPlus },
    { key: 'profile', href: 'profile.html', label: 'Profile', icon: ICONS.user }
  ];

  const nav = items.map(item => `
    <a href="${item.href}" class="${item.key === active ? 'active' : ''}">
      ${item.icon}<span>${item.label}</span>
    </a>`).join('');

  return `
    <aside class="sidebar">
      <a href="index.html" class="sidebar-logo">Circle ${ICONS.heart.replace('<svg ', '<svg class="heart" ')}</a>
      <ul class="sidebar-nav" style="list-style:none;padding:0;margin:0;">${nav}</ul>
      <div class="sidebar-mascot">
        <img src="${avatarUrl('circle-mascot-friend')}" alt="">
        <div class="mascot-bubble">Keep your circle close. ${ICONS.heart.replace('<svg ', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px" ')}</div>
      </div>
      <div class="sidebar-footer">Made with ${ICONS.heart.replace('<svg ', '<svg style="width:11px;height:11px;display:inline;vertical-align:-1px;color:var(--pink-ink)" ')} by <strong>Desiree Anne Godinez</strong></div>
    </aside>`;
}
