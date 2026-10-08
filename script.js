const audio = document.getElementById('audioElement');
const playIcon = document.getElementById('playPauseIcon');
const volumeControl = document.getElementById('volumeControl');
const muteIcon = document.getElementById('muteIcon');
const coverImg = document.getElementById('playerCover');
let isPlaying = false;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW falhou:', err)); });
}

if (audio && volumeControl) { audio.volume = volumeControl.value / 100; }

function togglePlay() {
  if (audio.paused) {
    playIcon.className = "fas fa-spinner"; audio.load();
    audio.play().then(() => {
      isPlaying = true; playIcon.className = "fas fa-pause"; coverImg.classList.add('playing');
    }).catch(error => { console.error(error); playIcon.className = "fas fa-play"; alert("Verifique sua conexão e tente novamente."); });
  } else {
    audio.pause(); isPlaying = false; playIcon.className = "fas fa-play"; coverImg.classList.remove('playing');
  }
}

if (volumeControl) {
  volumeControl.addEventListener('input', (e) => { const vol = e.target.value / 100; audio.volume = vol; atualizarIconeVolume(vol); });
}

function toggleMute() {
  if (audio.volume > 0) {
    audio.dataset.lastVol = audio.volume; audio.volume = 0; volumeControl.value = 0; atualizarIconeVolume(0);
  } else { const lastVol = audio.dataset.lastVol || 0.8; audio.volume = lastVol; volumeControl.value = lastVol * 100; atualizarIconeVolume(lastVol); }
}

function atualizarIconeVolume(vol) {
  if (vol === 0) muteIcon.className = "fas fa-volume-mute volume-icon";
  else if (vol < 0.5) muteIcon.className = "fas fa-volume-down volume-icon";
  else muteIcon.className = "fas fa-volume-up volume-icon";
}

function updateMediaSession(title, artist, artworkUrl) {
  if ('mediaSession' in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: artist, album: 'Radiação.Net', artwork: [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }] }); }
}

function inicializarParceiros() {
  const track = document.getElementById('partnersTrack'); const slider = document.getElementById('partnersSlider');
  const cards = track.querySelectorAll('.partner-card'); const limiteAnimacao = window.innerWidth <= 480 ? 3 : 5;
  if (cards.length >= limiteAnimacao) {
    slider.classList.add('is-animated'); track.classList.add('is-animated');
    cards.forEach(card => { const clone = card.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); track.appendChild(clone); });
  }
}

function abrirAba(evento, idAba) {
  let conteudos = document.getElementsByClassName("tab-pane"); for (let i = 0; i < conteudos.length; i++) conteudos[i].classList.remove("active");
  let botoes = document.getElementsByClassName("tab-btn"); for (let i = 0; i < botoes.length; i++) botoes[i].classList.remove("active");
  document.getElementById(idAba).classList.add("active"); evento.currentTarget.classList.add("active");
}

function abrirModal(idModal) { document.getElementById(idModal).classList.add('active'); document.body.style.overflow = 'hidden'; }
function fecharModal(idModal) {
  const modal = document.getElementById(idModal); modal.classList.add('closing');
  setTimeout(() => { modal.classList.remove('active'); modal.classList.remove('closing'); document.body.style.overflow = 'auto'; }, 350);
}
function fecharModalFora(event, idModal) { if (event.target.id === idModal) fecharModal(idModal); }

function compartilharSite() {
  const currentSong = document.getElementById('playerLine1').innerText;
  const currentArtist = document.getElementById('playerLine2').innerText;
  const textoFormatado = currentSong !== "Carregando..." ? `Estou ouvindo ${currentSong} de ${currentArtist} na Radiação.Net! Vem ouvir junto:` : 'Estou ouvindo a Radiação.Net - A web rádio de todas as tribos! Ouça também:';
  if (navigator.share) {
    navigator.share({ title: 'Radiação.Net', text: textoFormatado, url: window.location.href }).catch((e) => console.log(e));
  } else { navigator.clipboard.writeText(window.location.href); alert('Link copiado!'); }
}

