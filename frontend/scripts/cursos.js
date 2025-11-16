// Autor: Cadu Spadari
// Script para gerenciar cursos (listar, criar, editar, excluir)

// Variáveis globais para armazenar dados
var cursos = [];
var instituicoes = [];
var cursoEditando = null;

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Carrega as instituições e cursos quando a página carrega
  carregarInstituicoes();
  carregarCursos();

  // Pega o formulário de novo curso
  var formNovoCurso = document.getElementById('formNovoCurso');
  formNovoCurso.onsubmit = function(e) {
    e.preventDefault();
    criarCurso();
  };

  // Pega o formulário de editar curso
  var formEditarCurso = document.getElementById('formEditarCurso');
  formEditarCurso.onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoCurso();
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
        var cursoId = this.getAttribute('data-curso-id');
        abrirModalEditar(cursoId);
      };
    }
  }
  
  // Pega todos os botões de excluir
  var botoesExcluir = document.querySelectorAll('.btn-excluir');
  for (var i = 0; i < botoesExcluir.length; i++) {
    var btn = botoesExcluir[i];
    btn.onclick = function() {
      var cursoId = this.getAttribute('data-curso-id');
      excluirCurso(cursoId);
    };
  }
}

// Função para carregar as instituições do servidor
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

// Função para preencher o select de instituições no modal
function preencherSelectInstituicoes() {
  var select = document.getElementById('selectCurso');
  // Limpa as opções existentes
  select.innerHTML = '<option value="" selected disabled>Instituições cadastradas</option>';
  
  // Adiciona cada instituição como opção
  for (var i = 0; i < instituicoes.length; i++) {
    var option = document.createElement('option');
    option.value = instituicoes[i].id;
    option.textContent = instituicoes[i].nome;
    select.appendChild(option);
  }
}

// Função para carregar os cursos do servidor
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
    // Exibe os cursos na página
    exibirCursos();
    // Adiciona eventos aos botões novamente
    setTimeout(function() {
      adicionarEventosBotoes();
    }, 100);
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar cursos');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para exibir os cursos agrupados por instituição
function exibirCursos() {
  var container = document.getElementById('listacurso');
  container.innerHTML = '';

  // Agrupa os cursos por instituição
  var cursosPorInstituicao = {};
  for (var i = 0; i < cursos.length; i++) {
    var curso = cursos[i];
    var instituicaoId = curso.instituicao_id;
    
    if (!cursosPorInstituicao[instituicaoId]) {
      cursosPorInstituicao[instituicaoId] = {
        nome: curso.instituicao_nome,
        cursos: []
      };
    }
    cursosPorInstituicao[instituicaoId].cursos.push(curso);
  }

  // Pega o template de instituição
  var templateInstituicao = document.getElementById('templateInstituicao');
  var templateCurso = document.getElementById('templateCurso');

  // Para cada instituição, cria um container
  for (var instituicaoId in cursosPorInstituicao) {
    var dados = cursosPorInstituicao[instituicaoId];
    
    // Clona o template de instituição
    var instituicaoElement = templateInstituicao.content.cloneNode(true);
    instituicaoElement.querySelector('.nome-instituicao').textContent = dados.nome;
    var cursosContainer = instituicaoElement.querySelector('.cursos-container');

    // Para cada curso, cria um card
    for (var j = 0; j < dados.cursos.length; j++) {
      var curso = dados.cursos[j];
      
      // Clona o template de curso
      var cursoElement = templateCurso.content.cloneNode(true);
      cursoElement.querySelector('.nome-curso').textContent = curso.nome;
      
      // Adiciona os IDs aos botões
      var btnEditar = cursoElement.querySelector('.btn-outline-warning');
      var btnExcluir = cursoElement.querySelector('.btn-excluir');
      btnEditar.setAttribute('data-curso-id', curso.id);
      btnExcluir.setAttribute('data-curso-id', curso.id);
      
      cursosContainer.appendChild(cursoElement);
    }

    container.appendChild(instituicaoElement);
  }
}

// Função para criar um novo curso
function criarCurso() {
  var selectInstituicao = document.getElementById('selectCurso');
  var inputNome = document.getElementById('inputNovoCurso');
  
  var instituicaoId = selectInstituicao.value;
  var nome = inputNome.value.trim();

  // Esconde os alertas
  esconderAlertas();

  // Valida os campos
  if (instituicaoId === '' || nome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método POST para criar
  xhr.open('POST', '/api/cursos', true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      if (resposta.error.indexOf('já cadastrado') !== -1) {
        mostrarAlerta('alertDuplicada');
      } else {
        mostrarAlerta('alertCampos');
      }
      return;
    }

    // Se deu certo, mostra o alerta de sucesso
    mostrarAlerta('alertSucesso');
    
    // Fecha o modal
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoCurso'));
    modal.hide();
    
    // Limpa o formulário
    document.getElementById('formNovoCurso').reset();
    
    // Recarrega os cursos
    setTimeout(function() {
      carregarCursos();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = {
    nome: nome,
    instituicao_id: instituicaoId
  };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para abrir o modal de editar
function abrirModalEditar(cursoId) {
  // Encontra o curso pelo ID
  var curso = null;
  for (var i = 0; i < cursos.length; i++) {
    if (cursos[i].id == cursoId) {
      curso = cursos[i];
      break;
    }
  }

  if (!curso) return;

  // Salva o ID do curso que está editando
  cursoEditando = cursoId;
  
  // Preenche o campo com o nome atual
  document.getElementById('inputCursoEditar').value = curso.nome;
  
  // Abre o modal
  var modal = new bootstrap.Modal(document.getElementById('modalEditarCursos'));
  modal.show();
}

// Função para salvar a edição do curso
function salvarEdicaoCurso() {
  var novoNome = document.getElementById('inputCursoEditar').value.trim();

  if (novoNome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método PUT para atualizar
  xhr.open('PUT', '/api/cursos/' + cursoEditando, true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      mostrarAlerta('alertCampos');
      return;
    }

    // Se deu certo, mostra o alerta de sucesso
    mostrarAlerta('alertSucesso');
    
    // Fecha o modal
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarCursos'));
    modal.hide();
    
    // Recarrega os cursos
    setTimeout(function() {
      carregarCursos();
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

// Função para excluir um curso
function excluirCurso(cursoId) {
  // Pergunta se tem certeza
  if (!confirm('Tem certeza que deseja excluir este curso?')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir
  xhr.open('DELETE', '/api/cursos/' + cursoId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir curso: ' + resposta.error);
      return;
    }

    // Se deu certo, recarrega os cursos
    carregarCursos();
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir curso');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função auxiliar para esconder todos os alertas
function esconderAlertas() {
  document.getElementById('alertDuplicada').classList.add('d-none');
  document.getElementById('alertCampos').classList.add('d-none');
  document.getElementById('alertSucesso').classList.add('d-none');
}

// Função auxiliar para mostrar um alerta
function mostrarAlerta(idAlerta) {
  esconderAlertas();
  document.getElementById(idAlerta).classList.remove('d-none');
  
  // Se for sucesso, esconde após 3 segundos
  if (idAlerta === 'alertSucesso') {
    setTimeout(function() {
      document.getElementById(idAlerta).classList.add('d-none');
    }, 3000);
  }
}
