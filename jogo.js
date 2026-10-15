
const jogadores = [];

const CHAVE_SAVE = "desafioDasCores_save_v1";

let telaAtual = "telaInicio";
let partidaEmAndamento = false;
let salvamentoPausado = false;

const CORES_JOGADORES = [
  "#38bdf8", "#f472b6", "#fbbf24",
  "#4ade80", "#a78bfa", "#fb923c",
  "#22d3ee", "#f87171", "#e879f9",
  "#bef264"
];

const COLUNAS = 20;
const LINHAS = 12;

let CICLOS = 3;
let rodada = 0;
let resposta = null;
let escolha = null;
let palpites = [];
let ordemPalpites = [];
let indicePalpite = 0;

let TEMPO_PALPITE = 0;
let tempoRestante = 0;
let intervaloTimer = null;
let fimDoTempo = null;
let tentativaAtiva = false;

const $ = id => document.getElementById(id);

const telas = [
  "telaInicio",
  "telaSecreta",
  "telaPassagem",
  "telaPalpite",
  "telaResultado",
  "telaFinal"
];

function mostrarTela(id) {
  telaAtual = id;

  telas.forEach(tela => {
    $(tela).hidden = tela !== id;
  });

  $("btnMenu").hidden = id === "telaInicio";

  window.scrollTo(0, 0);

  if (partidaEmAndamento && !salvamentoPausado) {
    salvarPartida();
  }
}

function pararTimer() {
  if (intervaloTimer !== null) {
    clearInterval(intervaloTimer);
    intervaloTimer = null;
  }

  fimDoTempo = null;
}

function atualizarContador() {
  const contador = $("contadorPalpite");

  if (!contador) return;

  contador.style.color = "";

  if (TEMPO_PALPITE === 0) {
    contador.textContent = "⏱️ Sem limite de tempo";
    return;
  }

  contador.textContent = `⏱️ ${tempoRestante}s`;

  if (tempoRestante <= 5) {
    contador.style.color = "#ef4444";
  }
}

function verificarTimer() {
  if (!tentativaAtiva || fimDoTempo === null) return;

  tempoRestante = Math.max(
    0,
    Math.ceil((fimDoTempo - Date.now()) / 1000)
  );

  atualizarContador();

  if (Date.now() >= fimDoTempo) {
    tempoEsgotado();
  }
}

function iniciarTimer(prazoSalvo = null) {
  pararTimer();

  tentativaAtiva = true;
  tempoRestante = TEMPO_PALPITE;

  if ($("mensagemTimer")) {
    $("mensagemTimer").textContent = "";
  }

  if (TEMPO_PALPITE === 0) {
    atualizarContador();
    return;
  }

  fimDoTempo = prazoSalvo ??
    Date.now() + TEMPO_PALPITE * 1000;

  verificarTimer();

  if (tentativaAtiva) {
    intervaloTimer = setInterval(verificarTimer, 100);
  }
}

function tempoEsgotado() {
  if (!tentativaAtiva) return;

  pararTimer();
  tentativaAtiva = false;

  $("contadorPalpite").textContent =
    "⏰ Tempo esgotado!";

  $("btnConfirmar").disabled = true;

  document.querySelectorAll("#tabuleiro .celula")
    .forEach(celula => {
      celula.disabled = true;
    });

  if ($("mensagemTimer")) {
    $("mensagemTimer").textContent =
      "O jogador não pontuou nesta tentativa.";
  }

  registrarPalpiteEAvancar(true);
}


