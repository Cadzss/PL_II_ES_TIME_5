// Autor: Cadu Spadari
// Script para gerenciar turmas (listar, criar, editar, excluir, alunos, disciplinas)

// Variáveis globais para armazenar dados
var turmas = [];
var instituicoes = [];
var cursos = [];
var disciplinas = [];
var turmaEditando = null;
var turmaAtualAlunos = null;
var alunoEditando = null;

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Carrega os dados quando a página carrega
  carregarInstituicoes();
  carregarCursos();
  carregarDisciplinas();
  carregarTurmas();

  // Pega o formulário de nova turma
  var formNovaTurma = document.getElementById('formNovaTurma');
  formNovaTurma.onsubmit = function(e) {
    e.preventDefault();
    criarTurma();
  };

  // Pega o formulário de editar turma
  var formEditarTurma = document.getElementById('formEditarTurma');
  formEditarTurma.onsubmit = function(e) {
    e.preventDefault();
    salvarEdicaoTurma();
  };

  // Pega o formulário de editar aluno
  var formEditarAluno = document.getElementById('formEditarAluno');
  if (formEditarAluno) {
    formEditarAluno.onsubmit = function(e) {
      e.preventDefault();
      salvarEdicaoAluno();
    };
  }

  // Adiciona eventos para os botões depois que a página carregar
  setTimeout(function() {
    adicionarEventosBotoes();
  }, 500);
};

