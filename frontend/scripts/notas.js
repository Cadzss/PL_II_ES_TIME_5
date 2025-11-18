// Autor: Cadu Spadari
// Script para gerenciar notas com componentes (P1, P2, P3, etc.)

// Variáveis globais
var turmas = [];
var disciplinas = [];
var componentes = [];
var quadroNotas = null;
var disciplinaAtual = null;
var turmaAtual = null;
var notaEditando = null;
var componenteEditando = null;

// Quando a página terminar de carregar
window.onload = function() {
  carregarTurmas();

  // Eventos dos selects
  var selectTurma = document.getElementById('selectTurmaNotas');
  selectTurma.onchange = function() {
    turmaAtual = this.value;
    carregarDisciplinasPorTurma(this.value);
  };

  var selectDisciplina = document.getElementById('selectDisciplinaNotas');
  selectDisciplina.onchange = function() {
    disciplinaAtual = this.value;
  };

  // Botão carregar alunos
  var btnCarregar = document.getElementById('btnCarregarAlunos');
  btnCarregar.onclick = function() {
    if (turmaAtual && disciplinaAtual) {
      carregarQuadroNotas();
    } else {
      mostrarAlerta('alertCampos');
    }
  };

  // Botão gerenciar componentes
  var btnComponentes = document.getElementById('btnGerenciarComponentes');
  btnComponentes.onclick = function() {
    if (disciplinaAtual) {
      abrirModalComponentes();
    } else {
      alert('Selecione uma disciplina primeiro');
    }
  };

  // Botão exportar CSV
  var btnExportar = document.getElementById('btnExportarCSV');
  btnExportar.onclick = function() {
    exportarCSV();
  };

  // Formulário de componente
  var formComponente = document.getElementById('formComponente');
  formComponente.onsubmit = function(e) {
    e.preventDefault();
    criarComponente();
  };

  // Formulário de editar nota
  var formEditarNota = document.getElementById('formEditarNota');
  formEditarNota.onsubmit = function(e) {
    e.preventDefault();
    salvarNota();
  };
};

// Carrega todas as turmas
function carregarTurmas() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/turmas', true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      turmas = JSON.parse(xhr.responseText);
      preencherSelectTurmas();
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar turmas');
  };
  
  xhr.send();
}

// Preenche o select de turmas
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

// Carrega disciplinas de uma turma
function carregarDisciplinasPorTurma(turmaId) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/turmas/' + turmaId + '/disciplinas', true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      disciplinas = JSON.parse(xhr.responseText);
      preencherSelectDisciplinas();
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar disciplinas');
  };
  
  xhr.send();
}

// Preenche o select de disciplinas
function preencherSelectDisciplinas() {
  var select = document.getElementById('selectDisciplinaNotas');
  select.innerHTML = '<option value="" selected disabled>Disciplinas da turma</option>';
  
  for (var i = 0; i < disciplinas.length; i++) {
    var option = document.createElement('option');
    option.value = disciplinas[i].id;
    option.textContent = disciplinas[i].nome;
    select.appendChild(option);
  }
}

// Carrega o quadro completo de notas
function carregarQuadroNotas() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/notas/quadro/' + turmaAtual + '/' + disciplinaAtual, true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      quadroNotas = JSON.parse(xhr.responseText);
      componentes = quadroNotas.componentes;
      carregarComponentesDisciplina();
      exibirQuadroNotas();
      verificarFormulaNotaFinal();
    } else {
      alert('Erro ao carregar notas');
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao carregar notas');
  };
  
  xhr.send();
}

// Carrega componentes da disciplina
function carregarComponentesDisciplina() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/componentes/' + disciplinaAtual, true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      componentes = JSON.parse(xhr.responseText);
      if (componentes.length === 0) {
        document.getElementById('alertSemComponentes').classList.remove('d-none');
      } else {
        document.getElementById('alertSemComponentes').classList.add('d-none');
      }
    }
  };
  
  xhr.send();
}

// Carrega fórmula de nota final da disciplina
function verificarFormulaNotaFinal() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/disciplinas/' + disciplinaAtual, true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      var disciplina = JSON.parse(xhr.responseText);
      if (disciplina.formula_nota_final) {
        document.getElementById('colNotaFinal').style.display = '';
        calcularNotasFinais(disciplina.formula_nota_final);
      } else {
        document.getElementById('colNotaFinal').style.display = 'none';
      }
    }
  };
  
  xhr.send();
}

