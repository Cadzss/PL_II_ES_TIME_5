// Autor: Cadu Spadari
// Script para gerenciar disciplinas (listar, criar, editar, excluir)

// Variáveis globais para armazenar dados
var disciplinas = [];
var instituicoes = [];
var cursos = [];
var disciplinaEditando = null;

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Carrega os dados quando a página carrega
  carregarInstituicoes();
  carregarCursos();
  carregarDisciplinas();

  // Pega o formulário de nova disciplina
  var formNovaDisciplina = document.getElementById('formNovaDisciplina');
  formNovaDisciplina.onsubmit = function(e) {
    e.preventDefault();
    criarDisciplina();
  };

  // Pega o formulário de editar disciplina
  var formEditarDisciplinas = document.getElementById('formEditarDisciplinas');
  formEditarDisciplinas.onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoDisciplina();
  };

  // Quando selecionar uma instituição, atualiza os cursos
  var selectInstituicao = document.getElementById('selectInstituicao');
  selectInstituicao.onchange = function() {
    atualizarCursosPorInstituicao(this.value);
  };

  // Adiciona eventos para os botões depois que a página carregar
  setTimeout(function() {
    adicionarEventosBotoes();
  }, 500);
};

// Função para adicionar eventos aos botões de editar e excluir
function adicionarEventosBotoes() {
  // Pega todos os botões de editar
  var botoesEditar = document.querySelectorAll('.btn-outline-warning');
  for (var i = 0; i < botoesEditar.length; i++) {
    var btn = botoesEditar[i];
    if (btn.textContent.indexOf('Editar') !== -1) {
      btn.onclick = function() {
        var disciplinaId = this.getAttribute('data-disciplina-id');
        abrirModalEditar(disciplinaId);
      };
    }
  }
  
  // Pega todos os botões de excluir
  var botoesExcluir = document.querySelectorAll('.btn-excluir');
  for (var i = 0; i < botoesExcluir.length; i++) {
    var btn = botoesExcluir[i];
    btn.onclick = function() {
      var disciplinaId = this.getAttribute('data-disciplina-id');
      excluirDisciplina(disciplinaId);
    };
  }
}