// --- SUAS IMAGENS DE FUNDO CUSTOMIZADAS ---
const imagensFundo = {
  "default": "url('https://painel.radiacao.net.br/static/uploads/radiacaonet/background.1779332336.webp')",
  "fred": "url('https://i.postimg.cc/pLR9yzgz/Cool-Reggae-Wallpaper.jpg')",
  "alessandro": "url('https://i.postimg.cc/1XmTfWrs/futuristic-city-5120x2880-15887.jpg')",
  "rafa": "url('https://i.postimg.cc/nVST4cHB/photo-1540747913346-19e32dc3e97e.jpg')",
  "bigt": "url('https://i.postimg.cc/0N1VzW9Z/Anime-Boy-Gamer-Wallpaper.jpg')",
  "alex": "url('https://i.postimg.cc/Kvg7tPpv/Electronic-Music-Wallpaper-Sf.jpg')"
};

async function atualizarNowPlaying() {
  try {
    const response = await fetch('https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json?_=' + new Date().getTime(), { cache: 'no-store' });
    const data = await response.json();

    const isLive = data.live.is_live;
    const streamer = data.live.streamer_name;

    const songTitle = data.now_playing.song.title || "Título Desconhecido";
    const songArtist = data.now_playing.song.artist || "Artista Desconhecido";
    const songAlbum = data.now_playing.song.album || "";
    const rawText = data.now_playing.song.text || "";
    const coverUrl = data.now_playing.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png';

    const playerWrapper = document.getElementById('customPlayerWrapper');
    const btnRequest = document.getElementById('btnRequestLive');
    const line1 = document.getElementById('playerLine1');
    const line2 = document.getElementById('playerLine2');
    const line3 = document.getElementById('playerLine3');

    document.getElementById('playerCover').src = coverUrl;

    // Atualiza Histórico
    const historyList = document.getElementById('lista-historico');
    if (data.song_history && data.song_history.length > 0) {
      historyList.innerHTML = '';
      data.song_history.slice(0, 5).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="item-left"><img src="${item.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png'}" class="thumb-img thumb-logo"><div class="member-info"><span class="member-name" style="font-size: 0.9rem;">${item.song.title}</span><span class="member-role" style="font-size: 0.75rem; color: #aaa;">${item.song.artist}</span></div></div>`;
        historyList.appendChild(li);
      });
    }

    // Limpa o pulso de todos os avatares antes de processar
    document.querySelectorAll('#lista-equipe .thumb-avatar').forEach(avatar => avatar.classList.remove('live-avatar-pulse'));

    let bgChaveAtiva = "default";

    if (isLive) {
      playerWrapper.classList.add('is-live');
      document.getElementById('playerLiveBadge').style.display = 'flex';
      btnRequest.style.display = 'flex';

      // --- FATIAMENTO INTELIGENTE DO TEXTO DO RADIOBOSS ---
      const partesTexto = rawText.split(' - ');
      let nomePrograma = "Programa ao Vivo";
      let nomeLocutor = streamer || "Locutor";
      let horarioPrograma = "";

      if (partesTexto.length >= 3) {
        nomePrograma = partesTexto[0].trim();
        nomeLocutor = partesTexto[1].trim();
        horarioPrograma = partesTexto[2].trim();
      } else if (partesTexto.length === 2) {
        nomePrograma = partesTexto[0].trim();
        nomeLocutor = partesTexto[1].trim();
      } else if (partesTexto.length === 1 && partesTexto[0] !== "") {
        nomePrograma = partesTexto[0].trim();
      }

      line1.innerText = nomePrograma;
      line2.innerText = `🎙️ ${nomeLocutor}`;

      if (horarioPrograma !== "") {
        line3.innerHTML = `<i class="far fa-clock"></i> ${horarioPrograma}`;
        line3.style.color = '#FF4C4C';
        line3.style.display = 'block';
      } else {
        line3.innerText = "🔴 Ao Vivo";
        line3.style.color = '#FF4C4C';
        line3.style.display = 'block';
      }

      updateMediaSession(nomePrograma, nomeLocutor, coverUrl);

      // --- NOVA LÓGICA BLINDADA DE BUSCA ---
      const locutorBuscaLower = nomeLocutor.toLowerCase();

      // Ativa o pulso do avatar APENAS na aba da equipe (evita bugs com as músicas do histórico)
      document.querySelectorAll('#lista-equipe .member-info').forEach(info => {
        const firstName = info.querySelector('.member-name').innerText.toLowerCase().split(' ')[0];
        if (locutorBuscaLower.includes(firstName)) {
          const avatar = info.parentElement.querySelector('.thumb-avatar');
          if (avatar) avatar.classList.add('live-avatar-pulse');
        }
      });

      // Encontra a imagem de fundo correspondente
      for (const chave in imagensFundo) {
        if (locutorBuscaLower.includes(chave)) {
          bgChaveAtiva = chave;
          break;
        }
      }

    } else {
      playerWrapper.classList.remove('is-live');
      document.getElementById('playerLiveBadge').style.display = 'none';
      btnRequest.style.display = 'none';

      line1.innerText = songTitle;
      line2.innerText = songArtist;

      if (songAlbum) {
        line3.innerText = `💿 ${songAlbum}`;
        line3.style.color = '#bbbbbb';
        line3.style.display = 'block';
      } else {
        line3.style.display = 'none';
      }

      updateMediaSession(songTitle, songArtist, coverUrl);
    }

    // Aplica a imagem de fundo de forma dupla e garantida
    if (document.body.dataset.bg !== bgChaveAtiva) {
      document.body.dataset.bg = bgChaveAtiva;
      document.documentElement.style.setProperty('--bg-imagem', imagensFundo[bgChaveAtiva]);
      document.body.style.backgroundImage = imagensFundo[bgChaveAtiva];
    }
  } catch (error) { console.error("Erro na rádio:", error); }
}

const btnInstall = document.getElementById('btnInstall');
let eventoInstalacao;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (btnInstall) {
  if (isIOS) {
    if (!window.navigator.standalone) {
      btnInstall.classList.add('visible-install');
      btnInstall.addEventListener('click', () => abrirModal('modal-ios'));
    }
  } else {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      eventoInstalacao = e;
      btnInstall.classList.add('visible-install');
    });

    btnInstall.addEventListener('click', async () => {
      if (!eventoInstalacao) return;
      eventoInstalacao.prompt();
      const { outcome } = await eventoInstalacao.userChoice;
      if (outcome === 'accepted') btnInstall.classList.remove('visible-install');
      eventoInstalacao = null;
    });

    window.addEventListener('appinstalled', () => {
      btnInstall.classList.remove('visible-install');
      eventoInstalacao = null;
    });
  }
}

async function enviarPedido(event) {
  event.preventDefault();
  const ultimoPedidoTimestamp = localStorage.getItem('radiacao_ultimo_pedido');
  if (ultimoPedidoTimestamp && (Date.now() - parseInt(ultimoPedidoTimestamp) < 3 * 60 * 1000)) { alert("⏳ O seu pedido já está na fila! Para evitar spam, aguarde alguns minutos para pedir outra música."); return; }

  const btn = document.getElementById('btn-enviar-pedido');
  const nome = document.getElementById('pedido-nome').value; const musica = document.getElementById('pedido-musica').value; const recado = document.getElementById('pedido-recado').value;
  btn.disabled = true; btn.innerText = 'Enviando... ⏳';

  try {
    const response = await fetch('https://radiacaonet-default-rtdb.firebaseio.com/pedidos.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome, musica: musica, recado: recado, data_hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }) });
    if (response.ok) {
      localStorage.setItem('radiacao_ultimo_pedido', Date.now().toString()); btn.innerText = 'Pedido Enviado! ✅';
      setTimeout(() => { fecharModal('modal-pedido'); document.getElementById('form-pedido').reset(); btn.disabled = false; btn.innerText = 'Enviar Pedido 🚀'; }, 2000);
    } else { throw new Error('Falha no Firebase'); }
  } catch (error) { console.error('Erro:', error); btn.innerText = 'Erro ao enviar ❌'; setTimeout(() => { btn.disabled = false; btn.innerText = 'Enviar Pedido 🚀'; }, 3000); }
}

function definirAbaDoDia() {
  const diasDaSemana = ['tab-dom', 'tab-seg', 'tab-ter', 'tab-qua', 'tab-qui', 'tab-sex', 'tab-sab'];
  const hoje = new Date().getDay();
  const idAbaHoje = diasDaSemana[hoje];

  let conteudos = document.getElementsByClassName("tab-pane");
  for (let i = 0; i < conteudos.length; i++) conteudos[i].classList.remove("active");

  let botoes = document.getElementsByClassName("tab-btn");
  for (let i = 0; i < botoes.length; i++) botoes[i].classList.remove("active");

  document.getElementById(idAbaHoje).classList.add("active");
  for (let i = 0; i < botoes.length; i++) {
    if (botoes[i].getAttribute("onclick").includes(idAbaHoje)) {
      botoes[i].classList.add("active");
      botoes[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      break;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarParceiros();
  atualizarNowPlaying();
  setInterval(atualizarNowPlaying, 5000);
  definirAbaDoDia();
  if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play', togglePlay); navigator.mediaSession.setActionHandler('pause', togglePlay); }
});