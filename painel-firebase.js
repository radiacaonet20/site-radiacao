import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
      import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
      import { getDatabase, ref, onValue, remove, set, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
      const auth = getAuth(app);
      const db = getDatabase(app);
      const pedidosRef = ref(db, 'pedidos');
      const enqueteRef = ref(db, 'enquete_atual');

      const telaLogin = document.getElementById('tela-login');
      const telaDashboard = document.getElementById('tela-dashboard');
      const formLogin = document.getElementById('form-login');
      const msgErro = document.getElementById('msg-erro');
      const btnEntrar = document.getElementById('btn-entrar');
      const container = document.getElementById('container-pedidos');
      const btnAlertas = document.getElementById('btn-alertas');
      const containerEnquete = document.getElementById('enquete-container');

      const notificationSound = new Audio('https://actions.google.com/sounds/v1/ui/bubble_pop.ogg');
      let cargaInicial = true; let quantidadePedidosAnterior = 0; let intervaloPiscar; let isBlinking = false; let alertasAtivados = false;

      function habilitarAlertas() {
        if (alertasAtivados) return;
        notificationSound.play().then(() => { notificationSound.pause(); notificationSound.currentTime = 0; }).catch(err => console.log("Áudio bloqueado", err));
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") { Notification.requestPermission(); }
        alertasAtivados = true;
        btnAlertas.classList.add("active"); 
        btnAlertas.innerHTML = '<i class="fas fa-bell"></i> Alertas On';
      }

      window.addEventListener('click', habilitarAlertas, { once: true });
      btnAlertas.addEventListener('click', habilitarAlertas);

      function notificarAba() {
        if(isBlinking) return;
        isBlinking = true; let piscar = false;
        intervaloPiscar = setInterval(() => { document.title = piscar ? "🔔 NOVO PEDIDO!" : "Painel do Locutor"; piscar = !piscar; }, 1000);
        setTimeout(() => { clearInterval(intervaloPiscar); document.title = "Painel do Locutor - Radiação.Net"; isBlinking = false; }, 15000);
      }

      window.addEventListener('focus', () => {
        if (isBlinking) { clearInterval(intervaloPiscar); document.title = "Painel do Locutor - Radiação.Net"; isBlinking = false; }
      });

      onAuthStateChanged(auth, (user) => {
        if (user) { 
          telaLogin.style.display = 'none'; telaDashboard.style.display = 'flex'; 
          atualizarInfoRadio(); iniciarLeituraPedidos(); iniciarControleEnquete(); 
        } 
        else { telaLogin.style.display = 'flex'; telaDashboard.style.display = 'none'; }
      });

      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        habilitarAlertas();
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        btnEntrar.innerText = "A verificar... ⏳"; msgErro.style.display = 'none';

        signInWithEmailAndPassword(auth, email, senha)
          .then(() => { btnEntrar.innerText = 'Autenticar'; })
          .catch((error) => { console.error(error); btnEntrar.innerText = 'Autenticar'; msgErro.style.display = 'block'; });
      });

      document.getElementById('btn-logout').addEventListener('click', () => { signOut(auth).catch((error) => console.error("Erro", error)); });

      window.criarEnquete = function() {
        const pergunta = document.getElementById('enq-pergunta').value;
        const op1 = document.getElementById('enq-op1').value;
        const op2 = document.getElementById('enq-op2').value;

        if(!pergunta || !op1 || !op2) { alert("Preencha a pergunta e as duas opções!"); return; }

        set(enqueteRef, {
            ativa: true, pergunta: pergunta,
            opcoes: { op1: { texto: op1, votos: 0 }, op2: { texto: op2, votos: 0 } }
        });
      };

      window.encerrarEnquete = function() { update(enqueteRef, { ativa: false }); };

      function iniciarControleEnquete() {
          onValue(enqueteRef, (snapshot) => {
              const data = snapshot.val();
              if (data && data.ativa) {
                  const votos1 = data.opcoes.op1.votos || 0;
                  const votos2 = data.opcoes.op2.votos || 0;
                  const totalVotos = votos1 + votos2;
                  const perc1 = totalVotos === 0 ? 0 : Math.round((votos1 / totalVotos) * 100);
                  const perc2 = totalVotos === 0 ? 0 : Math.round((votos2 / totalVotos) * 100);

                  containerEnquete.innerHTML = `
                    <div style="margin-bottom: 15px; color: var(--accent-green); font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;"><div class="dot green"></div> NO AR</div>
                    <div style="font-weight: 600; font-size: 1rem; margin-bottom: 15px; line-height: 1.3; color: var(--text-main);">${data.pergunta}</div>
                    <div class="stat-row"><div class="stat-labels"><span>${data.opcoes.op1.texto}</span><span>${perc1}% (${votos1})</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${perc1}%;"></div></div></div>
                    <div class="stat-row"><div class="stat-labels"><span>${data.opcoes.op2.texto}</span><span>${perc2}% (${votos2})</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${perc2}%;"></div></div></div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 5px;">Total: ${totalVotos} votos</div>
                    <button class="btn-danger" onclick="encerrarEnquete()"><i class="fas fa-stop"></i> Encerrar Votação</button>
                  `;
              } else {
                  containerEnquete.innerHTML = `
                    <div class="enquete-form">
                      <input type="text" id="enq-pergunta" class="input-flat" placeholder="Pergunta (Ex: Qual clássico fecha?)">
                      <input type="text" id="enq-op1" class="input-flat" placeholder="Opção 1 (Ex: Iron Maiden)">
                      <input type="text" id="enq-op2" class="input-flat" placeholder="Opção 2 (Ex: Metallica)">
                      <button class="btn-primary" onclick="criarEnquete()">Colocar no Ar</button>
                    </div>
                  `;
              }
          });
      }

      function iniciarLeituraPedidos() {
        onValue(pedidosRef, (snapshot) => {
          container.innerHTML = ''; 
          const dados = snapshot.val();

          if (dados) {
            const chaves = Object.keys(dados).reverse();
            const quantidadeAtual = chaves.length;

            if (!cargaInicial && quantidadeAtual > quantidadePedidosAnterior) {
               if(alertasAtivados) { notificationSound.currentTime = 0; notificationSound.play().catch(e => console.log("Áudio block", e)); }
               notificarAba();
               if ("Notification" in window && Notification.permission === "granted") {
                 const pedidoNovo = dados[chaves[0]];
                 new Notification("Radiação.Net - Novo Pedido!", { body: `${pedidoNovo.nome} pediu: ${pedidoNovo.musica}`, icon: "https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png" });
               }
            }
            
            quantidadePedidosAnterior = quantidadeAtual; cargaInicial = false;

            chaves.forEach(chave => {
              const p = dados[chave];
              const row = document.createElement('div');
              row.className = 'pedido-row';
              
              let recadoHtml = p.recado && p.recado.trim() !== '' ? `<div class="pedido-recado">"${p.recado}"</div>` : '';
              
              let html = `
                <div class="pedido-left">
                  <div class="status-dot"></div>
                  <div class="pedido-info">
                    <div class="pedido-musica">${p.musica}</div>
                    <div class="pedido-autor">Pedida por <span>${p.nome}</span></div>
                    ${recadoHtml}
                  </div>
                </div>
                <div class="pedido-right">
                  <div class="pedido-hora">${p.data_hora || ''}</div>
                  <button class="btn-concluir" data-id="${chave}" title="Marcar como tocado"><i class="fas fa-check"></i></button>
                </div>
              `;
              
              row.innerHTML = html; 
              container.appendChild(row);
            });

            document.querySelectorAll('.btn-concluir').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id; 
                e.currentTarget.closest('.pedido-row').style.opacity = '0';
                setTimeout(() => remove(ref(db, `pedidos/${id}`)), 300); 
                quantidadePedidosAnterior--; 
              });
            });
          } else {
            quantidadePedidosAnterior = 0; cargaInicial = false;
            container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox fa-2x" style="margin-bottom: 10px; color: #3f3f46;"></i><br>Nenhum pedido na fila.</div>`;
          }
        });
      }