// Função para carregar instituições
function carregarInstituicoes() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/instituicoes
  xhr.open('GET', '/api/instituicoes', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva as instituições na variável global
    instituicoes = resposta;
    // Preenche o select de instituições
    preencherSelectInstituicoes();
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar instituições');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para preencher o select de instituições
function preencherSelectInstituicoes() {
  var select = document.getElementById('selectInstituicao');
  select.innerHTML = '<option value="" selected disabled>Instituições cadastradas</option>';
  
  for (var i = 0; i < instituicoes.length; i++) {
    var option = document.createElement('option');
    option.value = instituicoes[i].id;
    option.textContent = instituicoes[i].nome;
    select.appendChild(option);
  }
}

// Função para carregar cursos
function carregarCursos() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/cursos
  xhr.open('GET', '/api/cursos', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva os cursos na variável global
    cursos = resposta;
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar cursos');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para atualizar cursos quando selecionar uma instituição
function atualizarCursosPorInstituicao(instituicaoId) {
  var selectCurso = document.getElementById('selectCurso');
  selectCurso.innerHTML = '<option value="" selected disabled>Cursos cadastrados</option>';
  
  for (var i = 0; i < cursos.length; i++) {
    if (cursos[i].instituicao_id == instituicaoId) {
      var option = document.createElement('option');
      option.value = cursos[i].id;
      option.textContent = cursos[i].nome;
      selectCurso.appendChild(option);
    }
  }
}

// Função para carregar disciplinas
function carregarDisciplinas() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/disciplinas
  xhr.open('GET', '/api/disciplinas', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva as disciplinas na variável global
    disciplinas = resposta;
    // Exibe as disciplinas na página
    exibirDisciplinas();
    // Adiciona eventos aos botões novamente
    setTimeout(function() {
      adicionarEventosBotoes();
    }, 100);
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para exibir disciplinas agrupadas por instituição e curso
function exibirDisciplinas() {
  var container = document.getElementById('listadisciplina');
  container.innerHTML = '';

  // Pega os templates
  var templateInstituicao = document.getElementById('templateInstituicao');
  var templateCurso = document.getElementById('templateCurso');
  var templateDisciplina = document.getElementById('templateDisciplina');

  // Cria uma estrutura simples para exibir todas as disciplinas
  var instituicaoElement = templateInstituicao.content.cloneNode(true);
  instituicaoElement.querySelector('.nome-instituicao').textContent = 'Todas as Disciplinas';
  var cursosContainer = instituicaoElement.querySelector('.cursos-container');

  var cursoElement = templateCurso.content.cloneNode(true);
  cursoElement.querySelector('.nome-curso').textContent = 'Disciplinas Cadastradas';
  var tbody = cursoElement.querySelector('tbody');

  for (var i = 0; i < disciplinas.length; i++) {
    var disciplina = disciplinas[i];
    var disciplinaElement = templateDisciplina.content.cloneNode(true);
    
    disciplinaElement.querySelector('.codigo').textContent = disciplina.codigo || '-';
    disciplinaElement.querySelector('.nome').textContent = disciplina.nome;
    disciplinaElement.querySelector('.sigla').textContent = disciplina.sigla || '-';
    disciplinaElement.querySelector('.periodo').textContent = disciplina.periodo || '-';
    
    var btnEditar = disciplinaElement.querySelector('.btn-outline-warning');
    var btnExcluir = disciplinaElement.querySelector('.btn-excluir');
    btnEditar.setAttribute('data-disciplina-id', disciplina.id);
    btnExcluir.setAttribute('data-disciplina-id', disciplina.id);
    
    tbody.appendChild(disciplinaElement);
  }

  cursosContainer.appendChild(cursoElement);
  container.appendChild(instituicaoElement);
}

// Função para criar uma nova disciplina
function criarDisciplina() {
  var inputNome = document.getElementById('inputNovaDisciplina');
  var inputSigla = document.getElementById('inputSiglaDisciplina');
  var inputCodigo = document.getElementById('inputCodigoDisciplina');
  var inputPeriodo = document.getElementById('periodo');
  
  var nome = inputNome.value.trim();
  var sigla = inputSigla.value.trim();
  var codigo = inputCodigo.value.trim();
  var periodo = inputPeriodo.value.trim();

  esconderAlertas();

  if (nome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método POST para criar
  xhr.open('POST', '/api/disciplinas', true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      mostrarAlerta('alertCampos');
      return;
    }

    mostrarAlerta('alertSucesso');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaDisciplina'));
    modal.hide();
    
    document.getElementById('formNovaDisciplina').reset();
    
    setTimeout(function() {
      carregarDisciplinas();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = { 
    nome: nome,
    sigla: sigla,
    codigo: codigo,
    periodo: periodo
  };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para abrir modal de editar
function abrirModalEditar(disciplinaId) {
  var disciplina = null;
  for (var i = 0; i < disciplinas.length; i++) {
    if (disciplinas[i].id == disciplinaId) {
      disciplina = disciplinas[i];
      break;
    }
  }

  if (!disciplina) return;

  disciplinaEditando = disciplinaId;
  document.getElementById('inputNomeEditar').value = disciplina.nome || '';
  document.getElementById('inputSiglaEditar').value = disciplina.sigla || '';
  document.getElementById('inputCodigoEditar').value = disciplina.codigo || '';
  document.getElementById('inputPeriodoEditar').value = disciplina.periodo || '';
  document.getElementById('inputFormulaNotaFinal').value = disciplina.formula_nota_final || '';
  
  var modal = new bootstrap.Modal(document.getElementById('modalEditarDisciplinas'));
  modal.show();
}

// Função para salvar edição
function salvarEdicaoDisciplina() {
  var inputNome = document.getElementById('inputNomeEditar');
  var inputSigla = document.getElementById('inputSiglaEditar');
  var inputCodigo = document.getElementById('inputCodigoEditar');
  var inputPeriodo = document.getElementById('inputPeriodoEditar');
  var inputFormula = document.getElementById('inputFormulaNotaFinal');
  
  var novoNome = inputNome.value.trim();
  var novaSigla = inputSigla.value.trim();
  var novoCodigo = inputCodigo.value.trim();
  var novoPeriodo = inputPeriodo.value.trim();
  var novaFormula = inputFormula.value.trim();

  if (novoNome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método PUT para atualizar
  xhr.open('PUT', '/api/disciplinas/' + disciplinaEditando, true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      mostrarAlerta('alertCampos');
      return;
    }

    mostrarAlerta('alertSucesso');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarDisciplinas'));
    modal.hide();
    
    setTimeout(function() {
      carregarDisciplinas();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = { 
    nome: novoNome,
    sigla: novaSigla,
    codigo: novoCodigo,
    periodo: novoPeriodo,
    formula_nota_final: novaFormula || null
  };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para excluir disciplina
function excluirDisciplina(disciplinaId) {
  if (!confirm('Tem certeza que deseja excluir esta disciplina?')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir
  xhr.open('DELETE', '/api/disciplinas/' + disciplinaId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir disciplina: ' + resposta.error);
      return;
    }

    carregarDisciplinas();
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir disciplina');
  };
  
  // Envia a requisição
  xhr.send();
}

// Funções auxiliares para alertas
function esconderAlertas() {
  document.getElementById('alertDuplicada').classList.add('d-none');
  document.getElementById('alertCampos').classList.add('d-none');
  document.getElementById('alertSucesso').classList.add('d-none');
}

function mostrarAlerta(idAlerta) {
  esconderAlertas();
  document.getElementById(idAlerta).classList.remove('d-none');
  
  if (idAlerta === 'alertSucesso') {
    setTimeout(function() {
      document.getElementById(idAlerta).classList.add('d-none');
    }, 3000);
  }
}
