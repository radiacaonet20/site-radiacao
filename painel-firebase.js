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
const historicoRef = ref(db, 'historico_pedidos');
const enqueteRef = ref(db, 'enquete_atual');

const $ = (id) => document.getElementById(id);
const telaLogin = $('tela-login'), telaDashboard = $('tela-dashboard');
const formLogin = $('form-login'), msgErro = $('msg-erro'), btnEntrar = $('btn-entrar');
const container = $('container-pedidos'), btnAlertas = $('btn-alertas'), containerEnquete = $('enquete-container');
const notificationSound = new Audio('https://actions.google.com/sounds/v1/ui/bubble_pop.ogg');
let alertasAtivados = false, cargaInicial = true, idsAnteriores = new Set();
let pedidosAtuais = {}, historicoAtual = {}, visualizacao = 'pendentes';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function habilitarAlertas() {
  if (alertasAtivados) return;
  notificationSound.play().then(() => { notificationSound.pause(); notificationSound.currentTime = 0; }).catch(() => {});
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  alertasAtivados = true;
  btnAlertas.classList.add('active');
  btnAlertas.innerHTML = '<i class="fas fa-bell"></i> Alertas ligados';
}
window.addEventListener('click', habilitarAlertas, { once: true });
btnAlertas.addEventListener('click', habilitarAlertas);

function notificarAba() {
  if (document.hidden) document.title = '🔔 Novo pedido · Radiação.Net';
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Radiação.Net · Novo pedido', { body: 'Um novo pedido musical chegou à fila.', icon: 'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png' });
  }
}
window.addEventListener('focus', () => { document.title = 'Painel do Locutor - Radiação.Net'; });

onAuthStateChanged(auth, user => {
  if (user) {
    telaLogin.style.display = 'none'; telaDashboard.style.display = 'flex';
    if (!window.__painelIniciado) {
      window.__painelIniciado = true;
      if (typeof atualizarInfoRadio === 'function') atualizarInfoRadio();
      iniciarLeituraPedidos(); iniciarControleEnquete();
    }
  } else { telaLogin.style.display = 'flex'; telaDashboard.style.display = 'none'; window.__painelIniciado = false; }
});

formLogin.addEventListener('submit', e => {
  e.preventDefault(); habilitarAlertas();
  btnEntrar.textContent = 'A verificar...'; msgErro.style.display = 'none';
  signInWithEmailAndPassword(auth, $('login-email').value, $('login-senha').value)
    .then(() => { btnEntrar.textContent = 'Autenticar'; })
    .catch(error => { console.error(error); btnEntrar.textContent = 'Autenticar'; msgErro.style.display = 'block'; });
});
$('btn-logout').addEventListener('click', () => signOut(auth).catch(console.error));

window.criarEnquete = function() {
  const pergunta = $('enq-pergunta').value.trim(), op1 = $('enq-op1').value.trim(), op2 = $('enq-op2').value.trim();
  if (!pergunta || !op1 || !op2) { alert('Preencha a pergunta e as duas opções!'); return; }
  set(enqueteRef, { ativa: true, pergunta, opcoes: { op1: { texto: op1, votos: 0 }, op2: { texto: op2, votos: 0 } } });
};
window.encerrarEnquete = () => update(enqueteRef, { ativa: false });

function iniciarControleEnquete() {
  onValue(enqueteRef, snapshot => {
    const data = snapshot.val();
    if (data?.ativa && data.opcoes?.op1 && data.opcoes?.op2) {
      const v1 = Number(data.opcoes.op1.votos || 0), v2 = Number(data.opcoes.op2.votos || 0), total = v1 + v2;
      const p1 = total ? Math.round(v1 / total * 100) : 0, p2 = total ? Math.round(v2 / total * 100) : 0;
      containerEnquete.innerHTML = `<div class="poll-live"><span class="dot green"></span> ENQUETE NO AR</div><div class="poll-question">${escapeHtml(data.pergunta)}</div>
        <div class="stat-row"><div class="stat-labels"><span>${escapeHtml(data.opcoes.op1.texto)}</span><span>${p1}% · ${v1}</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${p1}%"></div></div></div>
        <div class="stat-row"><div class="stat-labels"><span>${escapeHtml(data.opcoes.op2.texto)}</span><span>${p2}% · ${v2}</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${p2}%"></div></div></div>
        <div class="poll-total">Total de ${total} votos</div><button class="btn-danger" id="btn-encerrar-enquete"><i class="fas fa-stop"></i> Encerrar votação</button>`;
      $('btn-encerrar-enquete').addEventListener('click', window.encerrarEnquete);
    } else {
      containerEnquete.innerHTML = `<div class="enquete-form"><input type="text" id="enq-pergunta" class="input-flat" placeholder="Pergunta da enquete"><input type="text" id="enq-op1" class="input-flat" placeholder="Opção 1"><input type="text" id="enq-op2" class="input-flat" placeholder="Opção 2"><button class="btn-primary" id="btn-criar-enquete"><i class="fas fa-play"></i> Colocar no ar</button></div>`;
      $('btn-criar-enquete').addEventListener('click', window.criarEnquete);
    }
  });
}