// Calcula notas finais baseado na fórmula
function calcularNotasFinais(formula) {
  if (!quadroNotas || !quadroNotas.alunos) return;

  for (var i = 0; i < quadroNotas.alunos.length; i++) {
    var aluno = quadroNotas.alunos[i];
    var notaFinal = calcularFormula(formula, aluno.notas);
    aluno.nota_final = notaFinal;
  }
  
  exibirQuadroNotas();
}

// Calcula uma fórmula matemática substituindo siglas por valores
function calcularFormula(formula, notas) {
  try {
    // Cria uma cópia da fórmula
    var formulaCalculo = formula;
    
    // Substitui cada sigla pelo valor da nota
    for (var sigla in notas) {
      var valor = notas[sigla];
      if (valor === null || valor === undefined) {
        return null; // Se alguma nota estiver faltando, retorna null
      }
      // Substitui a sigla pelo valor (ex: P1 -> 8.5)
      var regex = new RegExp('\\b' + sigla + '\\b', 'g');
      formulaCalculo = formulaCalculo.replace(regex, valor);
    }
    
    // Avalia a fórmula (cuidado: usar eval pode ser perigoso, mas para este caso está OK)
    var resultado = eval(formulaCalculo);
    
    // Arredonda para 2 casas decimais
    return Math.round(resultado * 100) / 100;
  } catch (e) {
    return null;
  }
}

// Exibe o quadro de notas na tabela
function exibirQuadroNotas() {
  var thead = document.getElementById('theadNotas');
  var tbody = document.getElementById('tbodyNotas');
  
  // Limpa a tabela
  thead.innerHTML = '';
  tbody.innerHTML = '';
  
  if (!quadroNotas || !quadroNotas.alunos || quadroNotas.alunos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Nenhum aluno encontrado nesta turma</td></tr>';
    return;
  }
  
  if (componentes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Nenhum componente de nota cadastrado</td></tr>';
    return;
  }
  
  // Cria o cabeçalho
  var trHead = document.createElement('tr');
  trHead.innerHTML = '<th>Matrícula</th><th>Nome do Aluno</th>';
  
  // Adiciona colunas para cada componente
  for (var i = 0; i < componentes.length; i++) {
    var th = document.createElement('th');
    th.textContent = componentes[i].sigla;
    th.title = componentes[i].nome;
    trHead.appendChild(th);
  }
  
  // Adiciona coluna de nota final se houver fórmula
  var disciplina = null;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/disciplinas/' + disciplinaAtual, false); // false = síncrono
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      disciplina = JSON.parse(xhr.responseText);
    }
  };
  xhr.send();
  
  if (disciplina && disciplina.formula_nota_final) {
    var thFinal = document.createElement('th');
    thFinal.textContent = 'Nota Final';
    trHead.appendChild(thFinal);
  }
  
  thead.appendChild(trHead);
  
  // Cria as linhas dos alunos
  for (var j = 0; j < quadroNotas.alunos.length; j++) {
    var aluno = quadroNotas.alunos[j];
    var tr = document.createElement('tr');
    
    // Matrícula
    var tdMatricula = document.createElement('td');
    tdMatricula.textContent = aluno.identificador;
    tr.appendChild(tdMatricula);
    
    // Nome
    var tdNome = document.createElement('td');
    tdNome.textContent = aluno.nome;
    tr.appendChild(tdNome);
    
    // Notas de cada componente
    for (var k = 0; k < componentes.length; k++) {
      var componente = componentes[k];
      var tdNota = document.createElement('td');
      
      var nota = aluno.notas[componente.sigla];
      if (nota !== null && nota !== undefined) {
        tdNota.textContent = nota.toFixed(2);
        tdNota.className = 'text-center';
      } else {
        tdNota.textContent = '-';
        tdNota.className = 'text-center text-muted';
      }
      
      // Adiciona botão de editar
      var btnEditar = document.createElement('button');
      btnEditar.className = 'btn btn-sm btn-outline-primary ms-2';
      btnEditar.innerHTML = '<i class="bi bi-pencil"></i>';
      btnEditar.onclick = function(alunoId, componenteId, componenteSigla, componenteNome, alunoNome, notaAtual) {
        return function() {
          abrirModalEditarNota(alunoId, componenteId, componenteSigla, componenteNome, alunoNome, notaAtual);
        };
      }(aluno.aluno_id, componente.id, componente.sigla, componente.nome, aluno.nome, nota);
      
      tdNota.appendChild(btnEditar);
      tr.appendChild(tdNota);
    }
    
    // Nota final (se houver fórmula)
    if (disciplina && disciplina.formula_nota_final) {
      var tdFinal = document.createElement('td');
      tdFinal.className = 'text-center fw-bold';
      if (aluno.nota_final !== null && aluno.nota_final !== undefined) {
        tdFinal.textContent = aluno.nota_final.toFixed(2);
      } else {
        tdFinal.textContent = '-';
        tdFinal.className = 'text-center text-muted';
      }
      tr.appendChild(tdFinal);
    }
    
    tbody.appendChild(tr);
  }
  
  // Mostra botão de exportar
  document.getElementById('btnExportarCSV').style.display = 'inline-block';
}

