const audio = document.getElementById('audioElement');
const playIcon = document.getElementById('playPauseIcon');
const volumeControl = document.getElementById('volumeControl');
const muteIcon = document.getElementById('muteIcon');
const coverImg = document.getElementById('playerCover');
let isPlaying = false;

// 0. PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW falhou:', err)); });
}

if(audio && volumeControl) { audio.volume = volumeControl.value / 100; }

function togglePlay() {
  if (audio.paused) {
    playIcon.className = "fas fa-spinner";
    audio.load();
    audio.play().then(() => {
      isPlaying = true; playIcon.className = "fas fa-pause"; coverImg.classList.add('playing');
    }).catch(error => {
      console.error(error); playIcon.className = "fas fa-play"; alert("Verifique sua conexão e tente novamente.");
    });
  } else {
    audio.pause(); isPlaying = false; playIcon.className = "fas fa-play"; coverImg.classList.remove('playing');
  }
}

if(volumeControl) {
  volumeControl.addEventListener('input', (e) => {
    const vol = e.target.value / 100; audio.volume = vol; atualizarIconeVolume(vol);
  });
}

function toggleMute() {
  if (audio.volume > 0) {
    audio.dataset.lastVol = audio.volume; audio.volume = 0; volumeControl.value = 0; atualizarIconeVolume(0);
  } else {
    const lastVol = audio.dataset.lastVol || 0.8; audio.volume = lastVol; volumeControl.value = lastVol * 100; atualizarIconeVolume(lastVol);
  }
}

function atualizarIconeVolume(vol) {
  if (vol === 0) { muteIcon.className = "fas fa-volume-mute volume-icon"; } 
  else if (vol < 0.5) { muteIcon.className = "fas fa-volume-down volume-icon"; } 
  else { muteIcon.className = "fas fa-volume-up volume-icon"; }
}

function updateMediaSession(title, artist, artworkUrl) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: artist, album: 'Radiação.Net', artwork: [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }] });
  }
}

function inicializarParceiros() {
  const track = document.getElementById('partnersTrack');
  const slider = document.getElementById('partnersSlider');
  const cards = track.querySelectorAll('.partner-card');
  const limiteAnimacao = window.innerWidth <= 480 ? 3 : 5;
  if (cards.length >= limiteAnimacao) {
    slider.classList.add('is-animated'); track.classList.add('is-animated');
    cards.forEach(card => { const clone = card.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); track.appendChild(clone); });
  }
}

function abrirAba(evento, idAba) {
  let conteudos = document.getElementsByClassName("tab-pane");
  for (let i = 0; i < conteudos.length; i++) conteudos[i].classList.remove("active");
  let botoes = document.getElementsByClassName("tab-btn");
  for (let i = 0; i < botoes.length; i++) botoes[i].classList.remove("active");
  document.getElementById(idAba).classList.add("active");
  evento.currentTarget.classList.add("active");
}

function abrirModal(idModal) { document.getElementById(idModal).classList.add('active'); document.body.style.overflow = 'hidden'; }
function fecharModal(idModal) {
  const modal = document.getElementById(idModal); modal.classList.add('closing');
  setTimeout(() => { modal.classList.remove('active'); modal.classList.remove('closing'); document.body.style.overflow = 'auto'; }, 350);
}
function fecharModalFora(event, idModal) { if (event.target.id === idModal) fecharModal(idModal); }

// --- COMPARTILHAMENTO INTELIGENTE (NOVA FEATURE) ---
function compartilharSite() {
  const currentSong = document.getElementById('playerLine1').innerText;
  const currentArtist = document.getElementById('playerLine2').innerText;
  const textoFormatado = currentSong !== "Carregando..." 
      ? `Estou ouvindo ${currentSong} de ${currentArtist} na Radiação.Net! Vem ouvir junto:` 
      : 'Estou ouvindo a Radiação.Net - A web rádio de todas as tribos! Ouça também:';

  if (navigator.share) {
    navigator.share({ title: 'Radiação.Net', text: textoFormatado, url: window.location.href })
      .catch((error) => console.log('Erro ao compartilhar:', error));
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado! Agora é só colar e enviar para seus amigos.');
  }
}

// --- DICIONÁRIO DE FUNDOS DINÂMICOS DA SUA EQUIPE (NOVA FEATURE) ---
const imagensFundo = {
  "default": "url('https://painel.radiacao.net.br/static/uploads/radiacaonet/background.1779332336.webp')",
  "fred": "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", // Reggae/Música
  "alessandro": "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", // Esporte/Estádio
  "rafa": "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", // Esporte
  "josiel": "url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", // Esporte
  "bigt": "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", // Geek/Games
  "alex": "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" 
};

