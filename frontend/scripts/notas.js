// Autor: Gemini (Adaptado de Laura Lugli e Cadu Spadari)
// Script para gerenciar notas (listar, editar, exportar CSV)
// Adaptado para o novo schema relacional com COMPONENTE_NOTA e hierarquia INSTITUICAO/CURSO.
// =================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// =================================================================
var instituicoes = [];
var cursos = [];
var turmas = [];
var disciplinas = []; // Disciplinas completas (para o filtro de exportação)
var instituicaoSelecionada = null;
var cursoSelecionado = null;
var turmaSelecionada = null;
var disciplinaSelecionada = null; // A disciplina selecionada para carregar notas.
/**
 * Objeto que armazena o contexto da nota sendo editada para a função salvarNota.
 */
var notaEditando = null;
var dadosNotas = { componentes: [], alunosComNotas: [] }; // Dados da tabela
// =================================================================
// REFERÊNCIAS DO DOM
// =================================================================
// Visualização de Notas
var selectInstituicaoNotas = document.getElementById('selectInstituicaoNotas');
var selectCursoNotas = document.getElementById('selectCursoNotas');
var selectTurmaNotas = document.getElementById('selectTurmaNotas');
var selectDisciplinaNotas = document.getElementById('selectDisciplinaNotas');
var btnCarregarAlunos = document.getElementById('btnCarregarAlunos');
// Tabela e Modais
var listaAlunosNotas = document.getElementById('listaAlunosNotas');
var tableHeadNotas = document.getElementById('tableHeadNotas');
var modalEditarNota = document.getElementById('modalEditarNota');
var formEditarNota = document.getElementById('formEditarNota');
var modalAlunoNome = document.getElementById('modalAlunoNome');
var modalComponenteNome = document.getElementById('modalComponenteNome');
var inputNota = document.getElementById('inputNota');
var alertCampos = document.getElementById('alertCampos');
var alertSucessoGeral = document.getElementById('alertSucessoGeral');
// Exportação CSV
var selectInstituicaoExport = document.getElementById('selectInstituicaoExport');
var selectCursoExport = document.getElementById('selectCursoExport');
var selectTurmaExport = document.getElementById('selectTurmaExport');
var selectDisciplinaExport = document.getElementById('selectDisciplinaExport');
var btnExportarCSV = document.getElementById('btnExportarCSV');
// =================================================================
// FUNÇÕES AUXILIARES GERAIS
// =================================================================
/**
 * Função Helper para requisições XHR.
 */
function fazerRequisicao(method, url, callback, data) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var response = JSON.parse(xhr.responseText);
                callback(response);
            }
            catch (e) {
                callback({});
            }
        }
        else {
            console.error("Erro na requisi\u00E7\u00E3o ".concat(url, ": ").concat(xhr.status, " ").concat(xhr.statusText));
            callback({ error: xhr.statusText || 'Erro desconhecido' });
        }
    };
    xhr.onerror = function () {
        console.error("Erro de rede na requisi\u00E7\u00E3o ".concat(url));
        callback({ error: 'Erro de rede' });
    };
    xhr.send(data ? JSON.stringify(data) : undefined);
}
/**
 * Esconde todos os alertas conhecidos.
 */
function esconderAlertas() {
    var alertas = [alertCampos, alertSucessoGeral];
    alertas.forEach(function (alerta) {
        if (alerta)
            alerta.classList.add('d-none');
    });
}
/**
 * Mostra um alerta específico (assume que 'alertSucessoGeral' é na página e 'alertCampos' no modal).
 */
function mostrarAlerta(idAlerta) {
    esconderAlertas();
    var elemento = document.getElementById(idAlerta);
    if (elemento) {
        elemento.classList.remove('d-none');
    }
}
// =================================================================
// CARREGAMENTO E INICIALIZAÇÃO HIERÁRQUICA
// =================================================================
/**
 * Configura os event listeners e inicia o carregamento dos dados.
 */