// Abre modal para editar nota
function abrirModalEditarNota(alunoId, componenteId, componenteSigla, componenteNome, alunoNome, notaAtual) {
  notaEditando = {
    aluno_id: alunoId,
    componente_id: componenteId
  };
  
  document.getElementById('inputNomeAlunoNota').value = alunoNome;
  document.getElementById('inputComponenteNota').value = componenteSigla + ' - ' + componenteNome;
  document.getElementById('inputNota').value = notaAtual !== null && notaAtual !== undefined ? notaAtual : '';
  
  var modal = new bootstrap.Modal(document.getElementById('modalEditarNota'));
  modal.show();
}

// Salva uma nota
function salvarNota() {
  if (!notaEditando) return;
  
  var nota = parseFloat(document.getElementById('inputNota').value);
  if (isNaN(nota) || nota < 0 || nota > 10) {
    alert('Nota deve ser um número entre 0 e 10');
    return;
  }
  
  var dados = {
    turma_id: turmaAtual,
    disciplina_id: disciplinaAtual,
    aluno_id: notaEditando.aluno_id,
    componente_id: notaEditando.componente_id,
    nota: nota
  };
  
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/notas', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      mostrarAlerta('alertSucesso');
      carregarQuadroNotas();
      var modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarNota'));
      modal.hide();
    } else {
      var erro = JSON.parse(xhr.responseText);
      alert('Erro: ' + (erro.error || 'Erro ao salvar nota'));
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao salvar nota');
  };
  
  xhr.send(JSON.stringify(dados));
}

// Abre modal de componentes
function abrirModalComponentes() {
  carregarListaComponentes();
  var modal = new bootstrap.Modal(document.getElementById('modalComponentes'));
  modal.show();
}

// Carrega lista de componentes
function carregarListaComponentes() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/componentes/' + disciplinaAtual, true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      componentes = JSON.parse(xhr.responseText);
      exibirListaComponentes();
    }
  };
  
  xhr.send();
}

// Exibe lista de componentes no modal
function exibirListaComponentes() {
  var tbody = document.getElementById('tbodyComponentes');
  tbody.innerHTML = '';
  
  if (componentes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum componente cadastrado</td></tr>';
    return;
  }
  
  for (var i = 0; i < componentes.length; i++) {
    var comp = componentes[i];
    var tr = document.createElement('tr');
    
    tr.innerHTML = 
      '<td>' + comp.sigla + '</td>' +
      '<td>' + comp.nome + '</td>' +
      '<td>' + (comp.descricao || '-') + '</td>' +
      '<td><button class="btn btn-sm btn-danger" onclick="excluirComponente(' + comp.id + ')"><i class="bi bi-trash"></i></button></td>';
    
    tbody.appendChild(tr);
  }
}

// Cria um novo componente
function criarComponente() {
  var sigla = document.getElementById('inputSiglaComponente').value.trim();
  var nome = document.getElementById('inputNomeComponente').value.trim();
  var descricao = document.getElementById('inputDescricaoComponente').value.trim();
  
  if (!sigla || !nome) {
    alert('Sigla e nome são obrigatórios');
    return;
  }
  
  var dados = {
    disciplina_id: disciplinaAtual,
    nome: nome,
    sigla: sigla,
    descricao: descricao || null
  };
  
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/componentes', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      document.getElementById('formComponente').reset();
      carregarListaComponentes();
      carregarQuadroNotas();
    } else {
      var erro = JSON.parse(xhr.responseText);
      alert('Erro: ' + (erro.error || 'Erro ao criar componente'));
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao criar componente');
  };
  
  xhr.send(JSON.stringify(dados));
}

