const USERS_KEY = 'protrade_users';
const TOKEN_KEY = 'protrade_token';
const SESSION_USER = 'protrade_session_user';

const sampleNews = [
  { title: 'Merkez bankaları faiz rehberi güncellendi', tag: 'Makro Analiz', time: '08:45', summary: 'Gelişen piyasa paritelerinde dolar endeksi baskısı düşerken TL için nötr görünüm korundu.' },
  { title: 'Enerji emtiaları ılımlı geri çekilme yaşadı', tag: 'Emtia', time: '09:10', summary: 'Petrol kontratlarında arz artışı fiyatları dengeliyor, altın yeniden güvenli liman algısını güçlendirdi.' },
  { title: 'Kripto varlıklarda kurumsal talep artıyor', tag: 'Kripto', time: '10:05', summary: 'On-chain veriler kurumsal cüzdanlardan çıkan BTC transferlerinin hızlandığını gösteriyor.' },
  { title: 'BIST100 şirketlerinden rekor temettü', tag: 'Hisse', time: '10:40', summary: 'Bankacılık sektörü bilanço açıklamaları endeksi desteklerken sanayi hisseleri yatay seyretti.' },
  { title: 'Paritede kritik destek çalıştı', tag: 'Forex', time: '11:25', summary: 'EUR/USD 1.07 üzerinde tutunmayı başardı; Fed açıklamaları volatilite yaratabilir.' }
];

const baseAssets = {
  kripto: 'KR',
  bist: 'BIST',
  forex: 'FX',
  emtia: 'EMT',
  global: 'GLB'
};

const defaultAdmin = {
  name: 'Admin Kullanıcı',
  email: 'admin@protrade.local',
  tc: '00000000000',
  password: 'admin',
  role: 'admin',
  verified: true,
  wallet: 0,
  portfolio: [],
  deposits: [],
  withdrawals: [],
  kycFiles: ['on', 'arka']
};

function generateAssets() {
  const bucket = {};
  Object.entries(baseAssets).forEach(([key, prefix]) => {
    bucket[key] = Array.from({ length: 200 }, (_, i) => ({
      code: `${prefix}${(i + 1).toString().padStart(3, '0')}`,
      name: `${key.toUpperCase()} Varlık ${(i + 1).toString().padStart(3, '0')}`,
      price: Number((Math.random() * 900 + 10).toFixed(2)),
      change: Number(((Math.random() - 0.5) * 6).toFixed(2))
    }));
  });
  return bucket;
}

const assetStore = generateAssets();

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch (err) {
    console.error('Kullanıcılar okunamadı', err);
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function seedAdmin() {
  const users = loadUsers();
  const exists = users.some((u) => u.role === 'admin');
  if (!exists) {
    users.push(defaultAdmin);
    saveUsers(users);
  }
}

function setSession(user) {
  const token = crypto.randomUUID();
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_USER, JSON.stringify(user));
  return token;
}

function currentUser() {
  try {
    const user = JSON.parse(localStorage.getItem(SESSION_USER));
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    return user;
  } catch (err) {
    return null;
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_USER);
  window.location.href = 'index.html';
}

function renderNews() {
  const container = document.querySelector('[data-news]');
  if (!container) return;
  container.innerHTML = sampleNews
    .map(
      (n) => `<article class="news-card">
        <div class="flex">
          <span class="badge-outline">${n.tag}</span>
          <small>${n.time}</small>
        </div>
        <strong>${n.title}</strong>
        <p>${n.summary}</p>
      </article>`
    )
    .join('');
}

function renderMarquee() {
  const container = document.querySelector('[data-marquee]');
  if (!container) return;
  const chips = Object.values(assetStore)
    .flat()
    .slice(0, 40)
    .map(
      (asset) => `<div class="chip">
        <strong>${asset.code}</strong>
        <span class="price">${asset.price.toFixed(2)}₺</span>
        <small class="${asset.change >= 0 ? 'highlight' : 'status danger'}">${asset.change}%</small>
      </div>`
    )
    .join('');
  container.innerHTML = `<div class="marquee"><div class="marquee-track">${chips}${chips}</div></div>`;
}

function register() {
  const form = document.querySelector('[data-register]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.tc || data.tc.length !== 11) {
      alert('TC kimlik numarası 11 haneli olmalıdır.');
      return;
    }
    const users = loadUsers();
    if (users.some((u) => u.tc === data.tc)) {
      alert('Bu TC kimlik numarası zaten kayıtlı.');
      return;
    }
    const newUser = {
      ...data,
      role: 'user',
      verified: false,
      wallet: 0,
      portfolio: [],
      deposits: [],
      withdrawals: [],
      kycFiles: []
    };
    users.push(newUser);
    saveUsers(users);
    form.reset();
    alert('Kayıt başarılı! Giriş yapabilirsiniz.');
  });
}

function login() {
  const form = document.querySelector('[data-login]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const users = loadUsers();
    const found = users.find((u) => u.tc === data.tc && u.password === data.password);
    if (!found) {
      alert('Bilgiler eşleşmedi.');
      return;
    }
    setSession(found);
    window.location.href = 'user.html';
  });
}

