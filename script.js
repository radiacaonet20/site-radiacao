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

// 5. ATUALIZAR MÚSICA E DESTACAR LOCUTOR AO VIVO
async function atualizarNowPlaying() {
  try {
    const response = await fetch('https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json');
    const data = await response.json();

    const songText = data.now_playing.song.text; 
    const isLive = data.live.is_live; 
    const streamer = data.live.streamer_name; 
    const nowPlayingBar = document.getElementById('nowPlayingBar');

    // Limpa efeitos antigos dos membros da equipe
    document.querySelectorAll('.member-info').forEach(info => {
       const avatar = info.parentElement.querySelector('.thumb-avatar');
       if(avatar) avatar.classList.remove('live-avatar-pulse');
       
       const roleSpan = info.querySelector('.member-role');
       if(roleSpan && roleSpan.dataset.originalText) {
          roleSpan.innerHTML = roleSpan.dataset.originalText;
       } else if (roleSpan) {
          roleSpan.dataset.originalText = roleSpan.innerHTML;
       }
    });

    if (isLive) {
      let displayText = '🔴 Ao Vivo';
      if (streamer) displayText += `: ${streamer}`;
      if (songText) displayText += ` | ${songText}`;
      
      document.getElementById('currentSong').innerText = displayText;
      nowPlayingBar.style.display = 'flex'; 
      
      // Procura quem é o locutor na lista e acende a foto dele
      if (streamer) {
         const streamerNameLower = streamer.toLowerCase();
         document.querySelectorAll('.member-info').forEach(info => {
            const memberName = info.querySelector('.member-name').innerText.toLowerCase();
            const firstName = memberName.split(' ')[0]; 
            
            if (streamerNameLower.includes(firstName)) {
               info.parentElement.querySelector('.thumb-avatar').classList.add('live-avatar-pulse');
               const roleSpan = info.querySelector('.member-role');
               roleSpan.innerHTML = `${roleSpan.dataset.originalText} <span class="badge-live">🔴 NO AR</span>`;
            }
         });
      }
    } else {
      nowPlayingBar.style.display = 'none';
    }
  } catch (error) {
    console.error("Erro ao buscar dados da rádio:", error);
    document.getElementById('nowPlayingBar').style.display = 'none';
  }
}

// 6. LÓGICA DO BOTÃO "INSTALAR APP"
let eventoInstalacao;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacao = e;
  document.getElementById('btnInstall').style.display = 'inline-block';
});

document.getElementById('btnInstall').addEventListener('click', async () => {
  if (eventoInstalacao) {
    eventoInstalacao.prompt();
    const { outcome } = await eventoInstalacao.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('btnInstall').style.display = 'none';
    }
    eventoInstalacao = null;
  }
});

// 7. FUNÇÃO DE ENVIO DE PEDIDO PARA O TELEGRAM
async function enviarPedido(event) {
  // Impede a página de recarregar
  event.preventDefault();
  
  const btn = document.getElementById('btn-enviar-pedido');
  const nome = document.getElementById('pedido-nome').value;
  const musica = document.getElementById('pedido-musica').value;
  const recado = document.getElementById('pedido-recado').value;
  
  // Desativa o botão e muda o texto para dar feedback ao usuário
  btn.disabled = true;
  btn.innerText = 'Enviando... ⏳';

  // Suas credenciais da API
  const token = '8813122083:AAGkUT3zqsV44pvv2gd3S83xPhIEHgHVlzQ';
  const chatId = '-1004448651469';
  
  // Monta a mensagem formatada
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
      
      // Espera 2 segundos, fecha a janela e limpa o formulário para o próximo uso
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
    
    // Volta o botão ao normal após 3 segundos em caso de erro
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