function iniciarLeituraPedidos() {
  onValue(pedidosRef, snapshot => {
    pedidosAtuais = snapshot.val() || {};
    const ids = new Set(Object.keys(pedidosAtuais));
    if (!cargaInicial) {
      const novos = [...ids].filter(id => !idsAnteriores.has(id));
      if (novos.length) {
        if (alertasAtivados) { notificationSound.currentTime = 0; notificationSound.play().catch(() => {}); }
        notificarAba();
      }
    }
    idsAnteriores = ids; cargaInicial = false;
    atualizarLista();
  });
  onValue(historicoRef, snapshot => { historicoAtual = snapshot.val() || {}; atualizarLista(); });
}

function atualizarLista() {
  const pendentes = Object.keys(pedidosAtuais).length;
  $('contador-pedidos').textContent = `${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'}`;
  $('tab-pendentes').textContent = pendentes;
  const busca = ($('busca-pedidos')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const dados = visualizacao === 'pendentes' ? pedidosAtuais : historicoAtual;
  const itens = Object.entries(dados).sort((a,b) => Number((b[1] || {}).timestamp || 0) - Number((a[1] || {}).timestamp || 0));
  const filtrados = itens.filter(([,p]) => `${p.musica || ''} ${p.nome || ''} ${p.recado || ''}`.toLocaleLowerCase('pt-BR').includes(busca));
  container.innerHTML = '';
  if (!filtrados.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas ${visualizacao === 'pendentes' ? 'fa-inbox' : 'fa-clock-rotate-left'}"></i><strong>${visualizacao === 'pendentes' ? 'Tudo em dia por aqui!' : 'Ainda não há pedidos atendidos.'}</strong><span>${visualizacao === 'pendentes' ? 'Os novos pedidos aparecerão nesta fila.' : 'Quando uma música for marcada como tocada, ficará registrada aqui.'}</span></div>`;
    return;
  }
  filtrados.forEach(([id,p]) => {
    const row = document.createElement('article'); row.className = 'pedido-row';
    const left = document.createElement('div'); left.className = 'pedido-left';
    const dot = document.createElement('span'); dot.className = 'status-dot';
    const info = document.createElement('div'); info.className = 'pedido-info';
    const musica = document.createElement('div'); musica.className = 'pedido-musica'; musica.textContent = p.musica || 'Música não informada';
    const autor = document.createElement('div'); autor.className = 'pedido-autor'; autor.append('Pedido por '); const nome = document.createElement('strong'); nome.textContent = p.nome || 'Ouvinte'; autor.append(nome);
    info.append(musica, autor);
    if (p.recado?.trim()) { const recado = document.createElement('div'); recado.className = 'pedido-recado'; recado.textContent = `“${p.recado}”`; info.append(recado); }
    left.append(dot, info);
    const right = document.createElement('div'); right.className = 'pedido-right';
    const hora = document.createElement('span'); hora.className = 'pedido-hora'; hora.textContent = p.data_hora || (p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR') : ''); right.append(hora);
    if (visualizacao === 'pendentes') {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-concluir'; btn.title = 'Marcar como tocado'; btn.innerHTML = '<i class="fas fa-check"></i><span>Tocada</span>';
      btn.addEventListener('click', () => concluirPedido(id, p, btn)); right.append(btn);
    } else {
      const tag = document.createElement('span'); tag.className = 'history-tag'; tag.innerHTML = '<i class="fas fa-check-circle"></i> Atendido'; right.append(tag);
    }
    row.append(left, right); container.append(row);
  });
}

async function concluirPedido(id, pedido, button) {
  if (button.disabled) return;
  button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  const agora = Date.now();
  const recebidoEm = Number(pedido.timestamp || pedido.createdAt || agora);
  const recadoValido = Boolean(pedido.recado && pedido.recado.trim());
  const atualizacao = {};
  atualizacao[`pedidos/${id}`] = null;
  atualizacao[`historico_pedidos/${id}`] = { ...pedido, atendidoEm: agora, status: 'atendido' };
  if (recadoValido) {
    atualizacao[`recados_player/${id}`] = {
      nome: pedido.nome || 'Ouvinte', recado: pedido.recado.trim(), timestamp: recebidoEm,
      expiraEm: recebidoEm + 24 * 60 * 60 * 1000
    };
  }
  try { await update(ref(db), atualizacao); }
  catch (error) { console.error('Não foi possível concluir o pedido:', error); alert('Não foi possível mover o pedido para o histórico. Verifique sua conexão e tente novamente.'); button.disabled = false; button.innerHTML = '<i class="fas fa-check"></i><span>Tocada</span>'; }
}

$('busca-pedidos').addEventListener('input', atualizarLista);
document.querySelectorAll('.queue-tab').forEach(btn => btn.addEventListener('click', () => {
  visualizacao = btn.dataset.view;
  document.querySelectorAll('.queue-tab').forEach(tab => tab.classList.toggle('active', tab === btn));
  atualizarLista();
}));
