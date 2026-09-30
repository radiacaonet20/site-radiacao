// 0. REGISTRA O SERVICE WORKER PARA O PWA FUNCIONAR
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registrado com sucesso!', reg.scope))
      .catch((err) => console.log('Falha ao registrar Service Worker:', err));
  });
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

// 3. CONTROLE DE MODAIS
function abrirModal(idModal) {
  document.getElementById(idModal).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModal(idModal) {
  document.getElementById(idModal).classList.remove('active');
  document.body.style.overflow = 'auto';
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

// 5. ATUALIZAR ESTÚDIO AO VIVO E PREENCHER O CARD INTELIGENTE
async function atualizarNowPlaying() {
  try {
    const response = await fetch('https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json');
    const data = await response.json();

    const songText = data.now_playing.song.text; 
    const isLive = data.live.is_live; 
    const streamer = data.live.streamer_name; 
    const liveStudioCard = document.getElementById('liveStudioCard');

    // Limpa efeitos antigos dos membros da equipe
    document.querySelectorAll('.member-info').forEach(info => {
       const avatar = info.parentElement.querySelector('.thumb-avatar');
       if(avatar) avatar.classList.remove('live-avatar-pulse');
    });

    if (isLive) {
      // Preenche as informações no card inteligente
      document.getElementById('liveProgramName').innerText = data.live.show_name || "Programa ao Vivo";
      document.getElementById('liveStreamerName').innerText = `Locutor: ${streamer || 'Ao Vivo'}`;
      document.getElementById('liveSongName').innerText = `Tocando: ${songText || 'Música ao vivo'}`;
      
      // Se houver arte do artista ou capa do programa na API, atualiza a foto esquerda
      if (data.now_playing.song.art) {
        document.getElementById('liveProgramImg').src = data.now_playing.song.art;
      }

      // Exibe o card animado do estúdio
      liveStudioCard.style.display = 'flex'; 
      
      // Procura quem é o locutor na lista e acende a foto dele no modal de equipe
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
      // Se estiver no AutoDJ, esconde o card de estúdio com botão de pedido
      liveStudioCard.style.display = 'none';
    }
  } catch (error) {
    console.error("Erro ao buscar dados da rádio:", error);
    document.getElementById('liveStudioCard').style.display = 'none';
  }
}

// 6. LÓGICA DO BOTÃO "INSTALAR APP" (CONDICIONAL)
let eventoInstalacao;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacao = e;
  document.getElementById('btnInstall').classList.add('visible-install');
});

document.getElementById('btnInstall').addEventListener('click', async () => {
  if (eventoInstalacao) {
    eventoInstalacao.prompt();
    const { outcome } = await eventoInstalacao.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('btnInstall').classList.remove('visible-install');
    }
    eventoInstalacao = null;
  }
});

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
});