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

onValue(contadorRef, (snapshot) => {
  const total = snapshot.val() || 0;
  const contador = document.getElementById('contador-likes');
  if (contador) contador.innerText = formatarNumero(total);
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

  criarCoracaoLocal();
  push(reacoesRef, { timestamp: agora });

  runTransaction(contadorRef, (votosAtuais) => {
    return (votosAtuais || 0) + 1;
  });
};

function criarCoracaoLocal() {
  const container = document.getElementById('hearts-container');
  if (!container) return;
  const heart = document.createElement('div');
  heart.innerHTML = '<i class="fas fa-heart"></i>';
  heart.className = 'heart-fly';
  heart.style.left = (Math.random() * 60) + '%';
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 2500);
}

let primeiraCarga = true;
onChildAdded(query(reacoesRef, limitToLast(1)), (snapshot) => {
  if (primeiraCarga) { primeiraCarga = false; return; }
  if (Date.now() - snapshot.val().timestamp < 5000) { criarCoracaoLocal(); }
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