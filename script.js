// --- VARIÁVEIS GLOBAIS DO PLAYER CUSTOMIZADO ---
const audio = document.getElementById('audioElement');
const playIcon = document.getElementById('playPauseIcon');
const volumeControl = document.getElementById('volumeControl');
const muteIcon = document.getElementById('muteIcon');
const coverImg = document.getElementById('playerCover');
let isPlaying = false;

// 0. REGISTRA O SERVICE WORKER PARA O PWA FUNCIONAR
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registrado com sucesso!', reg.scope))
      .catch((err) => console.log('Falha ao registrar Service Worker:', err));
  });
}

// SETUP INICIAL DO VOLUME
if(audio && volumeControl) {
  audio.volume = volumeControl.value / 100;
}

// --- FUNÇÕES DO PLAYER DE ÁUDIO ---
function togglePlay() {
  if (audio.paused) {
    playIcon.className = "fas fa-spinner";
    audio.load();
    
    audio.play().then(() => {
      isPlaying = true;
      playIcon.className = "fas fa-pause";
      coverImg.classList.add('playing');
    }).catch(error => {
      console.error("Erro ao reproduzir:", error);
      playIcon.className = "fas fa-play";
      alert("Não foi possível iniciar o áudio. Verifique sua conexão e tente novamente.");
    });
  } else {
    audio.pause();
    isPlaying = false;
    playIcon.className = "fas fa-play";
    coverImg.classList.remove('playing');
  }
}

// Controle de Volume via Barra de Ajuste
if(volumeControl) {
  volumeControl.addEventListener('input', (e) => {
    const vol = e.target.value / 100;
    audio.volume = vol;
    atualizarIconeVolume(vol);
  });
}

// Muta ou Desmuta o áudio ao clicar no ícone do alto-falante
function toggleMute() {
  if (audio.volume > 0) {
    audio.dataset.lastVol = audio.volume;
    audio.volume = 0;
    volumeControl.value = 0;
    atualizarIconeVolume(0);
  } else {
    const lastVol = audio.dataset.lastVol || 0.8;
    audio.volume = lastVol;
    volumeControl.value = lastVol * 100;
    atualizarIconeVolume(lastVol);
  }
}

function atualizarIconeVolume(vol) {
  if (vol === 0) {
    muteIcon.className = "fas fa-volume-mute volume-icon";
  } else if (vol < 0.5) {
    muteIcon.className = "fas fa-volume-down volume-icon";
  } else {
    muteIcon.className = "fas fa-volume-up volume-icon";
  }
}

// Configura os botões da tela de bloqueio do celular (MediaSession API)
function updateMediaSession(title, artist, artworkUrl) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: 'Radiação.Net',
      artwork: [
        { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        { src: artworkUrl, sizes: '192x192', type: 'image/png' }
      ]
    });
  }
}

