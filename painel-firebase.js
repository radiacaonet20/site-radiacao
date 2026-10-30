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
const pedidosRef = ref(db, "pedidos");
const historicoRef = ref(db, "historico_pedidos");
const enqueteRef = ref(db, "enquete_atual");

const $ = (id) => document.getElementById(id);
const telaLogin = $("tela-login");
const telaDashboard = $("tela-dashboard");
const formLogin = $("form-login");
const msgErro = $("msg-erro");
const btnEntrar = $("btn-entrar");
const container = $("container-pedidos");
const btnAlertas = $("btn-alertas");
const containerEnquete = $("enquete-container");
const busca = $("busca-pedidos");
const contador = $("contador-pedidos");
const contadorAba = $("tab-pendentes");
const abas = [...document.querySelectorAll(".queue-tab")];

const notificationSound = new Audio("https://actions.google.com/sounds/v1/ui/bubble_pop.ogg");
let alertasAtivados = false;
let cargaInicial = true;
let quantidadePedidosAnterior = 0;
let pedidosAtuais = {};
let historicoAtual = {};
let visualizacao = "pendentes";
let piscando = false;
let intervaloPiscar = null;

function habilitarAlertas() {
  if (alertasAtivados) return;
  notificationSound.play().then(() => {
    notificationSound.pause();
    notificationSound.currentTime = 0;
  }).catch(() => {});
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  alertasAtivados = true;
  if (btnAlertas) {
    btnAlertas.classList.add("active");
    btnAlertas.innerHTML = '<i class="fas fa-bell"></i><span>Alertas On</span>';
  }
}
window.addEventListener("click", habilitarAlertas, { once: true });
btnAlertas?.addEventListener("click", habilitarAlertas);

function notificarAba() {
  if (piscando) return;
  piscando = true;
  let alternar = false;
  intervaloPiscar = setInterval(() => {
    document.title = alternar ? "🔔 NOVO PEDIDO!" : "Painel do Locutor";
    alternar = !alternar;
  }, 1000);
  setTimeout(() => {
    clearInterval(intervaloPiscar);
    document.title = "Painel do Locutor - Radiação.Net";
    piscando = false;
  }, 15000);
}
window.addEventListener("focus", () => {
  if (piscando) {
    clearInterval(intervaloPiscar);
    document.title = "Painel do Locutor - Radiação.Net";
    piscando = false;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    telaLogin.style.display = "none";
    telaDashboard.style.display = "flex";
    iniciarLeituraPedidos();
    iniciarLeituraHistorico();
    iniciarControleEnquete();
  } else {
    telaLogin.style.display = "flex";
    telaDashboard.style.display = "none";
  }
});

formLogin?.addEventListener("submit", (e) => {
  e.preventDefault();
  habilitarAlertas();
  const email = $("login-email").value.trim();
  const senha = $("login-senha").value;
  btnEntrar.disabled = true;
  btnEntrar.textContent = "Verificando...";
  msgErro.style.display = "none";
  signInWithEmailAndPassword(auth, email, senha)
    .catch((error) => {
      console.error("Falha no login:", error);
      msgErro.style.display = "block";
    })
    .finally(() => {
      btnEntrar.disabled = false;
      btnEntrar.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Entrar no painel';
    });
});
$("btn-logout")?.addEventListener("click", () => signOut(auth).catch(console.error));

function definirVisualizacao(view) {
  visualizacao = view;
  abas.forEach((aba) => {
    const ativa = aba.dataset.view === view;
    aba.classList.toggle("active", ativa);
    aba.setAttribute("aria-pressed", String(ativa));
  });
  renderizarPedidos();
}
abas.forEach((aba) => aba.addEventListener("click", () => definirVisualizacao(aba.dataset.view)));
busca?.addEventListener("input", renderizarPedidos);

function atualizarContadores() {
  const total = Object.keys(pedidosAtuais).length;
  if (contador) contador.textContent = String(total);
  if (contadorAba) contadorAba.textContent = String(total);
}