window.onload = function () {
    // Carrega dados globais
    carregarInstituicoes();
    carregarCursos();
    carregarTurmas();
    carregarDisciplinasGlobais(); // Para uso no nome da disciplina na exportação
    // Event Listeners principais
    if (btnCarregarAlunos) {
        btnCarregarAlunos.onclick = carregarDadosCompletosNotas;
    }
    if (formEditarNota) {
        formEditarNota.onsubmit = function (e) {
            e.preventDefault();
            salvarNota();
        };
    }
    // --- Lógica de Filtro para Visualização de Notas (Cascata) ---
    // 1. Instituição Notas (Filtra Cursos)
    if (selectInstituicaoNotas) {
        selectInstituicaoNotas.onchange = function () {
            var id = parseInt(this.value);
            instituicaoSelecionada = isNaN(id) ? null : id;
            cursoSelecionado = null;
            turmaSelecionada = null;
            disciplinaSelecionada = null;
            atualizarSelectCursos(selectCursoNotas, instituicaoSelecionada);
            preencherSelect(selectTurmaNotas, [], 'Turma'); // Limpa Turmas
            preencherSelect(selectDisciplinaNotas, [], 'Disciplina'); // Limpa Disciplinas
        };
    }
    // 2. Curso Notas (Filtra Turmas)
    if (selectCursoNotas) {
        selectCursoNotas.onchange = function () {
            var id = parseInt(this.value);
            cursoSelecionado = isNaN(id) ? null : id;
            turmaSelecionada = null;
            disciplinaSelecionada = null;
            atualizarSelectTurmas(selectTurmaNotas, cursoSelecionado);
            preencherSelect(selectDisciplinaNotas, [], 'Disciplina'); // Limpa Disciplinas
        };
    }
    // 3. Turma Notas (Filtra Disciplinas)
    if (selectTurmaNotas) {
        selectTurmaNotas.onchange = function () {
            var id = parseInt(this.value);
            turmaSelecionada = isNaN(id) ? null : id;
            disciplinaSelecionada = null;
            atualizarSelectDisciplinas(selectDisciplinaNotas, turmaSelecionada);
        };
    }
    // 4. Disciplina Notas
    if (selectDisciplinaNotas) {
        selectDisciplinaNotas.onchange = function () {
            var id = parseInt(this.value);
            disciplinaSelecionada = isNaN(id) ? null : id;
        };
    }
    // --- Lógica de Filtro para Exportação (Cascata) ---
    // 1. Instituição Export (Filtra Cursos)
    if (selectInstituicaoExport) {
        selectInstituicaoExport.onchange = function () {
            var id = parseInt(this.value);
            atualizarSelectCursos(selectCursoExport, id);
            preencherSelect(selectTurmaExport, [], 'Turma');
            preencherSelect(selectDisciplinaExport, [], 'Disciplina');
        };
    }
    // 2. Curso Export (Filtra Turmas)
    if (selectCursoExport) {
        selectCursoExport.onchange = function () {
            var id = parseInt(this.value);
            atualizarSelectTurmas(selectTurmaExport, id);
            preencherSelect(selectDisciplinaExport, [], 'Disciplina');
        };
    }
    // 3. Turma Export (Filtra Disciplinas)
    if (selectTurmaExport) {
        selectTurmaExport.onchange = function () {
            var id = parseInt(this.value);
            atualizarSelectDisciplinas(selectDisciplinaExport, id);
        };
    }
    // Gerencia o clique no botão de Exportação
    if (btnExportarCSV) {
        btnExportarCSV.onclick = exportarCSV;
    }
};
/**
 * Preenche um elemento SELECT com uma lista de opções.
 */
function preencherSelect(select, items, tipo) {
    if (!select)
        return;
    // Limpa e adiciona a opção padrão
    select.innerHTML = "<option value=\"\" selected disabled>Selecione a ".concat(tipo, "</option>");
    // Filtra IDs duplicados (Instituição/Curso/Turma podem vir repetidos dependendo da lista)
    var uniqueItemsMap = new Map();
    items.forEach(function (item) {
        var _a;
        // Usa o 'id' genérico para o ID da opção
        if ('id' in item) {
            uniqueItemsMap.set(item.id, item);
        }
        else if ('id_componente' in item) {
            // Ignora componentes
        }
    });
    Array.from(uniqueItemsMap.values()).forEach(function (item) {
        var option = document.createElement('option');
        option.value = item.id.toString();
        option.textContent = item.nome;
        select.appendChild(option);
    });
    // Reseta a seleção
    select.value = '';
}
/**
 * Carrega todas as instituições e preenche os selects iniciais.
 */