// 1. ANIMAÇÃO DE PARCEIROS
function inicializarParceiros() {
  const track = document.getElementById('partnersTrack');
  const slider = document.getElementById('partnersSlider');
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

// 2. CONTROLE DE ABAS (TABS)
function abrirAba(evento, idAba) {
  let conteudos = document.getElementsByClassName("tab-pane");
  for (let i = 0; i < conteudos.length; i++) {
    conteudos[i].classList.remove("active");
  }
  
  let botoes = document.getElementsByClassName("tab-btn");
  for (let i = 0; i < botoes.length; i++) {
    botoes[i].classList.remove("active");
  }
  
  document.getElementById(idAba).classList.add("active");
  evento.currentTarget.classList.add("active");
}

// 3. CONTROLE DE MODAIS (Com fechamento fluido)
function abrirModal(idModal) {
  document.getElementById(idModal).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModal(idModal) {
  const modal = document.getElementById(idModal);
  modal.classList.add('closing');
  setTimeout(() => {
    modal.classList.remove('active');
    modal.classList.remove('closing');
    document.body.style.overflow = 'auto';
  }, 350);
}

function fecharModalFora(event, idModal) {
  if (event.target.id === idModal) {
    fecharModal(idModal);
  }
}

// 4. FUNÇÃO DE COMPARTILHAMENTO NATIVO
function compartilharSite() {
  if (navigator.share) {
    navigator.share({
      title: 'Radiação.Net',
      text: 'Estou ouvindo a Radiação.Net - A web rádio de todas as tribos! Ouça também:',
      url: window.location.href
    }).catch((error) => console.log('Erro ao compartilhar:', error));
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado! Agora é só colar e enviar para seus amigos.');
  }
}

// 5. ATUALIZAR INFORMAÇÕES DA RÁDIO (COM EXTRAÇÃO DE VARIÁVEIS REAIS)
async function atualizarNowPlaying() {
  try {
    const response = await fetch('https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json');
    const data = await response.json();

    const isLive = data.live.is_live; 
    const streamer = data.live.streamer_name; 
    
    // Captura exata das variáveis sugeridas
    const songTitle = data.now_playing.song.title || "Título Desconhecido";
    const songArtist = data.now_playing.song.artist || "Artista Desconhecido";
    const songAlbum = data.now_playing.song.album || "";
    const coverUrl = data.now_playing.song.art || 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png';

    const playerWrapper = document.getElementById('customPlayerWrapper');
    const btnRequest = document.getElementById('btnRequestLive');
    const line1 = document.getElementById('playerLine1');
    const line2 = document.getElementById('playerLine2');
    const line3 = document.getElementById('playerLine3');

    // Atualiza a arte
    document.getElementById('playerCover').src = coverUrl;

    // Limpa efeitos antigos da equipe
    document.querySelectorAll('.member-info').forEach(info => {
       const avatar = info.parentElement.querySelector('.thumb-avatar');
       if(avatar) avatar.classList.remove('live-avatar-pulse');
    });

    // Injeção de variáveis nas Linhas 1 e 2
    line1.innerText = songTitle;
    line2.innerText = songArtist;

    if (isLive) {
      // MODO AO VIVO
      playerWrapper.classList.add('is-live');
      document.getElementById('playerLiveBadge').style.display = 'flex';
      btnRequest.style.display = 'flex';
      
      // Na linha 3, destacamos o Locutor se estiver ao vivo
      line3.innerText = streamer ? `🎙️ Locutor: ${streamer}` : "🎙️️ Ao Vivo";
      line3.style.color = '#FF4C4C';
      line3.style.display = 'block';
      
      updateMediaSession(songTitle, streamer || 'Radiação.Net', coverUrl);

      // Efeito no painel da equipe
      if (streamer) {
         const streamerNameLower = streamer.toLowerCase();
         document.querySelectorAll('.member-info').forEach(info => {
            const memberName = info.querySelector('.member-name').innerText.toLowerCase();
            const firstName = memberName.split(' ')[0]; 
            if (streamerNameLower.includes(firstName)) {
               info.parentElement.querySelector('.thumb-avatar').classList.add('live-avatar-pulse');
            }
         });
      }
    } else {
      // MODO AUTO-DJ
      playerWrapper.classList.remove('is-live');
      document.getElementById('playerLiveBadge').style.display = 'none';
      btnRequest.style.display = 'none';

      // Mostra o álbum se existir, senão esconde a linha
      if (songAlbum) {
         line3.innerText = `💿 ${songAlbum}`;
         line3.style.color = '#bbbbbb';
         line3.style.display = 'block';
      } else {
         line3.style.display = 'none';
      }

      updateMediaSession(songTitle, songArtist, coverUrl);
    }
  } catch (error) {
    console.error("Erro ao buscar dados da rádio:", error);
  }
}

// 6. LÓGICA DO BOTÃO "INSTALAR APP" (ANDROID + IOS DETECT)
const btnInstall = document.getElementById('btnInstall');
let eventoInstalacao;

// Regex simples para detectar iOS (iPhone, iPad, iPod)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (isIOS) {
  // Se for iOS e o site NÃO estiver rodando já instalado (standalone)
  if (!window.navigator.standalone) {
    btnInstall.classList.add('visible-install');
    btnInstall.addEventListener('click', () => {
      abrirModal('modal-ios');
    });
  }
} else {
  // Lógica padrão para Android (prompt nativo do Google)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacao = e;
    btnInstall.classList.add('visible-install');
  });

  btnInstall.addEventListener('click', async () => {
    if (eventoInstalacao) {
      eventoInstalacao.prompt();
      const { outcome } = await eventoInstalacao.userChoice;
      if (outcome === 'accepted') {
        btnInstall.classList.remove('visible-install');
      }
      eventoInstalacao = null;
    }
  });
}

// 7. FUNÇÃO DE ENVIO DE PEDIDO PARA O TELEGRAM
async function enviarPedido(event) {
  event.preventDefault();
  
  const btn = document.getElementById('btn-enviar-pedido');
  const nome = document.getElementById('pedido-nome').value;
  const musica = document.getElementById('pedido-musica').value;
  const recado = document.getElementById('pedido-recado').value;
  
  btn.disabled = true;
  btn.innerText = 'Enviando... ⏳';

  const token = '8813122083:AAGkUT3zqsV44pvv2gd3S83xPhIEHgHVlzQ';
  const chatId = '-1004448651469';
  
  let textoMsg = `🎵 *NOVO PEDIDO MUSICAL!* 🎵\n\n👤 *Ouvinte:* ${nome}\n🎧 *Música:* ${musica}`;
  if (recado.trim() !== '') {
     textoMsg += `\n💬 *Recado:* ${recado}`;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textoMsg,
        parse_mode: 'Markdown'
      })
    });
    
    if (response.ok) {
      btn.innerText = 'Pedido Enviado! ✅';
      
      setTimeout(() => {
        fecharModal('modal-pedido');
        document.getElementById('form-pedido').reset();
        btn.disabled = false;
        btn.innerText = 'Enviar Pedido 🚀';
      }, 2000);
    } else {
      throw new Error('Falha na API do Telegram');
    }
  } catch (error) {
    console.error('Erro ao enviar pedido:', error);
    btn.innerText = 'Erro ao enviar ❌';
    
    setTimeout(() => {
      btn.disabled = false;
      btn.innerText = 'Enviar Pedido 🚀';
    }, 3000);
  }
}

// INICIALIZA TUDO QUANDO A PÁGINA CARREGA
document.addEventListener('DOMContentLoaded', () => {
  inicializarParceiros();
  atualizarNowPlaying();
  setInterval(atualizarNowPlaying, 10000); 

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
  }
});