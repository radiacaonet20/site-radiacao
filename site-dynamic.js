import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const config = {
  apiKey: "AIzaSyDLCYfYApZZt4ycMmr-f4Xq002ZBalYmdU",
  authDomain: "radiacaonet.firebaseapp.com",
  databaseURL: "https://radiacaonet-default-rtdb.firebaseio.com",
  projectId: "radiacaonet",
  storageBucket: "radiacaonet.firebasestorage.app",
  messagingSenderId: "1078838815128",
  appId: "1:1078838815128:web:20de30c5ad574a59dd23ed"
};
const app=getApps().length?getApp():initializeApp(config);
const db=getDatabase(app);
const dias=["dom","seg","ter","qua","qui","sex","sab"];
const nomes={dom:"Domingo",seg:"Segunda-feira",ter:"Terça-feira",qua:"Quarta-feira",qui:"Quinta-feira",sex:"Sexta-feira",sab:"Sábado"};
const diaId={dom:"prog-dom",seg:"prog-seg",ter:"prog-ter",qua:"prog-qua",qui:"prog-qui",sex:"prog-sex",sab:"prog-sab"};
let programacaoGerenciada=false;
let programacaoCarregada=false;
let configuracaoProgramacaoCarregada=false;
let equipeGerenciada=false;
let dadosProgramacaoAtuais={};
let dadosEquipeAtuais={};

function criar(tag,classe,texto){
  const node=document.createElement(tag);
  if(classe)node.className=classe;
  if(texto!==undefined)node.textContent=texto;
  return node;
}
function imagemSegura(url){
  try{const u=new URL(url);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}
}
function criarCardAutoDJ(){
  const card=criar("article","prog-card auto-dj");
  const img=criar("img");
  img.src="https://i.postimg.cc/YSV5B7jW/Logo-Nova-Cor-200.png";
  img.alt="Radiação.Net";
  img.loading="lazy";
  const details=criar("div","prog-details");
  const time=criar("span","prog-time");
  const icon=criar("i","fas fa-compact-disc");
  time.append(icon,document.createTextNode(" 24 Horas"));
  details.append(time,criar("h4","","Playlist Radiação"),criar("p","","A melhor seleção musical rolando sem parar."));
  card.append(img,details);
  return card;
}
function renderizarProgramacao(dados){
  const container=document.getElementById("modernSchedule");
  if(!container || !programacaoCarregada || !configuracaoProgramacaoCarregada)return;
  const registros=Object.entries(dados||{}).filter(([,p])=>p&&p.ativo!==false);
  const existeProgramacaoNoBanco=registros.length>0;
  if(!existeProgramacaoNoBanco && !programacaoGerenciada)return; // Mantém a programação legada até a gestão pelo painel ser ativada.
  container.querySelectorAll(".prog-content").forEach(n=>n.remove());
  const agrupado=Object.fromEntries(dias.map(d=>[d,[]]));
  registros.forEach(([id,p])=>{
    // Compatibilidade com cadastros antigos: Playlist Radiação é o padrão do AutoDJ,
    // não um programa que deva ser mantido no banco de dados.
    const titulo=String(p.titulo||"").trim().toLocaleLowerCase("pt-BR");
    const ehPlaylistPadrao=titulo==="playlist radiação" || p.tipo==="autodj";
    if(!ehPlaylistPadrao && agrupado[p.dia])agrupado[p.dia].push({id,...p});
  });
  Object.entries(agrupado).forEach(([dia,itens])=>{
    const section=criar("div","prog-content");section.id=diaId[dia];section.dataset.day=nomes[dia].toUpperCase();
    itens.sort((a,b)=>(a.inicio||"").localeCompare(b.inicio||"")||Number(a.ordem||0)-Number(b.ordem||0));
    if(!itens.length){
      // Padrão do AutoDJ gerado pelo próprio site; não exige cadastro no Firebase.
      section.appendChild(criarCardAutoDJ());
    } else itens.forEach(p=>{
      const card=criar("article","prog-card"+(p.tipo==="autodj"?" auto-dj":""));
      const src=imagemSegura(p.imagem)||"https://i.postimg.cc/YSV5B7jW/Logo-Nova-Cor-200.png";
      const img=criar("img");img.src=src;img.alt=p.titulo||"Programa Radiação.Net";img.loading="lazy";card.appendChild(img);
      const details=criar("div","prog-details");
      const time=criar("span","prog-time");const icon=criar("i","fas fa-clock");time.append(icon,document.createTextNode(` ${p.inicio||"—"}${p.fim?" – "+p.fim:""}`));
      const title=criar("h4","",p.titulo||"Programa");
      const desc=criar("p","",p.descricao||"");
      details.append(time,title,desc);
      if(p.locutor){const host=criar("span","prog-host",`Com ${p.locutor}`);details.appendChild(host);}
      card.appendChild(details);section.appendChild(card);
    });
    container.appendChild(section);
  });
  const current=diaId[dias[new Date().getDay()]];
  const activeId=container.querySelector(".day-pill.active")?.dataset.target||current;
  container.querySelectorAll(".prog-content").forEach(n=>n.classList.toggle("active",n.id===activeId));
  if(typeof window.atualizarCabecalhoProgramacao==="function")window.atualizarCabecalhoProgramacao(activeId);
}
function renderizarEquipe(dados){
  const grid=document.querySelector("#equipe .team-grid");
  if(!grid)return;
  const pessoas=Object.values(dados||{}).filter(p=>p&&p.ativo!==false).sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0)||String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
  if(!pessoas.length)return; // Preserva os cards atuais até o primeiro cadastro dinâmico.
  grid.replaceChildren();
  pessoas.forEach(p=>{
    const card=criar("article","team-card");
    const url=imagemSegura(p.foto);
    if(url){const img=criar("img");img.src=url;img.alt=p.nome||"Integrante da equipe";img.loading="lazy";card.appendChild(img);}
    const info=criar("div","team-info");info.append(criar("h4","",p.nome||"Integrante"),criar("span","",p.funcao||"Equipe Radiação.Net"));
    card.appendChild(info);grid.appendChild(card);
  });
}
onValue(ref(db,"programacao"),snap=>{
  dadosProgramacaoAtuais=snap.val()||{};
  programacaoCarregada=true;
  renderizarProgramacao(dadosProgramacaoAtuais);
},err=>console.error("Programação dinâmica:",err));
onValue(ref(db,"programacao_config/gerenciada"),snap=>{
  programacaoGerenciada=snap.val()===true;
  configuracaoProgramacaoCarregada=true;
  renderizarProgramacao(dadosProgramacaoAtuais);
},err=>{
  console.error("Configuração da programação:",err);
  configuracaoProgramacaoCarregada=true;
  renderizarProgramacao(dadosProgramacaoAtuais);
});
onValue(ref(db,"equipe"),snap=>renderizarEquipe(snap.val()||{}),err=>console.error("Equipe dinâmica:",err));
