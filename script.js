const audio = document.getElementById('audioElement');
let isPlaying = false;
let audioCtx, analyser, dataArray, source;
const canvas = document.getElementById('audioSpectrum');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

const el = id => document.getElementById(id);

function iniciarEspectro() {
  if (!audioCtx && canvasCtx) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      desenharEspectro();
    } catch (e) { console.log("CORS bloqueou o espectro.", e); }
  }
  if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
}

function desenharEspectro() {
  if (!isPlaying || !canvasCtx) return;
  requestAnimationFrame(desenharEspectro);
  analyser.getByteFrequencyData(dataArray);
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / 32) - 2;
  let x = 0;
  for(let i = 0; i < 32; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#f4741f');
    gradient.addColorStop(1, '#ff4c4c');
    canvasCtx.fillStyle = gradient;
    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 2;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.log('SW falhou:', e));
  });
}

const volumeControl = el('volumeControl');
if (audio && volumeControl) { audio.volume = volumeControl.value / 100; }

function togglePlay() {
  const iconSticky = el('playPauseIcon');
  const iconHero = el('heroPlayIcon');
  const cover = el('playerCover');

  if (audio.paused) {
    if(iconSticky) iconSticky.className = "fas fa-spinner fa-spin";
    if(iconHero) iconHero.className = "fas fa-spinner fa-spin";
    audio.load();
    audio.play().then(() => {
      isPlaying = true; 
      if(iconSticky) iconSticky.className = "fas fa-pause";
      if(iconHero) iconHero.className = "fas fa-pause";
      if(cover) cover.classList.add('playing');
      iniciarEspectro();
    }).catch(error => { 
      console.error(error); 
      if(iconSticky) iconSticky.className = "fas fa-play";
      if(iconHero) iconHero.className = "fas fa-play";
      alert("Verifique sua conexão e tente novamente."); 
    });
  } else {
    audio.pause(); isPlaying = false; 
    if(iconSticky) iconSticky.className = "fas fa-play";
    if(iconHero) iconHero.className = "fas fa-play";
    if(cover) cover.classList.remove('playing');
    if(canvasCtx) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function toggleMute() { 
  const muteIcon = el('muteIcon');
  if(!muteIcon || !volumeControl) return;
  if (audio.volume > 0) { 
    audio.dataset.lastVol = audio.volume; audio.volume = 0; volumeControl.value = 0; 
    muteIcon.className = "fas fa-volume-mute sp-vol-icon"; 
  } else { 
    const lastVol = audio.dataset.lastVol || 0.8; audio.volume = lastVol; volumeControl.value = lastVol * 100; 
    atualizarIconeVolume(lastVol, muteIcon); 
  } 
}

function atualizarIconeVolume(vol, icone) { 
  if (vol === 0) icone.className = "fas fa-volume-mute sp-vol-icon"; 
  else if (vol < 0.5) icone.className = "fas fa-volume-down sp-vol-icon"; 
  else icone.className = "fas fa-volume-up sp-vol-icon"; 
}
if (volumeControl) { volumeControl.addEventListener('input', (e) => { const vol = e.target.value / 100; audio.volume = vol; atualizarIconeVolume(vol, el('muteIcon')); }); }

function updateMediaSession(title, artist, artworkUrl) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: 'Radiação.Net',
      artwork: [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }]
    });
  }
}

function abrirModal(idModal) { const m = el(idModal); if(m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; } }
function fecharModal(idModal) { const m = el(idModal); if(m) { m.classList.add('closing'); setTimeout(() => { m.classList.remove('active'); m.classList.remove('closing'); document.body.style.overflow = 'auto'; }, 350); } }
function fecharModalFora(event, idModal) { if (event.target.id === idModal) fecharModal(idModal); }

function compartilharSite() {
  const line1 = el('playerLine1');
  const line2 = el('playerLine2');
  const currentSong = line1 ? line1.innerText : '';
  const currentArtist = line2 ? line2.innerText : '';
  const textoFormatado = currentSong !== "Carregando..."
    ? `Estou ouvindo ${currentSong} de ${currentArtist} na Radiação.Net! Vem ouvir junto:`
    : 'Estou ouvindo a Radiação.Net - A web rádio de todas as tribos! Ouça também:';
  if (navigator.share) {
    navigator.share({ title: 'Radiação.Net', text: textoFormatado, url: window.location.href }).catch((e) => console.log(e));
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado!');
  }
}