function carregarInstituicoes() {
    // Assumindo endpoint /api/instituicoes
    fazerRequisicao('GET', '/api/instituicoes', function (data) {
        if (data.error)
            return;
        instituicoes = data;
        preencherSelect(selectInstituicaoNotas, data, 'Instituição');
        preencherSelect(selectInstituicaoExport, data, 'Instituição');
    });
}
/**
 * Carrega todos os cursos (para uso na filtragem em cascata).
 */
function carregarCursos() {
    // Assumindo endpoint /api/cursos
    fazerRequisicao('GET', '/api/cursos', function (data) {
        if (data.error)
            return;
        cursos = data;
    });
}
/**
 * Carrega todas as turmas (para uso na filtragem em cascata).
 */
function carregarTurmas() {
    // Endpoint /api/turmas deve retornar Turma[] com curso_id e instituicao_id.
    fazerRequisicao('GET', '/api/turmas', function (data) {
        if (data.error)
            return;
        turmas = data;
        // As turmas não são preenchidas inicialmente; apenas após filtro de Curso.
    });
}
/**
 * Carrega todas as disciplinas (para lookup de nome na exportação).
 */
function carregarDisciplinasGlobais() {
    // Assumindo endpoint /api/disciplinas
    fazerRequisicao('GET', '/api/disciplinas', function (data) {
        if (data.error)
            return;
        disciplinas = data;
    });
}
/**
 * Filtra e preenche o select de Cursos com base na Instituição selecionada.
 */
function atualizarSelectCursos(select, instituicaoId) {
    if (!select)
        return;
    if (!instituicaoId) {
        preencherSelect(select, [], 'Curso');
        return;
    }
    var cursosFiltrados = cursos.filter(function (c) { return c.fk_instituicao_id_instituicao === instituicaoId; });
    preencherSelect(select, cursosFiltrados, 'Curso');
}
/**
 * Filtra e preenche o select de Turmas com base no Curso selecionado.
 */
function atualizarSelectTurmas(select, cursoId) {
    if (!select)
        return;
    if (!cursoId) {
        preencherSelect(select, [], 'Turma');
        return;
    }
    var turmasFiltradas = turmas.filter(function (t) { return t.curso_id === cursoId; });
    preencherSelect(select, turmasFiltradas, 'Turma');
}
/**
 * Filtra e preenche o select de Disciplinas com base na Turma selecionada.
 * Na verdade, busca as disciplinas associadas à Turma (para permitir múltiplos Componentes).
 * O endpoint assumido é o mesmo do arquivo de exemplo `turmas (ex).ts`.
 */
function atualizarSelectDisciplinas(select, turmaId) {
    if (!select || !turmaId) {
        preencherSelect(select, [], 'Disciplina');
        return;
    }
    // Requisição para buscar disciplinas específicas da turma (melhor prática)
    fazerRequisicao('GET', "/api/turmas/".concat(turmaId, "/disciplinas"), function (data) {
        if (data.error)
            return;
        preencherSelect(select, data, 'Disciplina');
    });
}
// =================================================================
// LÓGICA DE VISUALIZAÇÃO DE NOTAS
// =================================================================
/**
 * Orquestra o carregamento de Alunos, Componentes e Notas para a Turma/Disciplina selecionada.
 */
