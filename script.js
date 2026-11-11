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
      document.body.classList.add('radio-playing');
      if(iconSticky) iconSticky.className = "fas fa-pause";
      if(iconHero) iconHero.className = "fas fa-pause";
      if(cover) cover.classList.add('playing');
      iniciarEspectro();
    }).catch(error => { 
      console.error(error);
      document.body.classList.remove('radio-playing');
      if(iconSticky) iconSticky.className = "fas fa-play";
      if(iconHero) iconHero.className = "fas fa-play";
      alert("Verifique sua conexão e tente novamente."); 
    });
  } else {
    audio.pause(); isPlaying = false;
    document.body.classList.remove('radio-playing');
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

function toggleMobileMenu(forceState) {
  const menu = el('navMenu');
  const backdrop = el('navDrawerBackdrop');
  const button = document.querySelector('.mobile-menu-btn');
  if (!menu || !backdrop) return;

  const isMobile = window.matchMedia('(max-width: 950px)').matches;
  const shouldOpen = isMobile && (typeof forceState === 'boolean'
    ? forceState
    : !menu.classList.contains('active'));

  if (shouldOpen) {
    menu.classList.add('active');
    backdrop.classList.add('active');
    menu.setAttribute('aria-hidden', 'false');
    if (button) button.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-drawer-open');
    menu.querySelector('.nav-drawer-close')?.focus();
  } else {
    const focusWasInside = menu.contains(document.activeElement);
    menu.classList.remove('active');
    backdrop.classList.remove('active');
    menu.setAttribute('aria-hidden', isMobile ? 'true' : 'false');
    if (button) button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-drawer-open');
    if (focusWasInside && isMobile) button?.focus();
  }
}

// Mantém o menu acessível no desktop e controla o foco como um drawer no mobile.
function sincronizarEstadoMenuPorViewport() {
  const menu = el('navMenu');
  const button = document.querySelector('.mobile-menu-btn');
  if (!menu) return;
  const isMobile = window.matchMedia('(max-width: 950px)').matches;
  if (!isMobile) {
    menu.classList.remove('active');
    el('navDrawerBackdrop')?.classList.remove('active');
    document.body.classList.remove('nav-drawer-open');
    menu.setAttribute('aria-hidden', 'false');
    if (button) button.setAttribute('aria-expanded', 'false');
  } else if (!menu.classList.contains('active')) {
    menu.setAttribute('aria-hidden', 'true');
    if (button) button.setAttribute('aria-expanded', 'false');
  }
}

window.addEventListener('resize', sincronizarEstadoMenuPorViewport);
sincronizarEstadoMenuPorViewport();

document.addEventListener('keydown', function(event) {
  const menu = el('navMenu');
  if (!menu?.classList.contains('active')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    toggleMobileMenu(false);
    return;
  }

  if (event.key === 'Tab') {
    const focusable = Array.from(menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(item => item.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }
});
/* Navegação principal: rolagem suave e identificação confiável da seção ativa. */
function inicializarNavegacaoAtiva() {
  const menu = document.getElementById('navMenu');
  if (!menu) return;

  // Ignora âncoras vazias (como href="#" do botão de instalação do app)
  // e considera somente links que apontam para seções realmente existentes.
  const navigation = Array.from(menu.querySelectorAll('a[href^="#"]'))
    .map(link => ({ link, id: link.getAttribute('href').slice(1) }))
    .filter(item => item.id && document.getElementById(item.id));

  const links = navigation.map(item => item.link);
  const sections = navigation.map(item => document.getElementById(item.id));
  if (!links.length || !sections.length) return;

  function atualizarLinkAtivo() {
    const navbarHeight = document.querySelector('.portal-navbar')?.offsetHeight || 0;
    const referencia = navbarHeight + 35;
    let secaoAtual = sections[0];

    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= referencia) {
        secaoAtual = section;
      }
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      secaoAtual = sections[sections.length - 1];
    }

    links.forEach(link => {
      const ativo = link.getAttribute('href') === `#${secaoAtual.id}`;
      link.classList.toggle('active', ativo);
      if (ativo) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  let agendado = false;
  function solicitarAtualizacao() {
    if (agendado) return;
    agendado = true;
    window.requestAnimationFrame(() => {
      atualizarLinkAtivo();
      agendado = false;
    });
  }

  links.forEach(link => {
    link.addEventListener('click', event => {
      const destino = document.querySelector(link.getAttribute('href'));
      if (!destino) return;

      event.preventDefault();
      toggleMobileMenu(false);

      const navbarHeight = document.querySelector('.portal-navbar')?.offsetHeight || 0;
      const destinoY = destino.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 12;

      window.scrollTo({
        top: Math.max(0, destinoY),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });

      links.forEach(item => {
        const ativo = item === link;
        item.classList.toggle('active', ativo);
        if (ativo) item.setAttribute('aria-current', 'location');
        else item.removeAttribute('aria-current');
      });
    });
  });

  window.addEventListener('scroll', solicitarAtualizacao, { passive: true });
  window.addEventListener('resize', solicitarAtualizacao);
  window.addEventListener('load', atualizarLinkAtivo, { once: true });
  atualizarLinkAtivo();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarNavegacaoAtiva, { once: true });
} else {
  inicializarNavegacaoAtiva();
}

function changeDay(event, targetId) {
  document.querySelectorAll('.prog-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.day-pill').forEach(e => e.classList.remove('active'));
  const content = el(targetId);
  if(content) content.classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  atualizarCabecalhoProgramacao(targetId);
}

function atualizarCabecalhoProgramacao(targetId) {
  const nomes = {
    'prog-dom':'Domingo','prog-seg':'Segunda-feira','prog-ter':'Terça-feira',
    'prog-qua':'Quarta-feira','prog-qui':'Quinta-feira','prog-sex':'Sexta-feira','prog-sab':'Sábado'
  };
  const heading = el('scheduleDayHeading');
  const dateLabel = el('scheduleDateLabel');
  if (heading) heading.textContent = targetId === diasProgramacaoHoje() ? 'Hoje na Radiação.Net' : 'Programação de ' + (nomes[targetId] || 'hoje');
  if (dateLabel) {
    const hoje = new Date();
    const data = targetId === diasProgramacaoHoje()
      ? hoje
      : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + ((Object.keys(nomes).indexOf(targetId) - hoje.getDay() + 7) % 7));
    dateLabel.textContent = data.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' });
  }
}

function diasProgramacaoHoje() {
  return ['prog-dom','prog-seg','prog-ter','prog-qua','prog-qui','prog-sex','prog-sab'][new Date().getDay()];
}

function setToday() {
  const todayId = diasProgramacaoHoje();
  document.querySelectorAll('.prog-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.day-pill').forEach(e => e.classList.remove('active'));
  const targetContent = el(todayId);
  if(targetContent) targetContent.classList.add('active');
  const targetBtn = document.querySelector(`.day-pill[data-target="${todayId}"]`);
  if(targetBtn) targetBtn.classList.add('active');
  atualizarCabecalhoProgramacao(todayId);
}

function inicializarVisaoSemanal() {
  const schedule = el('modernSchedule');
  const toggle = el('scheduleWeekToggle');
  if (!schedule || !toggle) return;
  toggle.addEventListener('click', () => {
    const expanded = schedule.classList.toggle('week-expanded');
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.querySelector('span').textContent = expanded ? 'Mostrar somente o dia' : 'Ver semana completa';
    const icon = toggle.querySelector('.schedule-toggle-chevron');
    if (icon) icon.classList.toggle('rotated', expanded);
  });
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

function ajustarTituloHero(titulo) {
  const titleElement = el('heroShowName');
  const card = titleElement?.closest('.hero-now-playing');
  if (!titleElement || !card) return;

  const texto = String(titulo || '').trim();
  const quantidade = Array.from(texto).length;
  card.classList.remove('title-medium', 'title-compact', 'title-marquee');
  titleElement.removeAttribute('data-marquee');
  titleElement.style.removeProperty('--hero-marquee-duration');

  if (quantidade > 34) card.classList.add('title-medium');
  if (quantidade > 62) card.classList.add('title-compact');

  // Só ativa o letreiro para nomes muito extensos, evitando movimento desnecessário.
  if (quantidade > 92) {
    card.classList.add('title-marquee');
    titleElement.setAttribute('data-marquee', texto);
    titleElement.style.setProperty('--hero-marquee-duration', `${Math.min(34, Math.max(18, quantidade * 0.22))}s`);
  }
}

async function atualizarNowPlaying() {
  try {
    const response = await fetch('https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json?_=' + new Date().getTime(), { cache: 'no-store' });
    const data = await response.json();

    const isLive = data.live.is_live;
    const streamer = data.live.streamer_name || '';
    document.body.classList.toggle('radio-live', Boolean(isLive));
    const displayTitle = isLive ? ((data.now_playing.song.text || "").split(' - ')[0] || "Ao Vivo") : (data.now_playing.song.title || "Desconhecido");
    const displayArtist = isLive ? `🎙️ ${streamer}` : (data.now_playing.song.artist || "Desconhecido");
    const coverUrl = data.now_playing.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png';

    if(el('playerLine1')) el('playerLine1').innerText = displayTitle;
    if(el('playerLine2')) el('playerLine2').innerText = displayArtist;
    if(el('playerCover')) el('playerCover').src = coverUrl;
    if(el('heroShowName')) { el('heroShowName').innerText = displayTitle; ajustarTituloHero(displayTitle); }
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
    const btnPedidos = el('btnRequestLive');
    if (btnPedidos) {
      const jaVisivel = btnPedidos.dataset.liveVisible === 'true';
      btnPedidos.style.display = isLive ? 'flex' : 'none';
      if (isLive && !jaVisivel) {
        btnPedidos.classList.remove('is-entering');
        void btnPedidos.offsetWidth;
        btnPedidos.classList.add('is-entering');
      }
      btnPedidos.dataset.liveVisible = isLive ? 'true' : 'false';
    }
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
const pwaBanner = el('pwaBanner');
const btnInstallBanner = el('btnInstallBanner');
const communityInstallApp = el('communityInstallApp');

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
  if(pwaBanner) pwaBanner.classList.remove('show');
});

function verificarExibicaoPwaMobile() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const fechadoNaSessao = sessionStorage.getItem('radiacao_pwa_fechado_sessao');
  const isTelaMobile = window.innerWidth <= 950;

  if (!isStandalone && isTelaMobile) {
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

if(btnInstallBanner) btnInstallBanner.addEventListener('click', acionarInstalacaoPwa);
if(communityInstallApp) communityInstallApp.addEventListener('click', acionarInstalacaoPwa);
window.addEventListener('resize', verificarExibicaoPwaMobile);

// ============================================================================
// MOTOR DE NOTÍCIAS RSS ULTRA-RÁPIDO (PARALELO + TIMEOUT DE 3 SEGUNDOS)
// ============================================================================
// O Radar exibe somente notícias reais retornadas pelo serviço RSS configurado.

// URL do Cloudflare Worker. Após publicar worker.js, cole aqui a URL fornecida pela Cloudflare.
// Exemplo: https://radiacao-rss.seu-nome.workers.dev
const RADAR_RSS_API_URL = 'https://radacao-rss.fromacedo.workers.dev';

function limparTextoRSS(valor) {
  let texto = String(valor || '');
  for (let i = 0; i < 3; i++) {
    const decodificado = texto
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'");
    if (decodificado === texto) break;
    texto = decodificado;
  }
  return texto
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!\[CDATA\[|\]\]>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function carregarNoticiasRSS() {
  const container = el('newsList');
  if (!container) return;

  // Não reaproveita notícias antigas: a cada abertura, exibe apenas o retorno atual das fontes disponíveis.
  const agora = Date.now();

  if (!RADAR_RSS_API_URL || RADAR_RSS_API_URL.includes('COLE_A_URL')) {
    mostrarAvisoNoticias(container, 'O Radar está aguardando a configuração do serviço RSS. Depois de publicar o Cloudflare Worker, informe a URL dele no script.js.');
    return;
  }

  try {
    const resposta = await fetchComTimeout(RADAR_RSS_API_URL.replace(/\/$/, '') + '/?limit=30', 12000);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (!dados || !Array.isArray(dados.items)) throw new Error('Resposta RSS inválida.');

    const vistos = new Set();
    const noticias = dados.items.filter(n => {
      if (!n || !n.titulo) return false;
      const link = urlNoticiaSegura(n.link);
      if (!link || new URL(link).origin === window.location.origin) return false;
      const chave = link.split('#')[0].replace(/\/$/, '').toLowerCase();
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      n.link = link;
      return true;
    }).map(n => ({
      titulo: String(n.titulo).trim(),
      link: n.link,
      descricao: limparTextoRSS(n.descricao).slice(0, 240),
      data: n.data ? new Date(n.data).getTime() : null,
      categoria: n.categoria || 'Atualidades',
      cor: n.cor || '#f4741f',
      fonte: n.fonte || nomeFonteNoticia(n, n.link)
    })).filter(n => n.titulo && n.link);

    noticias.sort((a, b) => (b.data || 0) - (a.data || 0));
    const selecionadas = noticias.slice(0, 9);
    if (!selecionadas.length) {
      mostrarAvisoNoticias(container, 'Nenhuma fonte RSS está disponível neste momento. Tente novamente em alguns minutos.');
      return;
    }

    renderizarCardsDeNoticias(selecionadas, container);
  } catch (erro) {
    console.warn('Radar Radiação: não foi possível carregar os feeds RSS.', erro);
    mostrarAvisoNoticias(container, 'Não foi possível carregar notícias das fontes disponíveis agora. Tente novamente em alguns minutos.');
  }
}

function mostrarAvisoNoticias(container, mensagem) {
  container.replaceChildren();
  const aviso = document.createElement('p');
  aviso.className = 'news-load-message';
  aviso.setAttribute('role', 'status');
  aviso.textContent = mensagem;
  container.appendChild(aviso);
}

async function fetchComTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
}

function urlNoticiaSegura(valor) {
  try {
    const url = new URL(String(valor || ''), window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (e) {
    return '';
  }
}

function nomeFonteNoticia(noticia, urlSegura) {
  // Notícias internas da própria rádio mantêm a identificação Radiação.Net.
  if (!urlSegura || new URL(urlSegura).origin === window.location.origin) {
    return 'Radiação.Net';
  }

  try {
    const host = new URL(urlSegura).hostname.toLowerCase().replace(/^www\./, '');
    const nomesConhecidos = {
      'g1.globo.com': 'G1',
      'ge.globo.com': 'GE',
      'oglobo.globo.com': 'O Globo',
      'globo.com': 'Globo',
      'uol.com.br': 'UOL',
      'www.uol.com.br': 'UOL',
      'cnn.com': 'CNN',
      'cnnbrasil.com.br': 'CNN Brasil',
      'bbc.com': 'BBC',
      'bbc.co.uk': 'BBC',
      'reuters.com': 'Reuters',
      'agenciabrasil.ebc.com.br': 'Agência Brasil'
    };
    if (nomesConhecidos[host]) return nomesConhecidos[host];
    const partes = host.split('.');
    const nome = partes.length > 2 ? partes[partes.length - 3] : partes[0];
    return nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : 'Portal de notícias';
  } catch (e) {
    return noticia.fonte || 'Fonte não informada';
  }
}

function abrirPreviaNoticia(noticia) {
  const modal = el('modal-noticia');
  if (!modal) return;

  const titulo = el('modal-noticia-titulo');
  const categoria = el('modal-noticia-categoria');
  const fonte = el('modal-noticia-fonte');
  const data = el('modal-noticia-data');
  const resumo = el('modal-noticia-resumo');
  const link = el('modal-noticia-link');
  const url = urlNoticiaSegura(noticia.link);

  titulo.textContent = noticia.titulo || 'Notícia';
  categoria.textContent = noticia.categoria || 'Atualidades';
  categoria.style.backgroundColor = /^#[0-9a-f]{3,8}$/i.test(noticia.cor || '') ? noticia.cor : '#f4741f';
  fonte.textContent = nomeFonteNoticia(noticia, url);
  resumo.textContent = noticia.descricao || 'Acesse a fonte original para conferir todos os detalhes desta notícia.';

  const timestamp = noticia.data ? new Date(noticia.data).getTime() : NaN;
  data.textContent = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Data não informada';

  if (url && new URL(url).origin !== window.location.origin) {
    link.href = url;
    link.hidden = false;
  } else {
    link.removeAttribute('href');
    link.hidden = true;
  }
  abrirModal('modal-noticia');
}

function renderizarCardsDeNoticias(noticias, container) {
  container.replaceChildren();

  noticias.forEach(noticia => {
    const urlFonte = urlNoticiaSegura(noticia.link);
    const nomeFonte = nomeFonteNoticia(noticia, urlFonte);
    const card = document.createElement('article');
    card.className = 'news-card-item news-card-clickable';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver prévia: ${noticia.titulo || 'Notícia'}`);

    const tag = document.createElement('span');
    tag.className = 'news-tag';
    tag.textContent = noticia.categoria || 'Atualidades';
    tag.style.backgroundColor = /^#[0-9a-f]{3,8}$/i.test(noticia.cor || '') ? noticia.cor : '#f4741f';

    const titulo = document.createElement('h4');
    titulo.textContent = noticia.titulo || 'Notícia';
    const descricao = document.createElement('p');
    descricao.textContent = noticia.descricao || 'Clique para conferir os detalhes na fonte original.';
    const fonte = document.createElement('span');
    fonte.className = 'news-source';
    const icone = document.createElement('i');
    icone.className = 'fas fa-newspaper';
    icone.setAttribute('aria-hidden', 'true');
    const dataFormatada = Number.isFinite(noticia.data) && noticia.data > 0
      ? new Date(noticia.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      : '';
    fonte.append(icone, document.createTextNode(` ${nomeFonte}${dataFormatada ? ` · ${dataFormatada}` : ''} · Ver prévia`));

    card.append(tag, titulo, descricao, fonte);
    card.addEventListener('click', () => abrirPreviaNoticia(noticia));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        abrirPreviaNoticia(noticia);
      }
    });
    container.appendChild(card);
  });
}

// Permite fechar o modal de notícia com Esc, sem interferir nos demais modais.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && el('modal-noticia')?.classList.contains('active')) {
    fecharModal('modal-noticia');
  }
});

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
  inicializarVisaoSemanal();
  carregarNoticiasRSS(); 
  setTimeout(verificarExibicaoPwaMobile, 1500); // Exibe o card PWA no mobile após 1.5s
  if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play', togglePlay); navigator.mediaSession.setActionHandler('pause', togglePlay); }
});