// Função para adicionar eventos aos botões
function adicionarEventosBotoes() {
  // Pega todos os botões de editar turma
  var botoesEditar = document.querySelectorAll('.btn-outline-warning');
  for (var i = 0; i < botoesEditar.length; i++) {
    var btn = botoesEditar[i];
    if (btn.textContent.indexOf('Editar') !== -1 && btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        abrirModalEditar(turmaId);
      };
    }
  }
  
  // Pega todos os botões de excluir turma
  var botoesExcluir = document.querySelectorAll('.btn-excluir');
  for (var i = 0; i < botoesExcluir.length; i++) {
    var btn = botoesExcluir[i];
    if (btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        excluirTurma(turmaId);
      };
    }
  }

  // Pega todos os botões de ver alunos
  var botoesAlunos = document.querySelectorAll('.btn-outline-info');
  for (var i = 0; i < botoesAlunos.length; i++) {
    var btn = botoesAlunos[i];
    if (btn.textContent.indexOf('Alunos') !== -1 && btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        abrirModalAlunos(turmaId);
      };
    }
  }

  // Pega todos os botões de ver disciplinas
  var botoesDisciplinas = document.querySelectorAll('.btn-outline-secondary');
  for (var i = 0; i < botoesDisciplinas.length; i++) {
    var btn = botoesDisciplinas[i];
    if (btn.textContent.indexOf('Disciplinas') !== -1 && btn.getAttribute('data-turma-id')) {
      btn.onclick = function() {
        var turmaId = this.getAttribute('data-turma-id');
        abrirModalDisciplinas(turmaId);
      };
    }
  }

  // Pega todos os botões de editar aluno
  var botoesEditarAluno = document.querySelectorAll('.btn-editar-aluno');
  for (var i = 0; i < botoesEditarAluno.length; i++) {
    var btn = botoesEditarAluno[i];
    btn.onclick = function() {
      var alunoId = this.getAttribute('data-aluno-id');
      abrirModalEditarAluno(alunoId);
    };
  }

  // Pega todos os botões de excluir aluno
  var botoesExcluirAluno = document.querySelectorAll('.btn-excluir-aluno');
  for (var i = 0; i < botoesExcluirAluno.length; i++) {
    var btn = botoesExcluirAluno[i];
    btn.onclick = function() {
      var alunoId = this.getAttribute('data-aluno-id');
      excluirAluno(alunoId);
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

  // Quando selecionar uma instituição, atualiza os cursos
  select.onchange = function() {
    atualizarCursosPorInstituicao(this.value);
  };
}

// Função para atualizar os cursos quando selecionar uma instituição
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
    // Preenche os checkboxes de disciplinas
    preencherCheckboxesDisciplinas();
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para preencher os checkboxes de disciplinas
function preencherCheckboxesDisciplinas() {
  var container = document.getElementById('disciplinasContainer');
  container.innerHTML = '';
  
  for (var i = 0; i < disciplinas.length; i++) {
    var div = document.createElement('div');
    div.className = 'form-check';
    
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-check-input';
    input.id = 'disciplina-' + disciplinas[i].id;
    input.value = disciplinas[i].id;
    
    var label = document.createElement('label');
    label.className = 'form-check-label';
    label.htmlFor = 'disciplina-' + disciplinas[i].id;
    label.textContent = disciplinas[i].nome;
    
    div.appendChild(input);
    div.appendChild(label);
    container.appendChild(div);
  }
}

// Função para carregar turmas
function carregarTurmas() {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para a URL /api/turmas
  xhr.open('GET', '/api/turmas', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    // Converte a resposta para um objeto JavaScript
    var resposta = JSON.parse(xhr.responseText);
    // Salva as turmas na variável global
    turmas = resposta;
    // Exibe as turmas na página
    exibirTurmas();
    // Adiciona eventos aos botões novamente
    setTimeout(function() {
      adicionarEventosBotoes();
    }, 100);
  };
  
  // Se acontecer algum erro de rede
  xhr.onerror = function() {
    alert('Erro ao carregar turmas');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para exibir turmas agrupadas por instituição e curso
function exibirTurmas() {
  var container = document.getElementById('listaturmas');
  container.innerHTML = '';

  // Agrupa turmas por instituição e curso
  var turmasPorInstituicao = {};
  for (var i = 0; i < turmas.length; i++) {
    var turma = turmas[i];
    var instituicaoId = turma.instituicao_id;
    var cursoId = turma.curso_id;
    
    if (!turmasPorInstituicao[instituicaoId]) {
      turmasPorInstituicao[instituicaoId] = {
        nome: turma.instituicao_nome,
        cursos: {}
      };
    }
    
    if (!turmasPorInstituicao[instituicaoId].cursos[cursoId]) {
      turmasPorInstituicao[instituicaoId].cursos[cursoId] = {
        nome: turma.curso_nome,
        turmas: []
      };
    }
    
    turmasPorInstituicao[instituicaoId].cursos[cursoId].turmas.push(turma);
  }

  // Pega os templates
  var templateInstituicao = document.getElementById('templateInstituicao');
  var templateCurso = document.getElementById('templateCurso');

  // Para cada instituição
  for (var instituicaoId in turmasPorInstituicao) {
    var dadosInst = turmasPorInstituicao[instituicaoId];
    
    // Clona o template de instituição
    var instituicaoElement = templateInstituicao.content.cloneNode(true);
    instituicaoElement.querySelector('.nome-instituicao').textContent = dadosInst.nome;
    var cursosContainer = instituicaoElement.querySelector('.cursos-container');

    // Para cada curso
    for (var cursoId in dadosInst.cursos) {
      var dadosCurso = dadosInst.cursos[cursoId];
      
      // Clona o template de curso
      var cursoElement = templateCurso.content.cloneNode(true);
      cursoElement.querySelector('.nome-curso').textContent = dadosCurso.nome;
      var turmasList = cursoElement.querySelector('.lista-turmas');
      
      // Para cada turma
      for (var j = 0; j < dadosCurso.turmas.length; j++) {
        var turma = dadosCurso.turmas[j];
        
        // Cria um item de lista para a turma
        var li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = '<span class="turma-nome">' + turma.nome + '</span>' +
          '<div class="acoes">' +
          '<button type="button" class="btn btn-outline-info btn-sm btn-disciplinas m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-book"></i> Alunos</button>' +
          '<button type="button" class="btn btn-outline-secondary btn-sm btn-disciplinas m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-book"></i> Disciplinas Associadas</button>' +
          '<button type="button" class="btn btn-outline-warning btn-sm m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-pencil-square"></i> Editar</button>' +
          '<button type="button" class="btn btn-outline-danger btn-sm btn-excluir m-1" data-turma-id="' + turma.id + '">' +
          '<i class="bi bi-trash"></i> Excluir</button>' +
          '</div>';
        
        turmasList.appendChild(li);
      }
      
      cursosContainer.appendChild(cursoElement);
    }

    container.appendChild(instituicaoElement);
  }
}

// Função para criar uma nova turma
function criarTurma() {
  var selectInstituicao = document.getElementById('selectInstituicao');
  var selectCurso = document.getElementById('selectCurso');
  var inputNome = document.getElementById('inputNovaTurma');
  var checkboxes = document.querySelectorAll('#disciplinasContainer input[type="checkbox"]:checked');
  
  var instituicaoId = selectInstituicao.value;
  var cursoId = selectCurso.value;
  var nome = inputNome.value.trim();
  var disciplinaIds = [];
  
  for (var i = 0; i < checkboxes.length; i++) {
    disciplinaIds.push(parseInt(checkboxes[i].value));
  }

  esconderAlertas();

  if (instituicaoId === '' || cursoId === '' || nome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método POST para criar
  xhr.open('POST', '/api/turmas', true);
  
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

    mostrarAlerta('alertSucessoCadastro');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalNovaTurma'));
    modal.hide();
    
    document.getElementById('formNovaTurma').reset();
    
    setTimeout(function() {
      carregarTurmas();
    }, 500);
  };
  
  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };
  
  // Prepara os dados para enviar
  var dados = {
    nome: nome,
    curso_id: cursoId,
    disciplina_ids: disciplinaIds
  };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para abrir modal de editar
function abrirModalEditar(turmaId) {
  var turma = null;
  for (var i = 0; i < turmas.length; i++) {
    if (turmas[i].id == turmaId) {
      turma = turmas[i];
      break;
    }
  }

  if (!turma) return;

  turmaEditando = turmaId;
  document.getElementById('inputNovaTurmaEditar').value = turma.nome;
  
  var modal = new bootstrap.Modal(document.getElementById('modalEditarTurma'));
  modal.show();
}

// Função para salvar edição
function salvarEdicaoTurma() {
  var novoNome = document.getElementById('inputNovaTurmaEditar').value.trim();

  if (novoNome === '') {
    mostrarAlerta('alertCampos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método PUT para atualizar
  xhr.open('PUT', '/api/turmas/' + turmaEditando, true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      mostrarAlerta('alertCampos');
      return;
    }

    mostrarAlerta('alertSucessoEdicao');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarTurma'));
    modal.hide();
    
    setTimeout(function() {
      carregarTurmas();
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

// Função para excluir turma
function excluirTurma(turmaId) {
  if (!confirm('Tem certeza que deseja excluir esta turma?')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir
  xhr.open('DELETE', '/api/turmas/' + turmaId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir turma: ' + resposta.error);
      return;
    }

    mostrarAlerta('alertSucessoExclusao');
    carregarTurmas();
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir turma');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para abrir modal de alunos
function abrirModalAlunos(turmaId) {
  turmaAtualAlunos = turmaId;
  
  // Encontra o nome da turma
  var turma = null;
  for (var i = 0; i < turmas.length; i++) {
    if (turmas[i].id == turmaId) {
      turma = turmas[i];
      break;
    }
  }
  
  if (turma) {
    document.getElementById('va-turma-nome').textContent = turma.nome;
  }
  
  // Adiciona evento ao formulário de importar alunos quando o modal abrir
  var formImportarAlunos = document.getElementById('formImportarAlunos');
  if (formImportarAlunos) {
    formImportarAlunos.onsubmit = function(e) {
      e.preventDefault();
      importarAlunosCSV();
    };
  }
  
  // Atualiza o botão de adicionar aluno para apontar para a turma correta
  var btnAdicionarAluno = document.getElementById('btnAdicionarAluno');
  if (btnAdicionarAluno) {
    btnAdicionarAluno.setAttribute('data-turma-id', turmaId);
  }
  
  carregarAlunosTurma(turmaId);
  
  var modal = new bootstrap.Modal(document.getElementById('modalVerAlunos'));
  modal.show();
}

// Função para carregar alunos da turma
function carregarAlunosTurma(turmaId) {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para buscar alunos da turma
  xhr.open('GET', '/api/turmas/' + turmaId + '/alunos', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    var lista = document.getElementById('va-lista-alunos');
    lista.innerHTML = '';
    
    if (resposta.length === 0) {
      document.getElementById('va-empty').classList.remove('d-none');
    } else {
      document.getElementById('va-empty').classList.add('d-none');
      
      for (var i = 0; i < resposta.length; i++) {
        var aluno = resposta[i];
        var li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = '<div><strong class="aluno-nome">' + aluno.nome + '</strong><br><small class="text-muted aluno-matricula">' + aluno.identificador + '</small></div>' +
          '<div class="d-flex gap-2">' +
          '<button class="btn btn-sm btn-warning btn-editar-aluno" data-aluno-id="' + aluno.id + '" data-bs-toggle="modal" data-bs-target="#modalEditarAluno">' +
          '<i class="bi bi-pencil-square"></i></button>' +
          '<button class="btn btn-sm btn-danger btn-excluir-aluno" data-aluno-id="' + aluno.id + '">' +
          '<i class="bi bi-trash"></i></button>' +
          '</div>';
        lista.appendChild(li);
      }
      
      // Adiciona eventos aos botões novamente
      setTimeout(function() {
        adicionarEventosBotoes();
      }, 100);
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar alunos');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para abrir modal de disciplinas
function abrirModalDisciplinas(turmaId) {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para buscar disciplinas da turma
  xhr.open('GET', '/api/turmas/' + turmaId + '/disciplinas', true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    var lista = document.getElementById('vd-lista-disciplinas');
    lista.innerHTML = '';
    
    // Encontra o nome da turma
    var turma = null;
    for (var i = 0; i < turmas.length; i++) {
      if (turmas[i].id == turmaId) {
        turma = turmas[i];
        break;
      }
    }
    
    if (turma) {
      document.getElementById('vd-turma-nome').textContent = turma.nome;
    }
    
    if (resposta.length === 0) {
      document.getElementById('vd-empty').classList.remove('d-none');
    } else {
      document.getElementById('vd-empty').classList.add('d-none');
      
      for (var i = 0; i < resposta.length; i++) {
        var disciplina = resposta[i];
        var li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = disciplina.nome;
        lista.appendChild(li);
      }
    }
    
    var modal = new bootstrap.Modal(document.getElementById('modalVerDisciplinas'));
    modal.show();
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para importar alunos via CSV
function importarAlunosCSV() {
  var inputFile = document.getElementById('inputCsvAlunos');
  var file = inputFile.files[0];

  if (!file) {
    alert('Selecione um arquivo CSV');
    return;
  }

  // Lê o arquivo CSV
  var reader = new FileReader();
  reader.onload = function(e) {
    var texto = e.target.result;
    var linhas = texto.split('\n');
    var alunos = [];

    // Processa cada linha do CSV
    for (var i = 0; i < linhas.length; i++) {
      var linha = linhas[i].trim();
      if (linha === '') continue; // Pula linhas vazias

      // Divide a linha por vírgula ou ponto e vírgula
      var colunas = linha.split(/[,;]/);
      if (colunas.length >= 2) {
        alunos.push({
          identificador: colunas[0].trim(),
          nome: colunas[1].trim()
        });
      }
    }

    if (alunos.length === 0) {
      alert('Nenhum aluno válido encontrado no arquivo CSV');
      return;
    }

    // Cria um objeto para fazer requisição HTTP
    var xhr = new XMLHttpRequest();
    
    // Configura a requisição: método POST para importar alunos
    xhr.open('POST', '/api/alunos/importar', true);
    
    // Define que vamos enviar dados em formato JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Quando a requisição terminar, executa esta função
    xhr.onload = function() {
      var resposta = JSON.parse(xhr.responseText);
      
      if (resposta.error) {
        alert('Erro ao importar alunos: ' + resposta.error);
        return;
      }

      // Mostra mensagem de sucesso
      mostrarAlerta('alertSucessoAluno');
      
      // Fecha o modal
      var modal = bootstrap.Modal.getInstance(document.getElementById('modalImportarAlunos'));
      modal.hide();
      
      // Limpa o formulário
      document.getElementById('formImportarAlunos').reset();
      
      // Recarrega os alunos
      if (turmaAtualAlunos) {
        carregarAlunosTurma(turmaAtualAlunos);
      }
    };
    
    xhr.onerror = function() {
      alert('Erro ao importar alunos');
    };
    
    // Prepara os dados para enviar
    var dados = {
      alunos: alunos,
      turma_id: turmaAtualAlunos
    };
    
    // Envia a requisição
    xhr.send(JSON.stringify(dados));
  };

  reader.readAsText(file);
}

// Função para abrir modal de editar aluno
function abrirModalEditarAluno(alunoId) {
  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método GET para buscar o aluno
  xhr.open('GET', '/api/alunos/' + alunoId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao carregar aluno');
      return;
    }

    alunoEditando = alunoId;
    document.getElementById('editarAlunoId').value = resposta.identificador;
    document.getElementById('editarAlunoNome').value = resposta.nome;
    
    var modal = new bootstrap.Modal(document.getElementById('modalEditarAluno'));
    modal.show();
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar aluno');
  };
  
  // Envia a requisição
  xhr.send();
}

// Função para salvar edição de aluno
function salvarEdicaoAluno() {
  var identificador = document.getElementById('editarAlunoId').value.trim();
  var nome = document.getElementById('editarAlunoNome').value.trim();

  if (identificador === '' || nome === '') {
    alert('Preencha todos os campos');
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método PUT para atualizar
  xhr.open('PUT', '/api/alunos/' + alunoEditando, true);
  
  // Define que vamos enviar dados em formato JSON
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao editar aluno: ' + resposta.error);
      return;
    }

    // Fecha o modal
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarAluno'));
    modal.hide();
    
    // Recarrega os alunos
    if (turmaAtualAlunos) {
      carregarAlunosTurma(turmaAtualAlunos);
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao editar aluno');
  };
  
  // Prepara os dados para enviar
  var dados = {
    identificador: identificador,
    nome: nome
  };
  
  // Envia a requisição
  xhr.send(JSON.stringify(dados));
}

// Função para excluir aluno
function excluirAluno(alunoId) {
  if (!confirm('Tem certeza que deseja excluir este aluno?')) {
    return;
  }

  // Cria um objeto para fazer requisição HTTP
  var xhr = new XMLHttpRequest();
  
  // Configura a requisição: método DELETE para excluir
  xhr.open('DELETE', '/api/alunos/' + alunoId, true);
  
  // Quando a requisição terminar, executa esta função
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      alert('Erro ao excluir aluno: ' + resposta.error);
      return;
    }

    // Recarrega os alunos
    if (turmaAtualAlunos) {
      carregarAlunosTurma(turmaAtualAlunos);
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir aluno');
  };
  
  // Envia a requisição
  xhr.send();
}

// Funções auxiliares para alertas
function esconderAlertas() {
  var alertas = ['alertDuplicada', 'alertCampos', 'alertSucessoCadastro', 'alertSucessoExclusao', 'alertSucessoEdicao', 'alertSucessoAluno'];
  for (var i = 0; i < alertas.length; i++) {
    var elemento = document.getElementById(alertas[i]);
    if (elemento) {
      elemento.classList.add('d-none');
    }
  }
}

function mostrarAlerta(idAlerta) {
  esconderAlertas();
  var elemento = document.getElementById(idAlerta);
  if (elemento) {
    elemento.classList.remove('d-none');
    if (idAlerta.indexOf('Sucesso') !== -1) {
      setTimeout(function() {
        elemento.classList.add('d-none');
      }, 3000);
    }
  }
}