function carregarDadosCompletosNotas() {
    if (!turmaSelecionada || !disciplinaSelecionada) {
        mostrarAlerta('alertCampos');
        document.getElementById('alertCampos').textContent = 'Selecione a Instituição, Curso, Turma e Disciplina.';
        return;
    }
    esconderAlertas();
    if (listaAlunosNotas)
        listaAlunosNotas.innerHTML = '<tr><td colspan="100%" class="text-center py-4">Carregando dados...</td></tr>';
    var requests = [
        "/api/turmas/".concat(turmaSelecionada, "/alunos"),
        "/api/componentes?disciplina_id=".concat(disciplinaSelecionada),
        "/api/notas/detalhes?turma_id=".concat(turmaSelecionada, "&disciplina_id=").concat(disciplinaSelecionada) // 2: Notas (novo endpoint assumido)
    ];
    var results = [];
    var completedRequests = 0;
    var onComplete = function () {
        if (completedRequests === requests.length) {
            var alunos = results[0];
            var componentes = results[1];
            var notas = results[2];
            if (alunos.error || componentes.error || notas.error) {
                if (listaAlunosNotas)
                    listaAlunosNotas.innerHTML = '<tr><td colspan="100%" class="text-center py-4 text-danger">Erro ao carregar os dados. Verifique o console.</td></tr>';
                return;
            }
            processarDadosNotas(alunos, componentes, notas);
        }
    };
    requests.forEach(function (url, index) {
        fazerRequisicao('GET', url, function (data) {
            results[index] = data;
            completedRequests++;
            onComplete();
        });
    });
}
/**
 * Processa os dados brutos e os armazena na estrutura DadosNotas.
 */
function processarDadosNotas(alunos, componentes, notas) {
    dadosNotas.componentes = componentes;
    // Inicializa a estrutura de alunos com mapa de notas
    var alunosComNotasMap = new Map();
    alunos.forEach(function (aluno) {
        alunosComNotasMap.set(aluno.id_aluno, {
            id_aluno: aluno.id_aluno,
            nome_completo: aluno.nome_completo,
            matricula: aluno.matricula,
            notas: {}
        });
    });
    // Preenche as notas
    notas.forEach(function (nota) {
        var aluno = alunosComNotasMap.get(nota.fk_aluno_id_aluno);
        if (aluno) {
            aluno.notas[nota.fk_componente_nota_id_componente] = nota.valor_nota;
        }
    });
    dadosNotas.alunosComNotas = Array.from(alunosComNotasMap.values());
    renderizarTabelaNotas();
}
/**
 * Renderiza a tabela de notas dinamicamente com base em dadosNotas.
 */
function renderizarTabelaNotas() {
    var _a;
    if (!listaAlunosNotas || !tableHeadNotas)
        return;
    listaAlunosNotas.innerHTML = '';
    tableHeadNotas.innerHTML = '';
    var componentes = dadosNotas.componentes;
    // Mensagens de erro/vazio
    if (dadosNotas.alunosComNotas.length === 0) {
        listaAlunosNotas.innerHTML = '<tr><td colspan="100%" class="text-center py-4">Nenhum aluno encontrado nesta turma.</td></tr>';
        return;
    }
    if (componentes.length === 0) {
        listaAlunosNotas.innerHTML = '<tr><td colspan="100%" class="text-center py-4">Nenhum componente de nota cadastrado para esta disciplina.</td></tr>';
        return;
    }
    // 1. Cria o cabeçalho da tabela (thead)
    var trHead = document.createElement('tr');
    var thAluno = document.createElement('th');
    thAluno.scope = 'col';
    thAluno.textContent = 'Aluno';
    trHead.appendChild(thAluno);
    componentes.forEach(function (c) {
        var th = document.createElement('th');
        th.scope = 'col';
        th.textContent = "".concat(c.nome_componente, " (").concat(c.peso_componente, "%)");
        th.classList.add('text-center');
        trHead.appendChild(th);
    });
    tableHeadNotas.appendChild(trHead);
    // 2. Cria as linhas do corpo da tabela (tbody)
    dadosNotas.alunosComNotas.forEach(function (aluno) {
        var tr = document.createElement('tr');
        // Célula do Aluno
        var tdAluno = document.createElement('td');
        tdAluno.innerHTML = "<strong>".concat(aluno.nome_completo, "</strong><br><small class=\"text-muted\">").concat(aluno.matricula, "</small>");
        tr.appendChild(tdAluno);
        // Células das Notas
        componentes.forEach(function (componente) {
            var componenteId = componente.id_componente;
            var nota = (_a = aluno.notas[componenteId]) !== null && _a !== void 0 ? _a : null;
            var notaFormatada = nota !== null ? nota.toFixed(1) : '-';
            var tdNota = document.createElement('td');
            tdNota.classList.add('text-center', 'align-middle');
            // Botão/Link para Editar
            var btnEditar = document.createElement('a');
            btnEditar.href = '#';
            btnEditar.classList.add('link-primary');
            btnEditar.setAttribute('data-bs-toggle', 'modal');
            btnEditar.setAttribute('data-bs-target', '#modalEditarNota');
            btnEditar.onclick = function (e) {
                e.preventDefault();
                abrirModalEditarNota(aluno.id_aluno, componente.id_componente, aluno.nome_completo, componente.nome_componente, nota);
            };
            btnEditar.innerHTML = "<u>".concat(notaFormatada, " <i class=\"bi bi-pencil-square ms-1\"></i></u>");
            tdNota.appendChild(btnEditar);
            tr.appendChild(tdNota);
        });
        listaAlunosNotas.appendChild(tr);
    });
}
// =================================================================
// LÓGICA DO MODAL DE EDIÇÃO
// =================================================================
/**
 * Função para configurar e abrir o modal de edição.
 */