// Exclui um componente
function excluirComponente(componenteId) {
  if (!confirm('Tem certeza que deseja excluir este componente? Todas as notas relacionadas serão excluídas.')) {
    return;
  }
  
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', '/api/componentes/' + componenteId, true);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      carregarListaComponentes();
      carregarQuadroNotas();
    } else {
      var erro = JSON.parse(xhr.responseText);
      alert('Erro: ' + (erro.error || 'Erro ao excluir componente'));
    }
  };
  
  xhr.onerror = function() {
    alert('Erro ao excluir componente');
  };
  
  xhr.send();
}

// Exporta notas para CSV
function exportarCSV() {
  if (!quadroNotas || !quadroNotas.alunos) {
    alert('Carregue as notas primeiro');
    return;
  }
  
  // Verifica se todas as notas estão preenchidas
  var todasPreenchidas = true;
  for (var i = 0; i < quadroNotas.alunos.length; i++) {
    var aluno = quadroNotas.alunos[i];
    for (var j = 0; j < componentes.length; j++) {
      var sigla = componentes[j].sigla;
      if (aluno.notas[sigla] === null || aluno.notas[sigla] === undefined) {
        todasPreenchidas = false;
        break;
      }
    }
    if (!todasPreenchidas) break;
  }
  
  if (!todasPreenchidas) {
    alert('Todas as notas devem estar preenchidas antes de exportar');
    return;
  }
  
  // Gera o CSV
  var csv = 'Matrícula,Nome';
  
  // Adiciona cabeçalhos dos componentes
  for (var k = 0; k < componentes.length; k++) {
    csv += ',' + componentes[k].sigla;
  }
  
  // Adiciona nota final se houver
  var disciplina = null;
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/disciplinas/' + disciplinaAtual, false);
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      disciplina = JSON.parse(xhr.responseText);
    }
  };
  xhr.send();
  
  if (disciplina && disciplina.formula_nota_final) {
    csv += ',Nota Final';
  }
  
  csv += '\n';
  
  // Adiciona dados dos alunos
  for (var l = 0; l < quadroNotas.alunos.length; l++) {
    var aluno = quadroNotas.alunos[l];
    csv += aluno.identificador + ',' + aluno.nome;
    
    // Notas dos componentes
    for (var m = 0; m < componentes.length; m++) {
      var sigla = componentes[m].sigla;
      var nota = aluno.notas[sigla];
      csv += ',' + (nota !== null && nota !== undefined ? nota.toFixed(2) : '');
    }
    
    // Nota final
    if (disciplina && disciplina.formula_nota_final) {
      csv += ',' + (aluno.nota_final !== null && aluno.nota_final !== undefined ? aluno.nota_final.toFixed(2) : '');
    }
    
    csv += '\n';
  }
  
  // Gera nome do arquivo
  var data = new Date();
  var nomeArquivo = data.getFullYear() + '-' + 
    String(data.getMonth() + 1).padStart(2, '0') + '-' + 
    String(data.getDate()).padStart(2, '0') + '_' +
    String(data.getHours()).padStart(2, '0') +
    String(data.getMinutes()).padStart(2, '0') +
    String(data.getSeconds()).padStart(2, '0') +
    String(data.getMilliseconds()).padStart(3, '0') +
    '-Turma' + turmaAtual + '_' + (disciplina ? disciplina.sigla || 'DISC' : 'DISC') + '.csv';
  
  // Cria link de download
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
}

// Funções auxiliares para alertas
function esconderAlertas() {
  var alertas = document.querySelectorAll('.alert');
  for (var i = 0; i < alertas.length; i++) {
    alertas[i].classList.add('d-none');
  }
}

function mostrarAlerta(idAlerta) {
  esconderAlertas();
  var alerta = document.getElementById(idAlerta);
  if (alerta) {
    alerta.classList.remove('d-none');
    setTimeout(function() {
      alerta.classList.add('d-none');
    }, 5000);
  }
}
