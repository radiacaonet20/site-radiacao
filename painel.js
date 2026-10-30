let deferredPromptPainel;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPromptPainel = e; document.getElementById('btn-instalar-painel').style.display = 'flex';
      });
      document.getElementById('btn-instalar-painel').addEventListener('click', async () => {
        if (deferredPromptPainel) {
          deferredPromptPainel.prompt();
          const { outcome } = await deferredPromptPainel.userChoice;
          if (outcome === 'accepted') { document.getElementById('btn-instalar-painel').style.display = 'none'; }
          deferredPromptPainel = null;
        }
      });

      async function atualizarInfoRadio() {
        try {
          const urlBusca = 'https://painel.radiacao.net.br/api/nowplaying_static/radiacaonet.json?_=' + new Date().getTime();
          const response = await fetch(urlBusca, { cache: 'no-store' });
          const data = await response.json();
          
          document.getElementById('painelLine1').innerText = data.now_playing.song.title || "Desconhecido";
          document.getElementById('painelLine2').innerText = data.now_playing.song.artist || "Desconhecido";
          document.getElementById('painelListeners').innerText = data.listeners.current || 0;
          
          const artUrl = data.now_playing.song.art;
          const cover = document.getElementById('painelTrackCover');
          const isLive = Boolean(data.live && data.live.is_live);
          const hasArt = Boolean(artUrl && artUrl.trim());
          if (cover) {
            cover.src = hasArt ? artUrl : '';
            cover.hidden = !hasArt;
            cover.alt = isLive ? 'Imagem do programa ao vivo' : 'Capa da música atual';
          }
          const trackIcon = document.getElementById('painelTrackIcon');
          // A imagem identifica o programa ao vivo; sem imagem, mantém o ícone como fallback.
          if (trackIcon) trackIcon.hidden = hasArt;
          const textStatus = document.getElementById('textStatus');
          const dotStatus = document.getElementById('dotStatus');

          if (isLive) {
            textStatus.innerText = "AO VIVO"; dotStatus.className = "dot green";
          } else {
            textStatus.innerText = "Auto DJ"; dotStatus.className = "dot red";
          }
        } catch (error) { console.error("Erro na rádio:", error); }
      }
      atualizarInfoRadio();
      setInterval(atualizarInfoRadio, 5000);