function abrirModalEditarNota(alunoId, componenteId, alunoNome, componenteNome, valorAtual) {
    if (!modalAlunoNome || !modalComponenteNome || !inputNota)
        return;
    // 1. Define o estado de edição (global)
    notaEditando = {
        alunoId: alunoId,
        componenteId: componenteId,
        alunoNome: alunoNome,
        componenteNome: componenteNome,
        valorAtual: valorAtual
    };
    // 2. Preenche o modal
    modalAlunoNome.textContent = alunoNome;
    modalComponenteNome.textContent = componenteNome;
    inputNota.value = valorAtual !== null ? valorAtual.toFixed(1).toString() : ''; // Preenche com a nota atual ou vazio
    esconderAlertosNoModal();
}
/**
 * Função específica para esconder alertas DENTRO do modal.
 */
function esconderAlertosNoModal() {
    var alertModal = document.getElementById('alertCampos'); // Usando alertCampos para erros/sucesso no modal
    if (alertModal)
        alertModal.classList.add('d-none');
}
/**
 * Função para salvar a nota (Submissão do formulário do modal).
 */
function salvarNota() {
    var _a;
    if (!inputNota || !notaEditando || !turmaSelecionada || !disciplinaSelecionada) {
        mostrarAlerta('alertCampos');
        document.getElementById('alertCampos').textContent = 'Erro interno: contexto de edição perdido.';
        return;
    }
    esconderAlertosNoModal();
    var notaString = inputNota.value;
    var notaNum = parseFloat(notaString.replace(',', '.'));
    // Validação da nota (0 a 10)
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
        var alertModal = document.getElementById('alertCampos');
        if (alertModal) {
            alertModal.textContent = 'Erro: A nota deve ser um número entre 0 e 10.';
            alertModal.classList.remove('d-none');
        }
        return;
    }
    // Se o valor for o mesmo, simplesmente fecha o modal e não faz a requisição.
    if (notaEditando.valorAtual !== null && notaNum.toFixed(1) === notaEditando.valorAtual.toFixed(1)) {
        // Assume que a biblioteca Bootstrap foi carregada (como nos arquivos HTML de exemplo)
        var modal = window.bootstrap.Modal.getInstance(modalEditarNota);
        if (modal)
            modal.hide();
        mostrarAlerta('alertSucessoGeral');
        document.getElementById('alertSucessoGeral').textContent = 'Nota não alterada (valor idêntico).';
        return;
    }
    // Dados para a requisição
    var dados = {
        fk_turma_id_turma: turmaSelecionada,
        fk_disciplina_id_disciplina: disciplinaSelecionada,
        fk_aluno_id_aluno: notaEditando.alunoId,
        fk_componente_nota_id_componente: notaEditando.componenteId,
        valor_nota: notaNum
    };
    // Endpoint simulado para salvar/atualizar
    fazerRequisicao('POST', '/api/notas/salvar', function (data) {
        if (data.error) {
            var alertModal = document.getElementById('alertCampos');
            if (alertModal) {
                alertModal.textContent = "Erro ao salvar: ".concat(data.error);
                alertModal.classList.remove('d-none');
            }
            return;
        }
        var modal = window.bootstrap.Modal.getInstance(modalEditarNota);
        if (modal)
            modal.hide();
        mostrarAlerta('alertSucessoGeral');
        document.getElementById('alertSucessoGeral').textContent = 'Nota salva com sucesso!';
        carregarDadosCompletosNotas(); // Recarrega os dados para refletir a mudança
    }, dados);
}
// =================================================================
// LÓGICA DE EXPORTAÇÃO CSV
// =================================================================
/**
 * Requisita os dados e gera o arquivo CSV.
 */
