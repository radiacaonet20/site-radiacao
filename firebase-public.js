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

// --- MURAL DE RECADOS AO VIVO (LIVE FEED) ---
const pedidosRef = ref(db, 'pedidos');
const liveFeedText = document.getElementById('liveFeedText');

onValue(query(pedidosRef, limitToLast(5)), (snapshot) => {
  const dados = snapshot.val();
  if (dados) {
    const recadosAprovados = [];
    Object.values(dados).reverse().forEach(pedido => {
      if (pedido.recado && pedido.recado.trim() !== '') {
        recadosAprovados.push(`💬 ${pedido.nome} disse: "${pedido.recado}"`);
      } else {
        recadosAprovados.push(`🎵 ${pedido.nome} pediu a música: ${pedido.musica}`);
      }
    });
    liveFeedText.innerText = recadosAprovados.join('   ✦   ');
  } else {
    if (liveFeedText) {
      liveFeedText.innerText = "Radiação.Net - A rádio de todas as tribos! Peça sua música e participe da programação!";
    }
  }
});

// --- SISTEMA DE REAÇÕES (CHUVA DE CORAÇÕES E CONTADOR) ---
const reacoesRef = ref(db, 'reacoes');
const contadorRef = ref(db, 'estatisticas/total_likes'); 
let ultimoLike = 0;
let minhaReacaoKey = null;

onValue(contadorRef, (snapshot) => {
  const total = snapshot.val() || 0;
  const contador = document.getElementById('contador-likes');
  if (contador) {
    contador.innerText = formatarNumero(total);
    const botao = document.getElementById('btnLike') || document.querySelector('.sp-btn-heart');
    if (botao) {
      botao.classList.remove('counter-bump');
      void botao.offsetWidth;
      botao.classList.add('counter-bump');
      setTimeout(() => botao.classList.remove('counter-bump'), 450);
    }
  }
});

function formatarNumero(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

window.enviarReacao = function () {
  const agora = Date.now();
  if (agora - ultimoLike < 1000) return;
  ultimoLike = agora;

  animarBotaoCurtida();
  criarCoracaoLocal(true);
  const novaReacao = push(reacoesRef, { timestamp: agora });
  minhaReacaoKey = novaReacao.key;

  runTransaction(contadorRef, (votosAtuais) => {
    return (votosAtuais || 0) + 1;
  });
};

function animarBotaoCurtida() {
  const botao = document.getElementById('btnLike') || document.querySelector('.sp-btn-heart');
  if (!botao) return;
  botao.classList.remove('is-liked', 'counter-bump');
  void botao.offsetWidth;
  botao.classList.add('is-liked', 'counter-bump');
  setTimeout(() => botao.classList.remove('is-liked', 'counter-bump'), 650);
}

function criarCoracaoLocal(comParticulas = true) {
  const container = document.getElementById('hearts-container');
  if (!container) return;

  // Um burst central, grande e visível — como pequenos fogos de artifício.
  const burst = document.createElement('div');
  burst.className = 'like-firework-burst';
  burst.setAttribute('aria-hidden', 'true');

  const principal = document.createElement('i');
  principal.className = 'fas fa-heart firework-heart firework-heart-main';
  principal.textContent = '';
  burst.appendChild(principal);

  // Camada complementar: corações maiores sobem suavemente após a explosão.
  for (let i = 0; i < 5; i++) {
    const rising = document.createElement('i');
    rising.className = 'fas fa-heart firework-heart heart-rise';
    rising.style.setProperty('--rise-x', `${Math.round(Math.random() * 170 - 85)}px`);
    rising.style.setProperty('--rise-delay', `${180 + i * 95}ms`);
    rising.style.setProperty('--rise-size', `${24 + Math.random() * 18}px`);
    rising.style.color = Math.random() > 0.45 ? '#ff647b' : '#ff9a43';
    burst.appendChild(rising);
  }

  const heartCount = 12;
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('i');
    heart.className = 'fas fa-heart firework-heart firework-heart-piece';

    const angle = (Math.PI * 2 * i / heartCount) + (Math.random() * 0.28);
    const distance = 78 + Math.random() * 92;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - (20 + Math.random() * 35);

    heart.style.setProperty('--burst-x', `${x}px`);
    heart.style.setProperty('--burst-y', `${y}px`);
    heart.style.setProperty('--burst-rotate', `${Math.round(Math.random() * 70 - 35)}deg`);
    heart.style.setProperty('--burst-size', `${19 + Math.random() * 18}px`);
    heart.style.setProperty('--burst-delay', `${Math.random() * 90}ms`);
    heart.style.color = Math.random() > 0.45 ? '#ff536b' : '#ff8a35';
    burst.appendChild(heart);
  }

  if (comParticulas) {
    for (let i = 0; i < 22; i++) {
      const spark = document.createElement('span');
      spark.className = 'firework-spark';

      const angle = Math.random() * Math.PI * 2;
      const distance = 55 + Math.random() * 145;
      spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--spark-delay', `${Math.random() * 120}ms`);
      spark.style.setProperty('--spark-size', `${3 + Math.random() * 5}px`);
      spark.style.setProperty('--spark-color', Math.random() > 0.5 ? '#ffb347' : '#ff536b');
      burst.appendChild(spark);
    }
  }

  container.appendChild(burst);
  setTimeout(() => burst.remove(), 1450);
}