async function atualizarNowPlaying() {
  try {
    const urlBusca = 'https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json?_=' + new Date().getTime();
    const response = await fetch(urlBusca, { cache: 'no-store' });
    const data = await response.json();

    const isLive = data.live.is_live; 
    const streamer = data.live.streamer_name; 
    const songTitle = data.now_playing.song.title || "Título Desconhecido";
    const songArtist = data.now_playing.song.artist || "Artista Desconhecido";
    const songAlbum = data.now_playing.song.album || "";
    const coverUrl = data.now_playing.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png';

    const playerWrapper = document.getElementById('customPlayerWrapper');
    const btnRequest = document.getElementById('btnRequestLive');
    const line1 = document.getElementById('playerLine1');
    const line2 = document.getElementById('playerLine2');
    const line3 = document.getElementById('playerLine3');

    document.getElementById('playerCover').src = coverUrl;
    line1.innerText = songTitle; line2.innerText = songArtist;

    // --- ATUALIZAÇÃO DO HISTÓRICO DE MÚSICAS (NOVA FEATURE) ---
    const historyList = document.getElementById('lista-historico');
    if(data.song_history && data.song_history.length > 0) {
      historyList.innerHTML = '';
      data.song_history.slice(0, 5).forEach(item => {
         const li = document.createElement('li');
         li.innerHTML = `
           <div class="item-left">
             <img src="${item.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png'}" class="thumb-img thumb-logo">
             <div class="member-info">
               <span class="member-name" style="font-size: 0.9rem;">${item.song.title}</span>
               <span class="member-role" style="font-size: 0.75rem; color: #aaa;">${item.song.artist}</span>
             </div>
           </div>`;
         historyList.appendChild(li);
      });
    }

    document.querySelectorAll('.member-info').forEach(info => {
       const avatar = info.parentElement.querySelector('.thumb-avatar');
       if(avatar) avatar.classList.remove('live-avatar-pulse');
    });

    // --- LÓGICA DO FUNDO DINÂMICO ---
    let bgChaveAtiva = "default";

    if (isLive) {
      playerWrapper.classList.add('is-live');
      document.getElementById('playerLiveBadge').style.display = 'flex';
      btnRequest.style.display = 'flex';
      line3.innerText = streamer ? `🎙️ Locutor: ${streamer}` : "🎙 Ao Vivo";
      line3.style.color = '#FF4C4C'; line3.style.display = 'block';
      updateMediaSession(songTitle, streamer || 'Radiação.Net', coverUrl);

      if (streamer) {
         const streamerNameLower = streamer.toLowerCase();
         // Identifica locutor na aba "Nossa Equipe"
         document.querySelectorAll('.member-info').forEach(info => {
            const memberName = info.querySelector('.member-name').innerText.toLowerCase();
            const firstName = memberName.split(' ')[0]; 
            if (streamerNameLower.includes(firstName)) {
               info.parentElement.querySelector('.thumb-avatar').classList.add('live-avatar-pulse');
            }
         });
         // Identifica fundo dinâmico
         for (const chave in imagensFundo) {
            if (streamerNameLower.includes(chave)) { bgChaveAtiva = chave; break; }
         }
      }
    } else {
      playerWrapper.classList.remove('is-live');
      document.getElementById('playerLiveBadge').style.display = 'none';
      btnRequest.style.display = 'none';
      if (songAlbum) { line3.innerText = `💿 ${songAlbum}`; line3.style.color = '#bbbbbb'; line3.style.display = 'block'; } else { line3.style.display = 'none'; }
      updateMediaSession(songTitle, songArtist, coverUrl);
    }

    // Aplica o papel de parede se houver mudança
    if (document.body.dataset.bg !== bgChaveAtiva) {
       document.body.dataset.bg = bgChaveAtiva;
       document.body.style.backgroundImage = imagensFundo[bgChaveAtiva];
    }

  } catch (error) { console.error("Erro na rádio:", error); }
}

const btnInstall = document.getElementById('btnInstall');
let eventoInstalacao;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isIOS) {
  if (!window.navigator.standalone) {
    btnInstall.classList.add('visible-install');
    btnInstall.addEventListener('click', () => { abrirModal('modal-ios'); });
  }
} else {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); eventoInstalacao = e; btnInstall.classList.add('visible-install');
  });
  btnInstall.addEventListener('click', async () => {
    if (eventoInstalacao) {
      eventoInstalacao.prompt();
      const { outcome } = await eventoInstalacao.userChoice;
      if (outcome === 'accepted') { btnInstall.classList.remove('visible-install'); }
      eventoInstalacao = null;
    }
  });
}

// --- SISTEMA ANTI-SPAM (NOVA FEATURE) ---
async function enviarPedido(event) {
  event.preventDefault();
  
  const ultimoPedidoTimestamp = localStorage.getItem('radiacao_ultimo_pedido');
  if (ultimoPedidoTimestamp) {
    const tempoDecorrido = Date.now() - parseInt(ultimoPedidoTimestamp);
    const tempoDeEspera = 3 * 60 * 1000; // Bloqueio de 3 minutos
    if (tempoDecorrido < tempoDeEspera) {
      alert("⏳ O seu pedido já está na fila! Para evitar spam, aguarde alguns minutos para pedir outra música.");
      return; 
    }
  }

  const btn = document.getElementById('btn-enviar-pedido');
  const nome = document.getElementById('pedido-nome').value;
  const musica = document.getElementById('pedido-musica').value;
  const recado = document.getElementById('pedido-recado').value;
  
  btn.disabled = true; btn.innerText = 'Enviando... ⏳';

  const firebaseUrl = 'https://radiacaonet-default-rtdb.firebaseio.com/pedidos.json';
  
  try {
    const response = await fetch(firebaseUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome, musica: musica, recado: recado, data_hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
    });
    
    if (response.ok) {
      localStorage.setItem('radiacao_ultimo_pedido', Date.now().toString());
      btn.innerText = 'Pedido Enviado! ✅';
      setTimeout(() => { fecharModal('modal-pedido'); document.getElementById('form-pedido').reset(); btn.disabled = false; btn.innerText = 'Enviar Pedido 🚀'; }, 2000);
    } else { throw new Error('Falha no Firebase'); }
  } catch (error) {
    console.error('Erro ao enviar pedido:', error);
    btn.innerText = 'Erro ao enviar ❌';
    setTimeout(() => { btn.disabled = false; btn.innerText = 'Enviar Pedido 🚀'; }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarParceiros();
  atualizarNowPlaying();
  setInterval(atualizarNowPlaying, 5000); 

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
  }
});