function exportarCSV() {
    var _a, _b;
    var turmaId = selectTurmaExport ? parseInt(selectTurmaExport.value) : null;
    var disciplinaId = selectDisciplinaExport ? parseInt(selectDisciplinaExport.value) : null;
    if (!turmaId || !disciplinaId) {
        alert('Selecione a Turma e a Disciplina para exportar.');
        return;
    }
    // Requisição para buscar dados de exportação (assume que este endpoint retorna a estrutura DadosNotas)
    fazerRequisicao('GET', "/api/notas/exportar?turma_id=".concat(turmaId, "&disciplina_id=").concat(disciplinaId), function (dadosExportacao) {
        if (dadosExportacao.error) {
            alert('Erro ao carregar dados para exportação. Verifique o console.');
            return;
        }
        if (!dadosExportacao.alunosComNotas || dadosExportacao.alunosComNotas.length === 0) {
            alert('Não há notas para exportar para a turma e disciplina selecionadas.');
            return;
        }
        // 1. Monta o Cabeçalho CSV
        var csvContent = '\uFEFFMatrícula;Nome do Aluno'; // Adiciona BOM para forçar UTF-8 em Excel
        dadosExportacao.componentes.forEach(function (c) {
            csvContent += ";".concat(c.nome_componente, " (Peso: ").concat(c.peso_componente, "%)");
        });
        csvContent += '\n';
        // 2. Monta as Linhas de Dados
        dadosExportacao.alunosComNotas.forEach(function (aluno) {
            var _a;
            var row = "".concat(aluno.matricula, ";\"").concat(aluno.nome_completo.replace(/"/g, '""'), "\""); // Escapa aspas no nome
            dadosExportacao.componentes.forEach(function (c) {
                var _a;
                var nota = (_a = aluno.notas[c.id_componente]) !== null && _a !== void 0 ? _a : '';
                var notaFormatada = typeof nota === 'number' ? nota.toFixed(2).replace('.', ',') : String(nota);
                row += ";".concat(notaFormatada);
            });
            csvContent += row + '\n';
        });
        // 3. Cria o arquivo e dispara o download
        var turmaNome = ((_a = turmas.find(function (t) { return t.id === turmaId; })) === null || _a === void 0 ? void 0 : _a.nome) || 'Turma';
        var disciplinaNome = ((_b = disciplinas.find(function (d) { return d.id === disciplinaId; })) === null || _b === void 0 ? void 0 : _b.nome) || 'Disciplina';
        var nomeArquivo = "Notas_".concat(turmaNome.replace(/[^a-z0-9]/gi, '_'), "_").concat(disciplinaNome.replace(/[^a-z0-9]/gi, '_'), ".csv");
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        // Configura o link para download
        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        else {
            // Fallback
            window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
        }
        // Fecha o modal de exportação (se estiver aberto)
        var modalExportar = document.getElementById('modalExportarNotas');
        var modalInstance = modalExportar ? window.bootstrap.Modal.getInstance(modalExportar) : null;
        if (modalInstance) {
            modalInstance.hide();
        }
    });
}