function toggleMobileMenu() {
  const menu = el('navMenu');
  if(menu) menu.classList.toggle('active');
}

function changeDay(event, targetId) {
  document.querySelectorAll('.prog-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.day-pill').forEach(e => e.classList.remove('active'));
  const content = el(targetId);
  if(content) content.classList.add('active');
  event.currentTarget.classList.add('active');
}

function setToday() {
  const days = ['prog-dom', 'prog-seg', 'prog-ter', 'prog-qua', 'prog-qui', 'prog-sex', 'prog-sab'];
  const today = new Date().getDay();
  const todayId = days[today];
  document.querySelectorAll('.prog-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.day-pill').forEach(e => e.classList.remove('active'));
  const targetContent = el(todayId);
  if(targetContent) targetContent.classList.add('active');
  const targetBtn = document.querySelector(`.day-pill[data-target="${todayId}"]`);
  if(targetBtn) {
    targetBtn.classList.add('active');
    //targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

const imagensFundo = {
  "default": "url('https://painel.radiacao.net.br/static/uploads/background.1791564225.webp')",
  "fred": "url('https://i.postimg.cc/pLR9yzgz/Cool-Reggae-Wallpaper.jpg')",
  "alessandro": "url('https://i.postimg.cc/1XmTfWrs/futuristic-city-5120x2880-15887.jpg')",
  "rafa": "url('https://i.postimg.cc/nVST4cHB/photo-1540747913346-19e32dc3e97e.jpg')",
  "bigt": "url('https://i.postimg.cc/0N1VzW9Z/Anime-Boy-Gamer-Wallpaper.jpg')",
  "alex": "url('https://i.postimg.cc/Kvg7tPpv/Electronic-Music-Wallpaper-Sf.jpg')"
};

const parceirosOficiais = {
  "fred": "https://github.com/radiacaonet20/site-radiacao/blob/main/imagens/parceiro_tspowersuplementos.jpg?raw=true",
  "rafa": "https://github.com/radiacaonet20/site-radiacao/blob/main/imagens/parceiro_ironcont.jpg?raw=true",
  "alex": "https://github.com/radiacaonet20/site-radiacao/blob/main/imagens/parceiro_petmaisvida.jpg?raw=true"
};

async function atualizarNowPlaying() {
  try {
    const response = await fetch('https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json?_=' + new Date().getTime(), { cache: 'no-store' });
    const data = await response.json();

    const isLive = data.live.is_live;
    const streamer = data.live.streamer_name;
    const displayTitle = isLive ? ((data.now_playing.song.text || "").split(' - ')[0] || "Ao Vivo") : (data.now_playing.song.title || "Desconhecido");
    const displayArtist = isLive ? `🎙️ ${streamer}` : (data.now_playing.song.artist || "Desconhecido");
    const coverUrl = data.now_playing.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png';

    if(el('playerLine1')) el('playerLine1').innerText = displayTitle;
    if(el('playerLine2')) el('playerLine2').innerText = displayArtist;
    if(el('playerCover')) el('playerCover').src = coverUrl;
    if(el('heroShowName')) el('heroShowName').innerText = displayTitle;
    if(el('heroLocutor')) el('heroLocutor').innerText = displayArtist;

    const historyList = el('lista-historico');
    if (historyList && data.song_history && data.song_history.length > 0) {
      historyList.innerHTML = '';
      data.song_history.slice(0, 5).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="item-left"><img src="${item.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png'}" class="thumb-img thumb-logo"><div class="member-info"><span class="member-name" style="font-size: 0.9rem;">${item.song.title}</span><span class="member-role" style="font-size: 0.75rem; color: #aaa;">${item.song.artist}</span></div></div>`;
        historyList.appendChild(li);
      });
    }

    let bgChaveAtiva = "default";
    ['sponsorBadge', 'heroSponsorBadge', 'playerLiveBadge', 'heroLiveBadge', 'btnRequestLive'].forEach(id => { if(el(id)) el(id).style.display = 'none'; });

    if (isLive) {
      ['playerLiveBadge', 'heroLiveBadge', 'btnRequestLive'].forEach(id => { if(el(id)) el(id).style.display = 'flex'; });
      const locutorBuscaLower = streamer.toLowerCase();
      for (const chave in imagensFundo) {
        if (locutorBuscaLower.includes(chave)) {
          bgChaveAtiva = chave;
          if (parceirosOficiais[chave]) {
            if(el('sponsorImg')) { el('sponsorImg').src = parceirosOficiais[chave]; el('sponsorBadge').style.display = 'flex'; }
            if(el('heroSponsorImg')) { el('heroSponsorImg').src = parceirosOficiais[chave]; el('heroSponsorBadge').style.display = 'flex'; }
          }
          break;
        }
      }
    }

    if (document.body.dataset.bg !== bgChaveAtiva) {
      document.body.dataset.bg = bgChaveAtiva;
      document.documentElement.style.setProperty('--bg-imagem', imagensFundo[bgChaveAtiva]);
    }
  } catch (error) { console.error("Erro na rádio:", error); }
}

// ============================================================================
// LÓGICA DO PWA (GARANTIDA NO MOBILE E NO SIMULADOR F12)
// ============================================================================
const btnInstallNav = el('btnInstallNav');
const menuInstallApp = el('menuInstallApp');
const pwaBanner = el('pwaBanner');
const btnInstallBanner = el('btnInstallBanner');

let eventoInstalacao = null;

window.fecharPwaBanner = function() {
  if(pwaBanner) {
    pwaBanner.classList.remove('show');
    sessionStorage.setItem('radiacao_pwa_fechado_sessao', 'true');
  }
};

// Captura o evento nativo sempre que o navegador disponibilizar
window.addEventListener('beforeinstallprompt', (e) => { 
  e.preventDefault(); 
  eventoInstalacao = e; 
});

window.addEventListener('appinstalled', () => { 
  eventoInstalacao = null; 
  if(btnInstallNav) btnInstallNav.classList.remove('visible-install');
  if(menuInstallApp) menuInstallApp.style.display = 'none';
  if(pwaBanner) pwaBanner.classList.remove('show');
});

function verificarExibicaoPwaMobile() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const fechadoNaSessao = sessionStorage.getItem('radiacao_pwa_fechado_sessao');
  const isTelaMobile = window.innerWidth <= 950;

  if (!isStandalone && isTelaMobile) {
    if(menuInstallApp) menuInstallApp.style.display = 'flex';
    if (!fechadoNaSessao && pwaBanner) {
      pwaBanner.classList.add('show');
    }
  } else {
    if(pwaBanner) pwaBanner.classList.remove('show');
  }
}

const acionarInstalacaoPwa = async (event) => { 
  if(event) event.preventDefault();
  if (eventoInstalacao) {
    eventoInstalacao.prompt(); 
    const { outcome } = await eventoInstalacao.userChoice; 
    if (outcome === 'accepted') { 
      if(pwaBanner) pwaBanner.classList.remove('show');
    } 
    eventoInstalacao = null; 
  } else {
    // Caso seja iOS ou o navegador tenha suprimido o prompt automático, abre o guia visual
    abrirModal('modal-ios');
  }
};

if(btnInstallNav) btnInstallNav.addEventListener('click', acionarInstalacaoPwa);
if(menuInstallApp) menuInstallApp.addEventListener('click', acionarInstalacaoPwa);
if(btnInstallBanner) btnInstallBanner.addEventListener('click', acionarInstalacaoPwa);
window.addEventListener('resize', verificarExibicaoPwaMobile);

// ============================================================================
// MOTOR DE NOTÍCIAS RSS ULTRA-RÁPIDO (PARALELO + TIMEOUT DE 3 SEGUNDOS)
// ============================================================================
const noticiasFallback = [
  {
    titulo: "Rasta Flow: A força e a história do Reggae Roots",
    link: "#programacao",
    descricao: "Sintonize na Radiação.Net às terças-feiras às 21h com Fred Macêdo e curta as melhores pedras do reggae.",
    categoria: "Música",
    cor: "#eab308",
    fonte: "Radiação.Net"
  },
  {
    titulo: "Sem Clubismo: Os debates mais quentes do futebol",
    link: "#programacao",
    descricao: "Segundas e quartas às 21h30, Rafa Barros e Josiel Pereira trazem a análise completa da rodada.",
    categoria: "Esporte",
    cor: "#22c55e",
    fonte: "Radiação.Net"
  },
  {
    titulo: "Ouça a Radiação.Net em qualquer lugar pelo Web App",
    link: "#home",
    descricao: "A nossa plataforma conta com tecnologia PWA de última geração para ouvir a rádio de todas as tribos sem interrupções.",
    categoria: "Tecnologia",
    cor: "#3b82f6",
    fonte: "Radiação.Net"
  },
  {
    titulo: "Bastidores e decisões da política nacional em pauta",
    link: "#noticias",
    descricao: "Acompanhe as principais atualizações do cenário político e econômico ao longo da nossa programação.",
    categoria: "Política",
    cor: "#a855f7",
    fonte: "Radar Radiação"
  },
  {
    titulo: "Casa dos Clássicos e Território Maranhense em destaque",
    link: "#programacao",
    descricao: "Alessandro Neves comanda grandes viagens musicais valorizando os clássicos mundiais e a cultura local.",
    categoria: "Atualidades",
    cor: "#ef4444",
    fonte: "Radiação.Net"
  },
  {
    titulo: "LootCast: O seu programa geek na Radiação.Net",
    link: "#equipe",
    descricao: "Cultura pop, jogos e tecnologia em debate com a apresentação de BigT.",
    categoria: "Tecnologia",
    cor: "#3b82f6",
    fonte: "Radiação.Net"
  }
];

async function fetchComTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function buscarFeedRapido(feed) {
  // Tenta via rss2json primeiro com limite estrito de 3 segundos
  try {
    const urlApi = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    const res = await fetchComTimeout(urlApi, 3000);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok' && data.items && data.items.length > 0) {
        return data.items.slice(0, 2).map(item => ({
          titulo: item.title,
          link: item.link,
          descricao: (item.description || "").replace(/<[^>]*>?/gm, '').trim().substring(0, 110) + '...',
          data: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
          categoria: feed.categoria,
          cor: feed.cor,
          fonte: feed.fonte
        }));
      }
    }
  } catch (e) {}

  // Plano B imediato via AllOrigins com limite de 3 segundos
  const urlProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
  const resProxy = await fetchComTimeout(urlProxy, 3000);
  if (!resProxy.ok) throw new Error("Timeout ou erro no proxy");
  const dataProxy = await resProxy.json();

  const parser = new DOMParser();
  const xml = parser.parseFromString(dataProxy.contents, "text/xml");
  const items = Array.from(xml.querySelectorAll("item")).slice(0, 2);

  return items.map(item => {
    const rawDesc = item.querySelector("description")?.textContent || "";
    const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, '').trim().substring(0, 110) + '...';
    const pubDateStr = item.querySelector("pubDate")?.textContent;
    return {
      titulo: item.querySelector("title")?.textContent || "Notícia",
      link: item.querySelector("link")?.textContent || "#",
      descricao: cleanDesc.length > 5 ? cleanDesc : "Clique para ler a matéria completa no portal.",
      data: pubDateStr ? new Date(pubDateStr).getTime() : Date.now(),
      categoria: feed.categoria,
      cor: feed.cor,
      fonte: feed.fonte
    };
  });
}

async function carregarNoticiasRSS() {
  const container = el('newsList');
  if(!container) return;

  const cacheKey = 'radiacao_news_v3';
  const cacheTimeKey = 'radiacao_news_time_v3';
  const agora = Date.now();
  
  // Categorias com cores padronizadas (incluindo Política, Esporte, Tecnologia, Música e Atualidades)
  const feeds = [
    { url: 'https://g1.globo.com/rss/g1/politica/', categoria: 'Política', cor: '#a855f7', fonte: 'G1 Política' },
    { url: 'https://g1.globo.com/rss/g1/esporte/', categoria: 'Esporte', cor: '#22c55e', fonte: 'GE / Esporte' },
    { url: 'https://g1.globo.com/rss/g1/tecnologia/', categoria: 'Tecnologia', cor: '#3b82f6', fonte: 'G1 Tech' },
    { url: 'https://g1.globo.com/rss/g1/pop-arte/musica/', categoria: 'Música', cor: '#eab308', fonte: 'G1 Música' }
  ];

  // Se houver cache recente (menos de 30 min), exibe instantaneamente (0ms)
  if (localStorage.getItem(cacheKey) && (agora - localStorage.getItem(cacheTimeKey) < 1800000)) {
    try {
      const cachedData = JSON.parse(localStorage.getItem(cacheKey));
      if (cachedData && cachedData.length > 0) {
        renderizarCardsDeNoticias(cachedData, container);
        return;
      }
    } catch (e) {}
  }

  // Busca todos os feeds AO MESMO TEMPO (em paralelo, máximo de 3 segundos no total)
  const resultados = await Promise.allSettled(feeds.map(feed => buscarFeedRapido(feed)));
  let todasNoticias = [];

  resultados.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      todasNoticias = todasNoticias.concat(res.value);
    }
  });

  if (todasNoticias.length > 0) {
    todasNoticias.sort((a, b) => b.data - a.data);
    const topNews = todasNoticias.slice(0, 6);
    localStorage.setItem(cacheKey, JSON.stringify(topNews));
    localStorage.setItem(cacheTimeKey, agora.toString());
    renderizarCardsDeNoticias(topNews, container);
  } else {
    renderizarCardsDeNoticias(noticiasFallback, container);
  }
}

function renderizarCardsDeNoticias(noticias, container) {
  container.innerHTML = ''; 
  
  noticias.forEach(noticia => {
    const card = document.createElement('a');
    card.href = noticia.link;
    if (noticia.link.startsWith('http')) {
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }
    card.className = 'news-card-item';
    card.innerHTML = `
      <span class="news-tag" style="background: ${noticia.cor};">${noticia.categoria}</span>
      <h4>${noticia.titulo}</h4>
      <p>${noticia.descricao}</p>
      <span class="news-source"><i class="fas fa-newspaper"></i> ${noticia.fonte}</span>
    `;
    container.appendChild(card);
  });
}

function inicializarParceiros() {
  const track = el('partnersTrack');
  const slider = el('partnersSlider');
  if (!track || !slider) return;
  const cards = track.querySelectorAll('.partner-card');
  const limiteAnimacao = window.innerWidth <= 480 ? 3 : 5; 
  if (cards.length >= limiteAnimacao) {
    slider.classList.add('is-animated');
    track.classList.add('is-animated');
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }
}

async function enviarPedido(event) {
  event.preventDefault();
  const ultimoPedidoTimestamp = localStorage.getItem('radiacao_ultimo_pedido');
  if (ultimoPedidoTimestamp && (Date.now() - parseInt(ultimoPedidoTimestamp) < 3 * 60 * 1000)) { alert("⏳ O seu pedido já está na fila! Para evitar spam, aguarde alguns minutos."); return; }

  const btn = el('btn-enviar-pedido');
  const nome = el('pedido-nome').value; const musica = el('pedido-musica').value; const recado = el('pedido-recado').value;
  if(btn) { btn.disabled = true; btn.innerText = 'Enviando... ⏳'; }

  try {
    const response = await fetch('https://radiacaonet-default-rtdb.firebaseio.com/pedidos.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome, musica: musica, recado: recado, data_hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }) });
    if (response.ok) {
      localStorage.setItem('radiacao_ultimo_pedido', Date.now().toString()); 
      if(btn) btn.innerText = 'Pedido Enviado! ✅';
      setTimeout(() => { fecharModal('modal-pedido'); el('form-pedido').reset(); if(btn){ btn.disabled = false; btn.innerText = 'Enviar Pedido 🚀';} }, 2000);
    } else { throw new Error('Falha no Firebase'); }
  } catch (error) { console.error('Erro:', error); if(btn) { btn.innerText = 'Erro ao enviar ❌'; setTimeout(() => { btn.disabled = false; btn.innerText = 'Enviar Pedido 🚀'; }, 3000); } }
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarParceiros(); 
  atualizarNowPlaying(); 
  setInterval(atualizarNowPlaying, 5000); 
  setToday(); 
  carregarNoticiasRSS(); 
  setTimeout(verificarExibicaoPwaMobile, 1500); // Exibe o card PWA no mobile após 1.5s
  if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play', togglePlay); navigator.mediaSession.setActionHandler('pause', togglePlay); }
});