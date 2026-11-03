import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, get, onValue, remove, set, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
const contadorTopo = $("contador-pedidos-topo");
const abas = [...document.querySelectorAll(".queue-tab")];

const notificationSound = new Audio("https://actions.google.com/sounds/v1/ui/bubble_pop.ogg");
let alertasAtivados = false;
let cargaInicial = true;
let quantidadePedidosAnterior = 0;
let pedidosAtuais = {};
let historicoAtual = {};
let visualizacao = "pendentes";
let idsNovosParaAnimar = new Set();
let toastTimeout = null;
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
    document.title = alternar ? "🔔 NOVO PEDIDO!" : "Painel Administrativo";
    alternar = !alternar;
  }, 1000);
  setTimeout(() => {
    clearInterval(intervaloPiscar);
    document.title = "Painel Administrativo - Radiação.Net";
    piscando = false;
  }, 15000);
}
window.addEventListener("focus", () => {
  if (piscando) {
    clearInterval(intervaloPiscar);
    document.title = "Painel Administrativo - Radiação.Net";
    piscando = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.body.classList.remove("modo-administracao");
    if (adminWorkspace) adminWorkspace.hidden = true;
    telaLogin.style.display = "flex";
    telaDashboard.style.display = "none";
    return;
  }

  try {
    const perfilSnapshot = await get(ref(db, `usuarios/${user.uid}`));
    const perfil = perfilSnapshot.val();
    const autorizado = perfil && perfil.ativo === true && ["admin", "locutor"].includes(perfil.perfil);

    if (!autorizado) {
      if (msgErro) {
        msgErro.textContent = "Conta sem autorização ou desativada. Procure um administrador.";
        msgErro.style.display = "block";
      }
      await signOut(auth);
      return;
    }

    telaLogin.style.display = "none";
    telaDashboard.style.display = "flex";
    iniciarLeituraPedidos();
    iniciarLeituraHistorico();
    iniciarControleEnquete();
    iniciarModulosAdmin(perfil);
  } catch (error) {
    console.error("Não foi possível validar o acesso:", error);
    if (msgErro) {
      msgErro.textContent = "Não foi possível validar sua autorização. Tente novamente.";
      msgErro.style.display = "block";
    }
    await signOut(auth);
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
  if (contadorTopo) contadorTopo.textContent = String(total);
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

function mostrarAvisoNovoPedido(pedido) {
  let toast = document.getElementById("novo-pedido-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "novo-pedido-toast";
    toast.className = "novo-pedido-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = '<div class="toast-icon"><i class="fas fa-music"></i></div><div><strong>Novo pedido recebido!</strong><span class="toast-detalhe"></span></div>';
    document.body.appendChild(toast);
  }
  const detalhe = toast.querySelector(".toast-detalhe");
  if (detalhe) detalhe.textContent = `${pedido?.nome || "Um ouvinte"} pediu ${pedido?.musica || "uma música"}`;
  toast.classList.remove("saindo", "visivel");
  void toast.offsetWidth;
  toast.classList.add("visivel");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("visivel");
    toast.classList.add("saindo");
  }, 4200);
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
    const ehNovo = visualizacao === "pendentes" && idsNovosParaAnimar.has(id);
    const row = criarElemento("article", ehNovo ? "pedido-row pedido-row-new" : "pedido-row");
    if (ehNovo) {
      row.addEventListener("animationend", () => {
        idsNovosParaAnimar.delete(id);
        row.classList.remove("pedido-row-new");
      }, { once: true });
    }
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
    const idsAnteriores = new Set(Object.keys(pedidosAtuais));
    const idsRealmenteNovos = cargaInicial ? [] : chaves.filter((id) => !idsAnteriores.has(id));

    if (idsRealmenteNovos.length) {
      idsRealmenteNovos.forEach((id) => idsNovosParaAnimar.add(id));
      const primeiroNovo = dados[idsRealmenteNovos[idsRealmenteNovos.length - 1]];
      if (alertasAtivados) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => {});
      }
      notificarAba();
      mostrarAvisoNovoPedido(primeiroNovo);
      const contadorBox = document.querySelector(".pending-stat");
      if (contadorBox) {
        contadorBox.classList.remove("pedido-chegou");
        void contadorBox.offsetWidth;
        contadorBox.classList.add("pedido-chegou");
      }
      if ("Notification" in window && Notification.permission === "granted" && primeiroNovo) {
        new Notification("Radiação.Net - Novo pedido!", {
          body: `${primeiroNovo.nome || "Ouvinte"} pediu: ${primeiroNovo.musica || "uma música"}`,
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



/* MÓDULOS ADMINISTRATIVOS — programação e equipe */
const adminProgramacaoRef = ref(db, "programacao");
const adminEquipeRef = ref(db, "equipe");
const adminParceirosRef = ref(db, "parceiros");
let adminProgramacao = {};
let adminEquipe = {};
let adminParceiros = {};
let adminBindingsIniciados = false;
let perfilAtualPainel = null;
const adminWorkspace = $("admin-workspace");
const adminFeedback = $("admin-feedback");

function avisoAdmin(mensagem, erro = false) {
  if (!adminFeedback) return;
  adminFeedback.textContent = mensagem;
  adminFeedback.classList.toggle("error", erro);
}
function chaveDia(dia) {
  return ({seg:"Segunda",ter:"Terça",qua:"Quarta",qui:"Quinta",sex:"Sexta",sab:"Sábado",dom:"Domingo"})[dia] || dia;
}
function abrirFormAdmin(tipo, registro = null, id = "") {
  const card = $(`form-${tipo}-card`);
  const form = $(`form-${tipo}`);
  if (!card || !form) return;
  form.reset();
  if (tipo === "programa") {
    $("programa-id").value = id;
    $("programa-form-title").textContent = registro ? "Editar programa" : "Novo programa";
    $("programa-nome").value = registro?.titulo || "";
    $("programa-dia").value = registro?.dia || "seg";
    $("programa-inicio").value = registro?.inicio || "20:00";
    $("programa-fim").value = registro?.fim || "21:00";
    $("programa-locutor").value = registro?.locutor || "";
    $("programa-imagem").value = registro?.imagem || "";
    $("programa-descricao").value = registro?.descricao || "";
    $("programa-ordem").value = Number(registro?.ordem || 0);
    $("programa-ativo").checked = registro?.ativo !== false;
  } else if (tipo === "equipe") {
    $("equipe-id").value = id;
    $("equipe-form-title").textContent = registro ? "Editar integrante" : "Novo integrante";
    $("equipe-nome").value = registro?.nome || "";
    $("equipe-funcao").value = registro?.funcao || "";
    $("equipe-foto").value = registro?.foto || "";
    $("equipe-ordem").value = Number(registro?.ordem || 0);
    $("equipe-ativo").checked = registro?.ativo !== false;
  } else if (tipo === "parceiro") {
    $("parceiro-chave").value = id || "";
    $("parceiro-form-title").textContent = registro ? "Editar parceiro" : "Novo parceiro";
    $("parceiro-nome").value = registro?.nome || "";
    $("parceiro-imagem").value = registro?.imagem || "";
    $("parceiro-link").value = registro?.link || "";
    $("parceiro-ordem").value = Number(registro?.ordem || 0);
    $("parceiro-ativo").checked = registro?.ativo !== false;
  }
  card.hidden = false;
  card.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderAdminLista(tipo, dados) {
  const isPrograma = tipo === "programa";
  const isParceiro = tipo === "parceiro";
  const lista = $(isPrograma ? "lista-programas" : isParceiro ? "lista-parceiros" : "lista-equipe");
  const total = $(isPrograma ? "programas-total" : isParceiro ? "parceiros-total" : "equipe-total");
  if (!lista) return;
  const entradas = Object.entries(dados || {}).sort((a,b) => Number(a[1]?.ordem || 0)-Number(b[1]?.ordem || 0) || String(a[1]?.titulo || a[1]?.nome || "").localeCompare(String(b[1]?.titulo || b[1]?.nome || ""),"pt-BR"));
  if (total) total.textContent = `${entradas.length} registro(s)`;
  lista.replaceChildren();
  if (!entradas.length) {
    const vazio = document.createElement("div"); vazio.className="admin-empty";
    vazio.textContent = isPrograma ? "Nenhum programa cadastrado. Use “Novo programa” para começar." : isParceiro ? "Nenhum parceiro cadastrado. Use “Novo parceiro” para começar." : "Nenhum integrante cadastrado. Use “Novo integrante” para começar.";
    lista.appendChild(vazio); return;
  }
  entradas.forEach(([id, item]) => {
    const row=document.createElement("article"); row.className="admin-record";
    const main=document.createElement("div"); main.className="admin-record-main";
    const foto=item.imagem || item.foto;
    if (foto) { const img=document.createElement("img"); img.className="admin-record-thumb"; img.src=foto; img.alt=""; img.loading="lazy"; img.onerror=()=>{img.remove();}; main.appendChild(img); }
    else { const ico=document.createElement("div"); ico.className="admin-record-thumb placeholder"; ico.innerHTML=`<i class="fa-solid ${isPrograma?"fa-microphone-lines":isParceiro?"fa-handshake":"fa-user"}"></i>`; main.appendChild(ico); }
    const copy=document.createElement("div"); copy.className="admin-record-copy";
    const title=document.createElement("strong"); title.textContent=item.titulo || item.nome || "Sem título";
    const detail=document.createElement("small");
    detail.textContent=isPrograma ? `${chaveDia(item.dia)} · ${item.inicio || "—"}–${item.fim || "—"} · ${item.locutor || "Sem locutor"}${item.descricao ? " · "+item.descricao : ""}` : isParceiro ? (item.link || "Sem link cadastrado") : (item.funcao || "Integrante");
    copy.append(title,detail);
    const status=document.createElement("span"); status.className="admin-status"+(item.ativo===false?" off":""); status.textContent=item.ativo===false?"OCULTO":"PUBLICADO";
    copy.appendChild(status); main.appendChild(copy);
    const actions=document.createElement("div"); actions.className="admin-record-actions";
    const edit=document.createElement("button"); edit.type="button"; edit.title="Editar"; edit.setAttribute("aria-label","Editar"); edit.innerHTML='<i class="fa-solid fa-pen"></i>';
    edit.addEventListener("click",()=>abrirFormAdmin(tipo,item,id));
    const del=document.createElement("button"); del.type="button"; del.className="delete"; del.title="Excluir"; del.setAttribute("aria-label","Excluir"); del.innerHTML='<i class="fa-solid fa-trash"></i>';
    del.addEventListener("click",async()=>{ if(!confirm(`Excluir ${isPrograma?"o programa":isParceiro?"o parceiro":"o integrante"} “${item.titulo||item.nome}”?`))return; try{await remove(ref(db,`${isPrograma?"programacao":isParceiro?"parceiros":"equipe"}/${id}`));avisoAdmin("Registro excluído com sucesso.");}catch(e){console.error(e);avisoAdmin("Não foi possível excluir. Verifique as permissões do Firebase.",true);} });
    actions.append(edit,del); row.append(main,actions); lista.appendChild(row);
  });
}
async function proximoIdentificador(tipo) {
  const ehPrograma = tipo === "programacao";
  const ehParceiro = tipo === "parceiros";
  const prefixo = ehPrograma ? "prog" : ehParceiro ? "parc" : "memb";
  const registros = ehPrograma ? adminProgramacao : ehParceiro ? adminParceiros : adminEquipe;
  const maiorExistente = Object.keys(registros || {}).reduce((maior, chave) => {
    const match = chave.match(new RegExp("^" + prefixo + "(\\d+)$"));
    return match ? Math.max(maior, Number(match[1])) : maior;
  }, 0);
  const contadorRef = ref(db, `sequencias/${tipo}`);
  const resultado = await runTransaction(contadorRef, atual => Math.max(Number(atual || 0), maiorExistente) + 1);
  if (!resultado.committed) throw new Error("Não foi possível reservar o próximo identificador.");
  return `${prefixo}${resultado.snapshot.val()}`;
}

function alternarModoPainel(modo) {
  const administracao = modo === "administracao" && perfilAtualPainel?.perfil === "admin" && perfilAtualPainel?.ativo === true;
  const trigger = $("btn-admin-menu");
  const workspace = $("admin-workspace");

  document.body.classList.toggle("modo-administracao", administracao);
  if (workspace) workspace.hidden = !administracao;

  if (trigger) {
    trigger.setAttribute("aria-expanded", String(administracao));
    trigger.innerHTML = administracao
      ? '<i class="fa-solid fa-headset"></i><span>Voltar ao Locutor</span>'
      : '<i class="fa-solid fa-sliders"></i><span>Administração</span>';
    trigger.title = administracao ? "Voltar à Central do Locutor" : "Abrir administração";
  }

  if (!administracao) {
    document.querySelectorAll(".admin-form-card").forEach(card => { card.hidden = true; });
  }
}

function iniciarModulosAdmin(perfil) {
  perfilAtualPainel=perfil;
  const isAdmin=perfil?.perfil==="admin" && perfil?.ativo===true;
  const adminTrigger = $("btn-admin-menu");
  if (adminTrigger) adminTrigger.hidden = !isAdmin;
  alternarModoPainel("locutor");
  if (!isAdmin || adminBindingsIniciados) return;
  adminBindingsIniciados = true;
  onValue(adminProgramacaoRef,s=>{adminProgramacao=s.val()||{};renderAdminLista("programa",adminProgramacao);},e=>avisoAdmin("Falha ao carregar programação: "+e.message,true));
  onValue(adminEquipeRef,s=>{adminEquipe=s.val()||{};renderAdminLista("equipe",adminEquipe);},e=>avisoAdmin("Falha ao carregar equipe: "+e.message,true));
  onValue(adminParceirosRef,s=>{adminParceiros=s.val()||{};renderAdminLista("parceiro",adminParceiros);},e=>avisoAdmin("Falha ao carregar parceiros: "+e.message,true));
  $("btn-admin-menu")?.addEventListener("click",()=>alternarModoPainel(
    document.body.classList.contains("modo-administracao") ? "locutor" : "administracao"
  ));
  $("btn-fechar-admin")?.addEventListener("click",()=>alternarModoPainel("locutor"));
  document.querySelectorAll("[data-admin-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b===btn));
    document.querySelectorAll(".admin-module").forEach(m=>{const active=m.id===`admin-module-${btn.dataset.adminTab}`;m.hidden=!active;m.classList.toggle("active",active);});
  }));
  $("btn-novo-programa")?.addEventListener("click",()=>abrirFormAdmin("programa"));
  $("btn-novo-integrante")?.addEventListener("click",()=>abrirFormAdmin("equipe"));
  $("btn-novo-parceiro")?.addEventListener("click",()=>abrirFormAdmin("parceiro"));
  document.querySelectorAll("[data-close-form]").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.closeForm; $(`form-${t}-card`).hidden=true;}));
  $("form-programa")?.addEventListener("submit",async e=>{
    e.preventDefault(); const id=$("programa-id").value||await proximoIdentificador("programacao");
    const item={titulo:$("programa-nome").value.trim(),dia:$("programa-dia").value,inicio:$("programa-inicio").value,fim:$("programa-fim").value,locutor:$("programa-locutor").value.trim(),imagem:$("programa-imagem").value.trim(),descricao:$("programa-descricao").value.trim(),ordem:Number($("programa-ordem").value||0),ativo:$("programa-ativo").checked,atualizado_em:Date.now()};
    try{await set(ref(db,`programacao/${id}`),item);await set(ref(db,"programacao_config/gerenciada"),true);$("form-programa-card").hidden=true;avisoAdmin("Programa salvo. O site será atualizado automaticamente.");}catch(err){console.error(err);avisoAdmin("Falha ao salvar programa. Confira as regras do Firebase.",true);}
  });
  $("form-equipe")?.addEventListener("submit",async e=>{
    e.preventDefault(); const id=$("equipe-id").value||await proximoIdentificador("equipe");
    const item={nome:$("equipe-nome").value.trim(),funcao:$("equipe-funcao").value.trim(),foto:$("equipe-foto").value.trim(),ordem:Number($("equipe-ordem").value||0),ativo:$("equipe-ativo").checked,atualizado_em:Date.now()};
    try{await set(ref(db,`equipe/${id}`),item);await set(ref(db,"equipe_config/gerenciada"),true);$("form-equipe-card").hidden=true;avisoAdmin("Integrante salvo. O site será atualizado automaticamente.");}catch(err){console.error(err);avisoAdmin("Falha ao salvar integrante. Confira as regras do Firebase.",true);}
  });
  $("form-parceiro")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try {
      const id=$("parceiro-chave").value || await proximoIdentificador("parceiros");
      const item={nome:$("parceiro-nome").value.trim(),imagem:$("parceiro-imagem").value.trim(),link:$("parceiro-link").value.trim(),ordem:Number($("parceiro-ordem").value||0),ativo:$("parceiro-ativo").checked};
      await set(ref(db,`parceiros/${id}`),item);
      $("form-parceiro-card").hidden=true;
      avisoAdmin("Parceiro salvo. O site será atualizado automaticamente.");
    } catch(err) { console.error(err); avisoAdmin("Falha ao salvar parceiro. Confira as regras do Firebase.",true); }
  });
}
