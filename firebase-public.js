import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
      import { getDatabase, ref, push, onChildAdded, query, limitToLast, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

      const firebaseConfig = {
        apiKey: "AIzaSyDLCYfYApZZt4ycMmr-f4Xq002ZBalYmdU",
        authDomain: "radiacaonet.firebaseapp.com",
        databaseURL: "https://radiacaonet-default-rtdb.firebaseio.com",
        projectId: "radiacaonet",
        storageBucket: "radiacaonet.firebasestorage.app",
        messagingSenderId: "1078838815128",
        appId: "1:1078838815128:web:20de30c5ad574a59dd23ed"
      };

      const app = initializeApp(firebaseConfig);
      const db = getDatabase(app);

      // --- 1. SISTEMA DE REAÇÕES (CHUVA DE CORAÇÕES E CONTADOR) ---
      const reacoesRef = ref(db, 'reacoes');
      const contadorRef = ref(db, 'estatisticas/total_likes'); // Novo banco de dados para os números
      let ultimoLike = 0;

      // Escuta o total de likes em tempo real e atualiza a tela
      onValue(contadorRef, (snapshot) => {
        const total = snapshot.val() || 0;
        document.getElementById('contador-likes').innerText = formatarNumero(total);
      });

      // Transforma 1500 em 1.5k
      function formatarNumero(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
      }

      window.enviarReacao = function () {
        const agora = Date.now();
        if (agora - ultimoLike < 1000) return; // Trava de 1 segundo
        ultimoLike = agora;

        criarCoracaoLocal();

        // 1. Dispara a animação visual para todos
        push(reacoesRef, { timestamp: agora });

        // 2. Salva e soma +1 no contador de forma segura (Anti-bug de cliques simultâneos)
        runTransaction(contadorRef, (votosAtuais) => {
          return (votosAtuais || 0) + 1;
        });
      };

      function criarCoracaoLocal() {
        const heart = document.createElement('div');
        heart.innerHTML = '<i class="fas fa-heart"></i>';
        heart.className = 'heart-fly';
        heart.style.left = (Math.random() * 60) + '%';
        document.getElementById('hearts-container').appendChild(heart);
        setTimeout(() => heart.remove(), 2500);
      }

      let primeiraCarga = true;
      onChildAdded(query(reacoesRef, limitToLast(1)), (snapshot) => {
        if (primeiraCarga) { primeiraCarga = false; return; }
        if (Date.now() - snapshot.val().timestamp < 5000) { criarCoracaoLocal(); }
      });

      // --- 2. SISTEMA DE ENQUETES (OUVINTE) ---
      const enqueteRef = ref(db, 'enquete_atual');
      const btnFlutuante = document.getElementById('btn-enquete-flutuante');
      const divOpcoes = document.getElementById('enquete-opcoes');
      const divResultados = document.getElementById('enquete-resultados');
      let enqueteAtualData = null;

      // Escuta mudanças na enquete do painel em tempo real
      onValue(enqueteRef, (snapshot) => {
        const data = snapshot.val();
        enqueteAtualData = data;

        if (data && data.ativa) {
          // ENQUETE NO AR
          btnFlutuante.style.display = 'flex';
          document.getElementById('enquete-pergunta-texto').innerText = data.pergunta;

          // Verifica se o ouvinte já votou (gravado no navegador)
          const chaveVoto = 'voto_' + encodeURIComponent(data.pergunta);
          const votoSalvo = localStorage.getItem(chaveVoto);

          if (votoSalvo) {
            // JÁ VOTOU: Esconde os botões e mostra as barras
            divOpcoes.style.display = 'none';
            divResultados.style.display = 'flex';

            const v1 = data.opcoes.op1.votos || 0;
            const v2 = data.opcoes.op2.votos || 0;
            const total = v1 + v2;
            const p1 = total === 0 ? 0 : Math.round((v1 / total) * 100);
            const p2 = total === 0 ? 0 : Math.round((v2 / total) * 100);

            document.getElementById('lbl-res-op1').innerText = data.opcoes.op1.texto;
            document.getElementById('perc-res-op1').innerText = p1 + '% (' + v1 + ' votos)';
            document.getElementById('bar-res-op1').style.width = p1 + '%';

            document.getElementById('lbl-res-op2').innerText = data.opcoes.op2.texto;
            document.getElementById('perc-res-op2').innerText = p2 + '% (' + v2 + ' votos)';
            document.getElementById('bar-res-op2').style.width = p2 + '%';

          } else {
            // NÃO VOTOU: Mostra as opções
            divOpcoes.style.display = 'flex';
            divResultados.style.display = 'none';
            document.getElementById('btn-voto-op1').innerText = data.opcoes.op1.texto;
            document.getElementById('btn-voto-op2').innerText = data.opcoes.op2.texto;
          }
        } else {
          // ENQUETE FECHADA
          btnFlutuante.style.display = 'none';
          const modalEnq = document.getElementById('modal-enquete');
          if (modalEnq.classList.contains('active')) {
            fecharModal('modal-enquete');
          }
        }
      });

      // Função acionada quando o ouvinte clica num botão de opção
      window.votarEnquete = function (opcao) {
        if (!enqueteAtualData || !enqueteAtualData.ativa) return;

        // Marca no navegador que o ouvinte votou
        const chaveVoto = 'voto_' + encodeURIComponent(enqueteAtualData.pergunta);
        localStorage.setItem(chaveVoto, 'true');

        // Incrementa o voto no Firebase com segurança (Transação)
        const votoRef = ref(db, `enquete_atual/opcoes/${opcao}/votos`);
        runTransaction(votoRef, (votosAtuais) => {
          return (votosAtuais || 0) + 1;
        });

        // Não precisa atualizar a tela manualmente, o "onValue" lá em cima
        // vai perceber a mudança do Firebase e desenhar as barras sozinho!
      };