function requireSession(role) {
  const user = currentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  if (role && user.role !== role) {
    alert('Yetkisiz erişim.');
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function renderDashboard() {
  const user = requireSession();
  if (!user) return;
  const badge = document.querySelector('[data-verify]');
  if (badge) {
    badge.textContent = user.verified ? 'Doğrulandı' : 'Doğrulama Bekliyor';
    badge.className = `status ${user.verified ? 'ok' : 'warn'}`;
  }
  const wallet = document.querySelector('[data-wallet]');
  if (wallet) wallet.textContent = `${Number(user.wallet || 0).toFixed(2)} ₺`;

  const portfolio = document.querySelector('[data-portfolio]');
  if (portfolio) {
    portfolio.innerHTML = (user.portfolio || [])
      .map(
        (pos) => `<div class="chip">
          <strong>${pos.code}</strong>
          <span>${pos.amount} adet</span>
          <small>${pos.value.toFixed(2)}₺</small>
        </div>`
      )
      .join('') || '<p>Henüz pozisyonunuz yok.</p>';
  }
}

function renderMarkets() {
  const holder = document.querySelector('[data-markets]');
  if (!holder) return;
  holder.innerHTML = '';
  Object.entries(assetStore).forEach(([key, list]) => {
    const block = document.createElement('section');
    block.className = 'card';
    block.innerHTML = `<div class="action-row"><h3>${key.toUpperCase()}</h3><span class="pill">200 varlık</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'ticker';
    list.slice(0, 8).forEach((asset) => {
      const chip = document.createElement('div');
      chip.className = 'chip glow';
      chip.innerHTML = `<div class="action-row"><strong>${asset.name}</strong><span class="badge-outline">${asset.code}</span></div>
        <div class="flex"><span class="price">${asset.price.toFixed(2)}₺</span><span class="${asset.change >= 0 ? 'highlight' : 'status danger'}">${asset.change}%</span></div>
        <button class="btn" data-trade="${key}|${asset.code}">Hızlı İşlem</button>`;
      grid.appendChild(chip);
    });
    block.appendChild(grid);
    holder.appendChild(block);
  });

  holder.addEventListener('click', (e) => {
    const target = e.target.closest('button[data-trade]');
    if (!target) return;
    const user = requireSession();
    if (!user) return;
    if (!user.verified) {
      alert('İşlem yapmak için kimlik doğrulaması bekleniyor.');
      return;
    }
    const [segment, code] = target.dataset.trade.split('|');
    alert(`${segment.toUpperCase()} - ${code} için demo alım emri oluşturuldu.`);
  });
}

function handleKycUploads() {
  const form = document.querySelector('[data-kyc]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = requireSession();
    if (!user) return;
    user.kycFiles = ['on-yuz.jpg', 'arka-yuz.jpg'];
    saveUsers(updateUser(user));
    alert('Kimlik fotoğrafları yüklendi. Admin onayı bekleniyor.');
  });
}

function updateUser(updated) {
  const users = loadUsers();
  const next = users.map((u) => (u.tc === updated.tc ? updated : u));
  saveUsers(next);
  localStorage.setItem(SESSION_USER, JSON.stringify(updated));
  return next;
}

function renderPayments() {
  const formDeposit = document.querySelector('[data-deposit]');
  const formWithdraw = document.querySelector('[data-withdraw]');
  if (formDeposit) {
    formDeposit.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = requireSession();
      if (!user) return;
      const amount = Number(new FormData(formDeposit).get('amount'));
      user.deposits.push({ amount, status: 'Bekliyor' });
      updateUser(user);
      formDeposit.reset();
      alert('Yükleme isteği oluşturuldu. Admin onayı bekleniyor.');
    });
  }
  if (formWithdraw) {
    formWithdraw.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = requireSession();
      if (!user) return;
      const amount = Number(new FormData(formWithdraw).get('amount'));
      user.withdrawals.push({ amount, status: 'Bekliyor' });
      updateUser(user);
      formWithdraw.reset();
      alert('Çekim isteği oluşturuldu. Admin onayı bekleniyor.');
    });
  }
}

function renderAdmin() {
  const user = requireSession('admin');
  if (!user) return;
  const users = loadUsers();
  const list = document.querySelector('[data-admin-users]');
  if (list) {
    list.innerHTML = users
      .map(
        (u) => `<tr><td>${u.tc}</td><td>${u.name}</td><td>${u.email}</td><td>${u.kycFiles?.length ? 'Beklemede' : 'Eksik'}</td>
        <td><button class="btn" data-approve="${u.tc}">Doğrula</button></td></tr>`
      )
      .join('');
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-approve]');
      if (!btn) return;
      const targetTc = btn.dataset.approve;
      const targetUser = users.find((u) => u.tc === targetTc);
      if (!targetUser) return;
      targetUser.verified = true;
      updateUser(targetUser);
      alert(`${targetUser.name} doğrulandı.`);
      renderAdmin();
    });
  }

  const feed = document.querySelector('[data-feed]');
  if (feed) {
    feed.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-feed-toggle]');
      if (!btn) return;
      const mode = btn.dataset.feedToggle;
      alert(`Market akışı ${mode} modunda güncellendi.`);
    });
  }

  const walletForm = document.querySelector('[data-wallet-admin]');
  if (walletForm) {
    walletForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(walletForm);
      const tc = formData.get('tc');
      const amount = Number(formData.get('amount'));
      const targetUser = users.find((u) => u.tc === tc);
      if (!targetUser) {
        alert('Kullanıcı bulunamadı');
        return;
      }
      targetUser.wallet = Number(targetUser.wallet || 0) + amount;
      updateUser(targetUser);
      alert(`${tc} cüzdanı ${amount}₺ güncellendi.`);
      walletForm.reset();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  seedAdmin();
  renderNews();
  renderMarquee();
  register();
  login();
  renderDashboard();
  renderMarkets();
  handleKycUploads();
  renderPayments();
  renderAdmin();

  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