function formatarHora(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor;
  try { return new Date(valor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function criarElemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined && texto !== null) el.textContent = String(texto);
  return el;
}

function renderizarPedidos() {
  if (!container) return;
  container.replaceChildren();
  const termo = (busca?.value || "").trim().toLocaleLowerCase("pt-BR");
  const fonte = visualizacao === "pendentes" ? pedidosAtuais : historicoAtual;
  const itens = Object.entries(fonte || {}).filter(([id, p]) => {
    const texto = `${p?.musica || ""} ${p?.nome || ""} ${p?.recado || ""}`.toLocaleLowerCase("pt-BR");
    return texto.includes(termo);
  }).reverse();

  if (!itens.length) {
    const vazio = criarElemento("div", "empty-state");
    vazio.append(
      criarElemento("i", visualizacao === "pendentes" ? "fas fa-inbox" : "fas fa-box-archive"),
      criarElemento("strong", "", visualizacao === "pendentes" ? "Nenhum pedido na fila." : "Nenhum pedido no histórico."),
      criarElemento("span", "", visualizacao === "pendentes" ? "Os novos pedidos dos ouvintes aparecerão aqui." : "Os pedidos atendidos serão guardados aqui.")
    );
    container.appendChild(vazio);
    return;
  }

  itens.forEach(([id, p]) => {
    const row = criarElemento("article", "pedido-row");
    const left = criarElemento("div", "pedido-left");
    const dot = criarElemento("span", "status-dot");
    const info = criarElemento("div", "pedido-info");
    info.append(
      criarElemento("div", "pedido-musica", p?.musica || "Pedido sem título")
    );
    const autor = criarElemento("div", "pedido-autor");
    autor.append(document.createTextNode("Pedida por "));
    autor.append(criarElemento("span", "", p?.nome || "Ouvinte"));
    info.append(autor);

    if (p?.recado && String(p.recado).trim()) {
      info.append(criarElemento("div", "pedido-recado", `“${p.recado}”`));
    }
    left.append(dot, info);

    const right = criarElemento("div", "pedido-right");
    right.append(criarElemento("div", "pedido-hora", formatarHora(p?.data_hora || p?.atendido_em)));
    if (visualizacao === "pendentes") {
      const concluir = criarElemento("button", "btn-concluir");
      concluir.type = "button";
      concluir.dataset.id = id;
      concluir.title = "Marcar como tocado e enviar ao histórico";
      concluir.setAttribute("aria-label", "Marcar como tocado");
      concluir.innerHTML = '<i class="fas fa-check"></i>';
      concluir.addEventListener("click", () => marcarComoTocado(id, concluir));
      right.append(concluir);
    } else {
      const selo = criarElemento("span", "history-label", "ATENDIDO");
      right.append(selo);
    }
    row.append(left, right);
    container.appendChild(row);
  });
}

async function marcarComoTocado(id, botao) {
  const pedido = pedidosAtuais[id];
  if (!pedido || botao.disabled) return;
  botao.disabled = true;
  botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  const agora = Date.now();
  const registroHistorico = { ...pedido, atendido_em: agora };

  // A movimentação é atômica: grava no histórico e remove da fila na mesma atualização.
  const alteracoes = {
    [`historico_pedidos/${id}`]: registroHistorico,
    [`pedidos/${id}`]: null
  };

  // Preserva o recado independentemente da música por pelo menos 24 horas.
  if (pedido.recado && String(pedido.recado).trim()) {
    alteracoes[`recados_player/${id}`] = {
      nome: pedido.nome || "Ouvinte",
      recado: String(pedido.recado),
      data_envio: pedido.timestamp || pedido.criado_em || agora,
      expira_em: (pedido.timestamp || pedido.criado_em || agora) + 86400000
    };
  }

  try {
    await update(ref(db), alteracoes);
  } catch (error) {
    console.error("Não foi possível transferir o pedido:", error);
    alert("Não foi possível marcar o pedido como tocado. Verifique sua conexão e as regras de acesso do Firebase.");
    botao.disabled = false;
    botao.innerHTML = '<i class="fas fa-check"></i>';
  }
}

function iniciarLeituraPedidos() {
  onValue(pedidosRef, (snapshot) => {
    const dados = snapshot.val() || {};
    const chaves = Object.keys(dados);
    const quantidadeAtual = chaves.length;

    if (!cargaInicial && quantidadeAtual > quantidadePedidosAnterior) {
      if (alertasAtivados) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => {});
      }
      notificarAba();
      if ("Notification" in window && Notification.permission === "granted") {
        const novo = chaves.map((id) => dados[id]).find((p) => !Object.values(pedidosAtuais).includes(p));
        const pedido = novo || dados[chaves[chaves.length - 1]];
        if (pedido) new Notification("Radiação.Net - Novo pedido!", {
          body: `${pedido.nome || "Ouvinte"} pediu: ${pedido.musica || "uma música"}`,
          icon: "https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png"
        });
      }
    }
    quantidadePedidosAnterior = quantidadeAtual;
    cargaInicial = false;
    pedidosAtuais = dados;
    atualizarContadores();
    renderizarPedidos();
  }, (error) => {
    console.error("Erro ao ler pedidos:", error);
    container.innerHTML = '<div class="empty-state"><strong>Não foi possível carregar os pedidos.</strong><span>Verifique a conexão e as permissões do Firebase.</span></div>';
  });
}

