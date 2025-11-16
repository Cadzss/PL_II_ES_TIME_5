// Autor: Cadu Spadari
// Script para gerenciar instituições (listar, criar, editar, excluir)

// Variáveis globais para armazenar dados
var instituicoes = [];
var instituicaoEditando = null;

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Carrega as instituições quando a página carrega
  carregarInstituicoes();

  // Pega o formulário de nova instituição
  var formNovaInstituicao = document.getElementById('formNovaInstitucao');
  formNovaInstituicao.onsubmit = function(e) {
    e.preventDefault();
    criarInstituicao();
  };

  // Pega o formulário de editar instituição
  var formEditarInstituicao = document.getElementById('formEditarInstituicao');
  formEditarInstituicao.onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoInstituicao();
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
        var instituicaoId = this.getAttribute('data-instituicao-id');
        abrirModalEditar(instituicaoId);
      };
    }
  }
  
  // Pega todos os botões de excluir
  var botoesExcluir = document.querySelectorAll('.btn-excluir');
  for (var i = 0; i < botoesExcluir.length; i++) {
    var btn = botoesExcluir[i];
    btn.onclick = function() {
      var instituicaoId = this.getAttribute('data-instituicao-id');
      excluirInstituicao(instituicaoId);
    };
  }
}

// Função para carregar instituições do servidor
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
    // Exibe as instituições na página
    exibirInstituicoes();
    // Adiciona eventos aos botões novamente
    setTimeout(function() {
      adicionarEventosBotoes();
    }, 100);
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar instituições');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para exibir as instituições na página
function exibirInstituicoes() {
  var container = document.getElementById('listaInstituicoes');
  container.innerHTML = '';

  // Pega o template
  var template = document.getElementById('templateInstituicao');

  // Para cada instituição, cria um card
  for (var i = 0; i < instituicoes.length; i++) {
    var instituicao = instituicoes[i];
    
    // Clona o template
    var elemento = template.content.cloneNode(true);
    elemento.querySelector('.nome-instituicao').textContent = instituicao.nome;
    
    // Adiciona os IDs aos botões
    var btnEditar = elemento.querySelector('.btn-outline-warning');
    var btnExcluir = elemento.querySelector('.btn-excluir');
    btnEditar.setAttribute('data-instituicao-id', instituicao.id);
    btnExcluir.setAttribute('data-instituicao-id', instituicao.id);
    
    container.appendChild(elemento);
  }
}

// Função para criar uma nova instituição
function criarInstituicao() {
  var inputNome = document.getElementById('inputNovaInstitucao');
  var nome = inputNome.value.trim();

  esconderAlertas();

  if (nome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método POST para a URL /api/instituicoes
  xhr.open('POST', '/api/instituicoes', true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      if (resposta.error.indexOf('já cadastrada') !== -1) {
        mostrarAlerta('alertDuplicada');
      } else {
        mostrarAlerta('alertCampos');
      }
      return;
    }

    mostrarAlerta('alertSucesso');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaInstitucao'));
    modal.hide();
    
    document.getElementById('formNovaInstitucao').reset();
    
    setTimeout(function() {
      carregarInstituicoes();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = { nome: nome };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para abrir o modal de editar
function abrirModalEditar(instituicaoId) {
  var instituicao = null;
  for (var i = 0; i < instituicoes.length; i++) {
    if (instituicoes[i].id == instituicaoId) {
      instituicao = instituicoes[i];
      break;
    }
  }

  if (!instituicao) return;

  instituicaoEditando = instituicaoId;
  document.getElementById('inputInstituicaoEditar').value = instituicao.nome;
  
  var modal = new bootstrap.Modal(document.getElementById('modalEditarInstituicao'));
  modal.show();
}

// Função para salvar a edição
function salvarEdicaoInstituicao() {
  var novoNome = document.getElementById('inputInstituicaoEditar').value.trim();

  if (novoNome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método PUT para atualizar
  xhr.open('PUT', '/api/instituicoes/' + instituicaoEditando, true);
  
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
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarInstituicao'));
    modal.hide();
    
    setTimeout(function() {
      carregarInstituicoes();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = { nome: novoNome };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para excluir instituição
function excluirInstituicao(instituicaoId) {
  if (!confirm('Tem certeza que deseja excluir esta instituição? Todos os cursos e turmas associados também serão excluídos.')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir
  xhr.open('DELETE', '/api/instituicoes/' + instituicaoId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir instituição: ' + resposta.error);
      return;
    }

    carregarInstituicoes();
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir instituição');
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
