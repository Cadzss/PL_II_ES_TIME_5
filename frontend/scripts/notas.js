// Autor: Laura Lugli
// Script para gerenciar notas (listar, criar, editar)

// Variáveis globais para armazenar dados
var turmas = [];
var disciplinas = [];
var alunos = [];
var turmaSelecionada = null;
var disciplinaSelecionada = null;
var notaEditando = null;

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Carrega os dados quando a página carrega
  carregarTurmas();
  carregarDisciplinas();

  // Pega o botão de carregar alunos
  var btnCarregarAlunos = document.getElementById('btnCarregarAlunos');
  btnCarregarAlunos.onclick = function() {
    carregarAlunosComNotas();
  };

  // Pega o formulário de editar nota
  var formEditarNota = document.getElementById('formEditarNota');
  formEditarNota.onsubmit = function(e) {
    e.preventDefault();
    salvarNota();
  };

  // Quando selecionar uma turma, atualiza as disciplinas
  var selectTurma = document.getElementById('selectTurmaNotas');
  selectTurma.onchange = function() {
    turmaSelecionada = this.value;
    atualizarDisciplinasPorTurma();
  };

  // Quando selecionar uma disciplina
  var selectDisciplina = document.getElementById('selectDisciplinaNotas');
  selectDisciplina.onchange = function() {
    disciplinaSelecionada = this.value;
  };
};

// Função para carregar turmas
function carregarTurmas() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/turmas', true);
  
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    turmas = resposta;
    preencherSelectTurmas();
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar turmas');
  };
  
  xhr.send();
}

// Função para preencher o select de turmas
function preencherSelectTurmas() {
  var select = document.getElementById('selectTurmaNotas');
  select.innerHTML = '<option value="" selected disabled>Turmas cadastradas</option>';
  
  for (var i = 0; i < turmas.length; i++) {
    var option = document.createElement('option');
    option.value = turmas[i].id;
    option.textContent = turmas[i].nome + ' - ' + turmas[i].curso_nome;
    select.appendChild(option);
  }
}

// Função para carregar disciplinas
function carregarDisciplinas() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/disciplinas', true);
  
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    disciplinas = resposta;
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  xhr.send();
}

// Função para atualizar disciplinas quando selecionar uma turma
function atualizarDisciplinasPorTurma() {
  if (!turmaSelecionada) {
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/turmas/' + turmaSelecionada + '/disciplinas', true);
  
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    var selectDisciplina = document.getElementById('selectDisciplinaNotas');
    selectDisciplina.innerHTML = '<option value="" selected disabled>Disciplinas da turma</option>';
    
    for (var i = 0; i < resposta.length; i++) {
      var option = document.createElement('option');
      option.value = resposta[i].id;
      option.textContent = resposta[i].nome;
      selectDisciplina.appendChild(option);
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas da turma');
  };
  
  xhr.send();
}

// Função para carregar alunos com notas
function carregarAlunosComNotas() {
  var selectTurma = document.getElementById('selectTurmaNotas');
  var selectDisciplina = document.getElementById('selectDisciplinaNotas');
  
  turmaSelecionada = selectTurma.value;
  disciplinaSelecionada = selectDisciplina.value;

  if (!turmaSelecionada || !disciplinaSelecionada) {
    mostrarAlerta('alertCampos');
    return;
  }

  esconderAlertas();

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/notas/alunos?turma_id=' + turmaSelecionada + '&disciplina_id=' + disciplinaSelecionada, true);
  
  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    alunos = resposta;
    exibirAlunosComNotas();
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar alunos');
  };
  
  xhr.send();
}

// Função para exibir alunos com notas na tabela
function exibirAlunosComNotas() {
  var tbody = document.getElementById('tabelaNotas');
  tbody.innerHTML = '';

  if (alunos.length === 0) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" class="text-center text-muted">Nenhum aluno encontrado nesta turma</td>';
    tbody.appendChild(tr);
    return;
  }

  for (var i = 0; i < alunos.length; i++) {
    var aluno = alunos[i];
    var tr = document.createElement('tr');
    
    var nota = aluno.nota !== null && aluno.nota !== undefined ? aluno.nota.toFixed(1) : '-';
    var corNota = '';
    if (aluno.nota !== null && aluno.nota !== undefined) {
      if (aluno.nota >= 7) {
        corNota = 'text-success';
      } else if (aluno.nota >= 5) {
        corNota = 'text-warning';
      } else {
        corNota = 'text-danger';
      }
    }

    tr.innerHTML = 
      '<td>' + aluno.identificador + '</td>' +
      '<td>' + aluno.nome + '</td>' +
      '<td class="' + corNota + ' fw-bold">' + nota + '</td>' +
      '<td>' +
        '<button type="button" class="btn btn-outline-primary btn-sm btn-editar-nota" data-aluno-id="' + aluno.aluno_id + '" data-nota-id="' + (aluno.nota_id || '') + '">' +
          '<i class="bi bi-pencil-square"></i> Editar' +
        '</button>' +
      '</td>';
    
    tbody.appendChild(tr);
  }

  // Adiciona eventos aos botões de editar
  setTimeout(function() {
    adicionarEventosBotoesEditar();
  }, 100);
}

// Função para adicionar eventos aos botões de editar
function adicionarEventosBotoesEditar() {
  var botoes = document.querySelectorAll('.btn-editar-nota');
  for (var i = 0; i < botoes.length; i++) {
    var btn = botoes[i];
    btn.onclick = function() {
      var alunoId = this.getAttribute('data-aluno-id');
      var notaId = this.getAttribute('data-nota-id');
      abrirModalEditarNota(alunoId, notaId);
    };
  }
}

// Função para abrir modal de editar nota
function abrirModalEditarNota(alunoId, notaId) {
  var aluno = null;
  for (var i = 0; i < alunos.length; i++) {
    if (alunos[i].aluno_id == alunoId) {
      aluno = alunos[i];
      break;
    }
  }

  if (!aluno) return;

  notaEditando = {
    aluno_id: alunoId,
    nota_id: notaId
  };

  document.getElementById('inputNomeAlunoNota').value = aluno.nome;
  document.getElementById('inputNota').value = aluno.nota !== null && aluno.nota !== undefined ? aluno.nota : '';

  var modal = new bootstrap.Modal(document.getElementById('modalEditarNota'));
  modal.show();
}

// Função para salvar nota
function salvarNota() {
  var inputNota = document.getElementById('inputNota');
  var nota = parseFloat(inputNota.value);

  if (isNaN(nota) || nota < 0 || nota > 10) {
    mostrarAlerta('alertCampos');
    return;
  }

  esconderAlertas();

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/notas', true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onload = function() {
    var resposta = JSON.parse(xhr.responseText);
    
    if (resposta.error) {
      mostrarAlerta('alertCampos');
      return;
    }

    mostrarAlerta('alertSucesso');
    
    var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarNota'));
    modal.hide();
    
    // Recarrega a lista de alunos com notas
    carregarAlunosComNotas();
  };

  xhr.onerror = function() {
    mostrarAlerta('alertCampos');
  };

  var dados = {
    turma_id: turmaSelecionada,
    disciplina_id: disciplinaSelecionada,
    aluno_id: notaEditando.aluno_id,
    nota: nota
  };

  xhr.send(JSON.stringify(dados));
}

// Funções auxiliares para alertas
function esconderAlertas() {
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