function iniciarLeituraHistorico() {
  onValue(historicoRef, (snapshot) => {
    historicoAtual = snapshot.val() || {};
    renderizarPedidos();
  }, (error) => {
    console.error("Erro ao ler histórico:", error);
    if (visualizacao === "historico") {
      container.innerHTML = '<div class="empty-state"><strong>Não foi possível carregar o histórico.</strong><span>Verifique as regras de leitura do Firebase para historico_pedidos.</span></div>';
    }
  });
}

window.criarEnquete = function () {
  const pergunta = $("enq-pergunta")?.value.trim();
  const op1 = $("enq-op1")?.value.trim();
  const op2 = $("enq-op2")?.value.trim();
  if (!pergunta || !op1 || !op2) {
    alert("Preencha a pergunta e as duas opções!");
    return;
  }
  set(enqueteRef, {
    ativa: true,
    pergunta,
    opcoes: { op1: { texto: op1, votos: 0 }, op2: { texto: op2, votos: 0 } }
  }).catch((error) => {
    console.error("Erro ao publicar enquete:", error);
    alert("Não foi possível publicar a enquete. Verifique as permissões do Firebase.");
  });
};

window.encerrarEnquete = function () {
  update(enqueteRef, { ativa: false }).catch((error) => {
    console.error("Erro ao encerrar enquete:", error);
    alert("Não foi possível encerrar a enquete.");
  });
};

function iniciarControleEnquete() {
  onValue(enqueteRef, (snapshot) => {
    const data = snapshot.val();
    if (data?.ativa && data.opcoes?.op1 && data.opcoes?.op2) {
      const votos1 = Number(data.opcoes.op1.votos || 0);
      const votos2 = Number(data.opcoes.op2.votos || 0);
      const total = votos1 + votos2;
      const perc1 = total ? Math.round(votos1 / total * 100) : 0;
      const perc2 = total ? Math.round(votos2 / total * 100) : 0;
      containerEnquete.innerHTML = `
        <div class="poll-live-state"><span class="dot green"></span> NO AR</div>
        <div class="poll-question"></div>
        <div class="stat-row"><div class="stat-labels"><span class="op1-label"></span><span>${perc1}% (${votos1})</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${perc1}%"></div></div></div>
        <div class="stat-row"><div class="stat-labels"><span class="op2-label"></span><span>${perc2}% (${votos2})</span></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${perc2}%"></div></div></div>
        <div class="poll-total">Total: ${total} votos</div>
        <button class="btn-danger" type="button" onclick="encerrarEnquete()"><i class="fas fa-stop"></i> Encerrar votação</button>`;
      containerEnquete.querySelector(".poll-question").textContent = data.pergunta || "";
      containerEnquete.querySelector(".op1-label").textContent = data.opcoes.op1.texto || "";
      containerEnquete.querySelector(".op2-label").textContent = data.opcoes.op2.texto || "";
    } else {
      containerEnquete.innerHTML = `
        <div class="enquete-form">
          <input type="text" id="enq-pergunta" class="input-flat" placeholder="Pergunta (Ex: Qual clássico fecha?)">
          <input type="text" id="enq-op1" class="input-flat" placeholder="Opção 1 (Ex: Iron Maiden)">
          <input type="text" id="enq-op2" class="input-flat" placeholder="Opção 2 (Ex: Metallica)">
          <button class="btn-primary" type="button" onclick="criarEnquete()">Colocar no Ar</button>
        </div>`;
    }
  });
}