function obterCor(x, y) {
  const hue = x * (360 / COLUNAS);
  const saturation = Math.max(20, 95 - y * 3);
  const lightness = Math.min(90, 20 + y * 6);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function coordenada(x, y) {
  return String.fromCharCode(65 + x) + (y + 1);
}

function numeroAleatorio(maximo) {
  const numeros = new Uint32Array(1);
  crypto.getRandomValues(numeros);
  return numeros[0] % maximo;
}

function atualizarJogadores() {
  const lista = $("listaJogadores");
  lista.replaceChildren();

  jogadores.forEach((jogador, indice) => {
    const item = document.createElement("div");
    item.className = "jogador";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = jogador.nome[0].toUpperCase();

    const nome = document.createElement("span");
    nome.className = "nome";
    nome.textContent = jogador.nome;

    const remover = document.createElement("button");
    remover.className = "remover";
    remover.textContent = "✕";

    remover.setAttribute(
      "aria-label",
      `Remover ${jogador.nome}`
    );

    remover.onclick = () => {
      jogadores.splice(indice, 1);
      atualizarJogadores();
    };

    item.append(avatar, nome, remover);
    lista.appendChild(item);
  });

  $("btnComecar").disabled = jogadores.length < 2;
}

function adicionarJogador() {
  const campo = $("nomeJogador");
  const nome = campo.value.trim();

  if (!nome) {
    $("mensagem").textContent = "Digite um nome!";
    return;
  }

  if (jogadores.length >= 10) {
    $("mensagem").textContent = "Máximo de 10 jogadores!";
    return;
  }

  if (jogadores.some(j =>
    j.nome.toLowerCase() === nome.toLowerCase()
  )) {
    $("mensagem").textContent = "Nome já cadastrado!";
    return;
  }

  jogadores.push({
    nome,
    pontos: 0,
    corMarcador: CORES_JOGADORES[
      jogadores.length % CORES_JOGADORES.length
    ]
  });

  campo.value = "";
  $("mensagem").textContent = "";

  atualizarJogadores();
  campo.focus();
}

function iniciarPartida() {
  if (jogadores.length < 2) return;

  CICLOS = Number($("quantidadeCiclos").value);

  TEMPO_PALPITE = Number(
    $("tempoPalpite")?.value || 0
  );

  jogadores.forEach((jogador, indice) => {
    jogador.corMarcador = CORES_JOGADORES[indice];
    jogador.pontos = 0;
  });

  rodada = 0;
  partidaEmAndamento = true;

  pararTimer();
  tentativaAtiva = false;

  novaRodada();
}

function novaRodada() {
  pararTimer();
  tentativaAtiva = false;

  if (rodada >= jogadores.length * CICLOS) {
    finalizarJogo();
    return;
  }

  const jogadorDica =
    jogadores[rodada % jogadores.length];

  resposta = {
    x: numeroAleatorio(COLUNAS),
    y: numeroAleatorio(LINHAS)
  };

  palpites = [];
  escolha = null;

  ordemPalpites = jogadores.filter(
    jogador => jogador !== jogadorDica
  );

  indicePalpite = 0;

  $("rodadaTexto").textContent =
    `Rodada ${rodada + 1} de ${jogadores.length * CICLOS}`;

  $("nomeDica").textContent =
    `${jogadorDica.nome}, sua vez!`;

  $("areaSecreta").hidden = true;
  $("btnRevelar").hidden = false;

  mostrarTela("telaSecreta");
}

function revelarCor() {
  $("corSecreta").style.backgroundColor =
    obterCor(resposta.x, resposta.y);

  $("coordenadaSecreta").textContent =
    coordenada(resposta.x, resposta.y);

  $("btnRevelar").hidden = true;
  $("areaSecreta").hidden = false;

  salvarPartida();
}

function esconderCor() {
  $("areaSecreta").hidden = true;

  $("tituloPassagem").textContent =
    "Passe o dispositivo";

  $("textoPassagem").textContent =
    `Entregue para ${ordemPalpites[0].nome}. ` +
    "Não deixe os outros verem sua escolha!";

  mostrarTela("telaPassagem");
}

function gerarTabuleiro() {
  const tabuleiro = $("tabuleiro");
  tabuleiro.replaceChildren();

  for (let y = 0; y < LINHAS; y++) {
    for (let x = 0; x < COLUNAS; x++) {
      const celula = document.createElement("button");

      celula.type = "button";
      celula.className = "celula";
      celula.style.backgroundColor = obterCor(x, y);
      celula.title = coordenada(x, y);

      celula.setAttribute(
        "aria-label",
        `Cor ${coordenada(x, y)}`
      );

      celula.onclick = () => {
        if (!tentativaAtiva) return;

        if (
          fimDoTempo !== null &&
          Date.now() >= fimDoTempo
        ) {
          verificarTimer();
          return;
        }

        document.querySelectorAll(
          "#tabuleiro .selecionada"
        ).forEach(c => {
          c.classList.remove("selecionada");
        });

        celula.classList.add("selecionada");

        escolha = { x, y };

        $("corPreview").style.backgroundColor =
          obterCor(x, y);

        $("corEscolhida").textContent =
          coordenada(x, y);

        $("btnConfirmar").disabled = false;
      };

      tabuleiro.appendChild(celula);
    }
  }
}

function prepararPalpite() {
  pararTimer();
  tentativaAtiva = false;

  const jogador = ordemPalpites[indicePalpite];

  escolha = null;

  $("vezTexto").textContent =
    `Vez de ${jogador.nome}`;

  $("corPreview").style.backgroundColor = "#292d44";
  $("corEscolhida").textContent = "Nenhuma cor";
  $("btnConfirmar").disabled = true;

  gerarTabuleiro();

  mostrarTela("telaPalpite");

  iniciarTimer();

  salvarPartida();
}

function confirmarPalpite() {
  if (!tentativaAtiva || !escolha) return;

  if (
    fimDoTempo !== null &&
    Date.now() >= fimDoTempo
  ) {
    verificarTimer();
    return;
  }

  registrarPalpiteEAvancar(false);
}

function registrarPalpiteEAvancar(esgotado) {
  if (!esgotado && (!tentativaAtiva || !escolha)) {
    return;
  }

  pararTimer();
  tentativaAtiva = false;

  $("btnConfirmar").disabled = true;

  palpites.push({
    jogador: ordemPalpites[indicePalpite],
    x: esgotado ? null : escolha.x,
    y: esgotado ? null : escolha.y,
    semPalpite: esgotado
  });

  indicePalpite++;

  if (indicePalpite < ordemPalpites.length) {
    $("tituloPassagem").textContent =
      "Próximo jogador";

    $("textoPassagem").textContent =
      `Agora é a vez de ${ordemPalpites[indicePalpite].nome}.`;

    mostrarTela("telaPassagem");
  } else {
    mostrarResultado();
  }

  salvarPartida();
}

function calcularPontos(palpite) {
  if (
    palpite.semPalpite ||
    palpite.x == null ||
    palpite.y == null
  ) {
    return 0;
  }

  const distancia = Math.max(
    Math.abs(palpite.x - resposta.x),
    Math.abs(palpite.y - resposta.y)
  );

  return Math.max(0, 5 - distancia);
}

function criarLinha(nome, texto) {
  const linha = document.createElement("div");
  linha.className = "linha-resultado";

  const nomeElemento = document.createElement("span");
  nomeElemento.textContent = nome;

  const valor = document.createElement("span");
  valor.className = "pontos";
  valor.textContent = texto;

  linha.append(nomeElemento, valor);
  return linha;
}

function preencherRanking(elemento) {
  elemento.replaceChildren();

  const ranking = [...jogadores].sort(
    (a, b) => b.pontos - a.pontos
  );

  ranking.forEach((jogador, indice) => {
    elemento.appendChild(
      criarLinha(
        `${indice + 1}º ${jogador.nome}`,
        `${jogador.pontos} pts`
      )
    );
  });
}

function atualizarRankingBonito(elemento) {
  elemento.replaceChildren();

  const classificados = [...jogadores].sort(
    (a, b) => b.pontos - a.pontos
  );

  let posicao = 0;
  let pontosAnteriores = null;

  classificados.forEach((jogador, indice) => {
    if (jogador.pontos !== pontosAnteriores) {
      posicao = indice + 1;
    }

    pontosAnteriores = jogador.pontos;

    const linha = document.createElement("div");
    linha.className = "ranking-linha";

    if (posicao === 1) {
      linha.classList.add("primeiro");
    }

    const medalhas = {
      1: "🥇",
      2: "🥈",
      3: "🥉"
    };

    const medalha = document.createElement("span");
    medalha.className = "ranking-posicao";
    medalha.textContent =
      medalhas[posicao] || `${posicao}º`;

    const nome = document.createElement("span");
    nome.className = "ranking-nome";
    nome.textContent = jogador.nome;

    const pontos = document.createElement("span");
    pontos.className = "ranking-pontos";
    pontos.textContent = `${jogador.pontos} pts`;

    linha.append(medalha, nome, pontos);
    elemento.appendChild(linha);
  });
}

function gerarTabuleiroResultado() {
  const tabuleiro = $("tabuleiroResultado");
  const legenda = $("legendaResultado");

  tabuleiro.replaceChildren();
  legenda.replaceChildren();

  for (let y = 0; y < LINHAS; y++) {
    for (let x = 0; x < COLUNAS; x++) {
      const celula = document.createElement("div");

      celula.className = "celula-resultado";
      celula.style.backgroundColor = obterCor(x, y);

      const correta =
        x === resposta.x && y === resposta.y;

      if (correta) {
        celula.classList.add("correta");

        const indicador = document.createElement("span");
        indicador.className = "marcador-resposta";
        indicador.textContent = "✓";
        indicador.title = "Cor correta";

        celula.appendChild(indicador);
      }

      const apostas = palpites.filter(p =>
        !p.semPalpite &&
        p.x === x &&
        p.y === y
      );

      if (apostas.length > 0) {
        const grupo = document.createElement("div");

        grupo.className = apostas.length > 1
          ? "marcadores-agrupados"
          : "marcador-unico";

        apostas.forEach(palpite => {
          const marcador = document.createElement("span");

          marcador.className = "marcador";
          marcador.style.backgroundColor =
            palpite.jogador.corMarcador;

          marcador.title =
            `${palpite.jogador.nome}: ${coordenada(x, y)}`;

          grupo.appendChild(marcador);
        });

        celula.appendChild(grupo);
      }

      tabuleiro.appendChild(celula);
    }
  }

  const respostaLegenda = document.createElement("div");
  respostaLegenda.className = "item-legenda";
  respostaLegenda.textContent = "✓ Cor correta";
  legenda.appendChild(respostaLegenda);

  palpites.forEach(palpite => {
    const item = document.createElement("div");
    item.className = "item-legenda";

    const bolinha = document.createElement("span");
    bolinha.className = "bolinha-legenda";
    bolinha.style.backgroundColor =
      palpite.jogador.corMarcador;

    const nome = document.createElement("span");
    nome.textContent = palpite.jogador.nome;

    item.append(bolinha, nome);
    legenda.appendChild(item);
  });
}

function mostrarResultado() {
  const lista = $("resultadosJogadores");
  lista.replaceChildren();

  $("corResposta").style.backgroundColor =
    obterCor(resposta.x, resposta.y);

  $("textoResposta").textContent =
    `Cor correta: ${coordenada(resposta.x, resposta.y)}`;

  const jogadorDica =
    jogadores[rodada % jogadores.length];

  let pontosDica = 0;

  palpites.forEach(palpite => {
    const pontos = calcularPontos(palpite);

    palpite.jogador.pontos += pontos;

    if (pontos >= 3) {
      pontosDica++;
    }

    const descricao = palpite.semPalpite
      ? "Tempo esgotado"
      : coordenada(palpite.x, palpite.y);

    lista.appendChild(
      criarLinha(
        `${palpite.jogador.nome} — ${descricao}`,
        `+${pontos} pts`
      )
    );
  });

  jogadorDica.pontos += pontosDica;

  lista.appendChild(
    criarLinha(
      `${jogadorDica.nome} (dica)`,
      `+${pontosDica} pts`
    )
  );

  gerarTabuleiroResultado();
  atualizarRankingBonito($("ranking"));

  $("btnProxima").textContent =
    rodada + 1 >= jogadores.length * CICLOS
      ? "Ver resultado final"
      : "Próxima rodada";

  mostrarTela("telaResultado");
  salvarPartida();
}

function finalizarJogo() {
  pararTimer();
  tentativaAtiva = false;

  atualizarRankingBonito($("rankingFinal"));
  atualizarMensagemVencedor();

  mostrarTela("telaFinal");
}

function atualizarMensagemVencedor() {
  const maior = Math.max(
    ...jogadores.map(j => j.pontos)
  );

  const vencedores = jogadores.filter(
    j => j.pontos === maior
  );

  const nomes = vencedores.map(j => j.nome);

  $("mensagemVencedor").textContent =
    vencedores.length === 1
      ? `🏆 ${nomes[0]} venceu com ${maior} pontos!`
      : `🏆 Empate entre ${nomes.join(", ")} com ${maior} pontos!`;
}

function salvarPartida() {
  if (!partidaEmAndamento || salvamentoPausado) {
    return;
  }

  const dados = {
    versao: 1,

    jogadores: jogadores.map(j => ({
      nome: j.nome,
      pontos: j.pontos,
      corMarcador: j.corMarcador
    })),

    rodada,
    ciclos: CICLOS,
    tempoPalpite: TEMPO_PALPITE,
    timerFim: tentativaAtiva ? fimDoTempo : null,
    resposta,
    escolha,

    palpites: palpites.map(p => ({
      indiceJogador: jogadores.indexOf(p.jogador),
      x: p.x,
      y: p.y,
      semPalpite: !!p.semPalpite
    })),

    ordemPalpites: ordemPalpites.map(j =>
      jogadores.indexOf(j)
    ),

    indicePalpite,
    telaAtual,
    corRevelada: !$("areaSecreta").hidden
  };

  try {
    localStorage.setItem(
      CHAVE_SAVE,
      JSON.stringify(dados)
    );
  } catch (erro) {
    console.error("Erro ao salvar:", erro);
  }
}

function existePartidaSalva() {
  return localStorage.getItem(CHAVE_SAVE) !== null;
}

function atualizarBotaoContinuar() {
  $("btnContinuarPartida").hidden =
    !existePartidaSalva();
}

function restaurarPartida() {
  const texto = localStorage.getItem(CHAVE_SAVE);
  if (!texto) return;

  try {
    const dados = JSON.parse(texto);

    if (
      dados.versao !== 1 ||
      !Array.isArray(dados.jogadores) ||
      dados.jogadores.length < 2 ||
      !Array.isArray(dados.palpites) ||
      !Array.isArray(dados.ordemPalpites) ||
      !telas.includes(dados.telaAtual)
    ) {
      throw new Error("Salvamento incompatível.");
    }

    pararTimer();
    tentativaAtiva = false;
    salvamentoPausado = true;

    jogadores.splice(
      0,
      jogadores.length,
      ...dados.jogadores
    );

    rodada = dados.rodada;
    CICLOS = dados.ciclos;

    TEMPO_PALPITE = Number(
      dados.tempoPalpite ?? 0
    );

    $("quantidadeCiclos").value = String(CICLOS);

    if ($("tempoPalpite")) {
      $("tempoPalpite").value = String(TEMPO_PALPITE);
    }

    resposta = dados.resposta;
    escolha = dados.escolha;

    palpites = dados.palpites.map(p => ({
      jogador: jogadores[p.indiceJogador],
      x: p.x,
      y: p.y,
      semPalpite: !!p.semPalpite
    }));

    ordemPalpites = dados.ordemPalpites.map(
      indice => jogadores[indice]
    );

    indicePalpite = dados.indicePalpite;

    partidaEmAndamento = true;
    atualizarJogadores();

    const tela = dados.telaAtual;

    if (tela === "telaSecreta") {
      const jogadorDica =
        jogadores[rodada % jogadores.length];

      $("rodadaTexto").textContent =
        `Rodada ${rodada + 1} de ${jogadores.length * CICLOS}`;

      $("nomeDica").textContent =
        `${jogadorDica.nome}, sua vez!`;

      $("btnRevelar").hidden = dados.corRevelada;
      $("areaSecreta").hidden = !dados.corRevelada;

      if (dados.corRevelada) {
        $("corSecreta").style.backgroundColor =
          obterCor(resposta.x, resposta.y);

        $("coordenadaSecreta").textContent =
          coordenada(resposta.x, resposta.y);
      }
    }

    if (tela === "telaPassagem") {
      $("tituloPassagem").textContent =
        "Passe o dispositivo";

      $("textoPassagem").textContent =
        `Agora é a vez de ${ordemPalpites[indicePalpite].nome}.`;
    }

    if (tela === "telaPalpite") {
      escolha = null;

      $("vezTexto").textContent =
        `Vez de ${ordemPalpites[indicePalpite].nome}`;

      $("corPreview").style.backgroundColor = "#292d44";
      $("corEscolhida").textContent = "Nenhuma cor";
      $("btnConfirmar").disabled = true;

      gerarTabuleiro();
    }

    if (tela === "telaResultado") {
      desenharResultadoSalvo();
    }

    if (tela === "telaFinal") {
      atualizarRankingBonito($("rankingFinal"));
      atualizarMensagemVencedor();
    }

    mostrarTela(tela);

    if (tela === "telaPalpite") {
      // Mantém o prazo original da tentativa.
      if (dados.timerFim && TEMPO_PALPITE > 0) {
        iniciarTimer(Number(dados.timerFim));
      } else {
        iniciarTimer();
      }
    }

    salvamentoPausado = false;
    salvarPartida();

  } catch (erro) {
    salvamentoPausado = false;
    console.error("Erro ao restaurar:", erro);
    alert("Não foi possível restaurar a partida salva.");
  }
}

function desenharResultadoSalvo() {
  $("corResposta").style.backgroundColor =
    obterCor(resposta.x, resposta.y);

  $("textoResposta").textContent =
    `Cor correta: ${coordenada(resposta.x, resposta.y)}`;

  const lista = $("resultadosJogadores");
  lista.replaceChildren();

  palpites.forEach(p => {
    const descricao = p.semPalpite
      ? "Tempo esgotado"
      : coordenada(p.x, p.y);

    lista.appendChild(
      criarLinha(
        `${p.jogador.nome} — ${descricao}`,
        `+${calcularPontos(p)} pts`
      )
    );
  });

  const jogadorDica =
    jogadores[rodada % jogadores.length];

  const pontosDica = palpites.filter(
    p => calcularPontos(p) >= 3
  ).length;

  lista.appendChild(
    criarLinha(
      `${jogadorDica.nome} (dica)`,
      `+${pontosDica} pts`
    )
  );

  gerarTabuleiroResultado();
  atualizarRankingBonito($("ranking"));

  $("btnProxima").textContent =
    rodada + 1 >= jogadores.length * CICLOS
      ? "Ver resultado final"
      : "Próxima rodada";
}

$("btnAdicionar").onclick = adicionarJogador;

$("nomeJogador").addEventListener(
  "keydown",
  evento => {
    if (evento.key === "Enter") {
      adicionarJogador();
    }
  }
);

$("btnComecar").onclick = iniciarPartida;

$("btnRevelar").onclick = revelarCor;

$("btnEsconder").onclick = esconderCor;

// O TIMER COMEÇA AQUI, AO CLICAR EM ESTOU PRONTO
$("btnContinuar").onclick = prepararPalpite;

$("btnConfirmar").onclick = confirmarPalpite;

$("btnProxima").onclick = () => {
  rodada++;
  novaRodada();
};

$("btnReiniciar").onclick = () => {
  pararTimer();
  tentativaAtiva = false;

  localStorage.removeItem(CHAVE_SAVE);

  partidaEmAndamento = false;
  salvamentoPausado = false;

  jogadores.forEach(jogador => {
    jogador.pontos = 0;
  });

  rodada = 0;
  resposta = null;
  escolha = null;
  palpites = [];
  ordemPalpites = [];
  indicePalpite = 0;

  atualizarJogadores();
  atualizarBotaoContinuar();
  mostrarTela("telaInicio");
};

function voltarAoMenu() {
  const confirmar = confirm(
    "Voltar ao menu? A partida atual será encerrada."
  );

  if (!confirmar) return;

  pararTimer();
  tentativaAtiva = false;

  localStorage.removeItem(CHAVE_SAVE);

  partidaEmAndamento = false;
  salvamentoPausado = false;

  jogadores.length = 0;
  rodada = 0;
  resposta = null;
  escolha = null;
  palpites = [];
  ordemPalpites = [];
  indicePalpite = 0;

  atualizarJogadores();
  atualizarBotaoContinuar();
  mostrarTela("telaInicio");
}

$("btnMenu").onclick = voltarAoMenu;

document.querySelectorAll("[data-voltar-menu]")
  .forEach(botao => {
    botao.onclick = voltarAoMenu;
  });

atualizarJogadores();
mostrarTela("telaInicio");

$("btnContinuarPartida").onclick = restaurarPartida;

atualizarBotaoContinuar();

// Esconde o botão antigo, caso ainda exista.
if ($("btnIniciarTentativa")) {
  $("btnIniciarTentativa").hidden = true;
}