let primeiraCarga = true;
onChildAdded(query(reacoesRef, limitToLast(1)), (snapshot) => {
  if (primeiraCarga) { primeiraCarga = false; return; }
  if (snapshot.key === minhaReacaoKey) {
    minhaReacaoKey = null;
    return;
  }
  const reacao = snapshot.val();
  if (reacao && Date.now() - reacao.timestamp < 5000) criarCoracaoLocal(true);
});

// --- SISTEMA DE ENQUETES (OUVINTE) ---
const enqueteRef = ref(db, 'enquete_atual');
const btnFlutuante = document.getElementById('btn-enquete-flutuante');
const divOpcoes = document.getElementById('enquete-opcoes');
const divResultados = document.getElementById('enquete-resultados');
let enqueteAtualData = null;

onValue(enqueteRef, (snapshot) => {
  const data = snapshot.val();
  enqueteAtualData = data;

  if (data && data.ativa) {
    if (btnFlutuante) btnFlutuante.style.display = 'flex';
    const textoPergunta = document.getElementById('enquete-pergunta-texto');
    if (textoPergunta) textoPergunta.innerText = data.pergunta;

    const chaveVoto = 'voto_' + encodeURIComponent(data.pergunta);
    const votoSalvo = localStorage.getItem(chaveVoto);

    if (votoSalvo) {
      if (divOpcoes) divOpcoes.style.display = 'none';
      if (divResultados) divResultados.style.display = 'flex';

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
      if (divOpcoes) divOpcoes.style.display = 'flex';
      if (divResultados) divResultados.style.display = 'none';
      document.getElementById('btn-voto-op1').innerText = data.opcoes.op1.texto;
      document.getElementById('btn-voto-op2').innerText = data.opcoes.op2.texto;
    }
  } else {
    if (btnFlutuante) btnFlutuante.style.display = 'none';
    const modalEnq = document.getElementById('modal-enquete');
    if (modalEnq && modalEnq.classList.contains('active')) {
      fecharModal('modal-enquete');
    }
  }
});

window.votarEnquete = function (opcao) {
  if (!enqueteAtualData || !enqueteAtualData.ativa) return;
  const chaveVoto = 'voto_' + encodeURIComponent(enqueteAtualData.pergunta);
  localStorage.setItem(chaveVoto, 'true');

  const votoRef = ref(db, `enquete_atual/opcoes/${opcao}/votos`);
  runTransaction(votoRef, (votosAtuais) => {
    return (votosAtuais || 0) + 1;
  });
};