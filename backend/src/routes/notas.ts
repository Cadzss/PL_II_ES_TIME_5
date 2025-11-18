// Autor: Gemini (Adaptado de Laura Lugli e Cadu Spadari)
// Script para gerenciar notas (listar, editar, exportar CSV)
// Adaptado para o novo schema relacional com COMPONENTE_NOTA e hierarquia INSTITUICAO/CURSO.

// =================================================================
// TIPOS E INTERFACES
// =================================================================

/** Estrutura simplificada para Instituição. */
interface Instituicao {
    id: number;
    nome: string;
}

/** Estrutura simplificada para Curso. */
interface Curso {
    id: number;
    nome: string;
    fk_instituicao_id_instituicao: number;
}

/** Estrutura para Turma (completa, como vem do backend de turmas). */
interface Turma {
    id: number;
    nome: string;
    curso_id: number;
    instituicao_id: number;
    fk_disciplina_id_disciplina: number; // A disciplina principal associada
}

/** Estrutura simplificada para Disciplina (para o select de exportação). */
interface Disciplina {
    id: number;
    nome: string;
}

/** Estrutura para o Componente de Nota (para a coluna da tabela). */
interface ComponenteNota {
    id_componente: number;
    nome_componente: string;
    peso_componente: number;
}

/** Estrutura que representa uma nota específica registrada no BD. */
interface NotaRegistro {
    fk_aluno_id_aluno: number;
    fk_componente_nota_id_componente: number;
    valor_nota: number | null;
}

/** Estrutura para o Aluno (linha da tabela) */
interface Aluno {
    id_aluno: number;
    matricula: string;
    nome_completo: string;
}

/** Estrutura final dos dados para renderização da tabela. */
interface DadosNotas {
    componentes: ComponenteNota[];
    alunosComNotas: {
        id_aluno: number;
        nome_completo: string;
        matricula: string;
        // Mapeia componenteId para valor_nota (pode ser null se não houver nota)
        notas: { [componenteId: number]: number | null };
    }[];
}

// =================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// =================================================================

let instituicoes: Instituicao[] = [];
let cursos: Curso[] = [];
let turmas: Turma[] = [];
let disciplinas: Disciplina[] = []; // Disciplinas completas (para o filtro de exportação)

let instituicaoSelecionada: number | null = null;
let cursoSelecionado: number | null = null;
let turmaSelecionada: number | null = null;
let disciplinaSelecionada: number | null = null; // A disciplina selecionada para carregar notas.

/** * Objeto que armazena o contexto da nota sendo editada para a função salvarNota. 
 */
let notaEditando: { 
    alunoId: number; 
    componenteId: number; 
    alunoNome: string; 
    componenteNome: string;
    valorAtual: number | null;
} | null = null;

let dadosNotas: DadosNotas = { componentes: [], alunosComNotas: [] }; // Dados da tabela

// =================================================================
// REFERÊNCIAS DO DOM
// =================================================================

// Visualização de Notas
const selectInstituicaoNotas = document.getElementById('selectInstituicaoNotas') as HTMLSelectElement | null;
const selectCursoNotas = document.getElementById('selectCursoNotas') as HTMLSelectElement | null;
const selectTurmaNotas = document.getElementById('selectTurmaNotas') as HTMLSelectElement | null;
const selectDisciplinaNotas = document.getElementById('selectDisciplinaNotas') as HTMLSelectElement | null;
const btnCarregarAlunos = document.getElementById('btnCarregarAlunos') as HTMLButtonElement | null;

// Tabela e Modais
const listaAlunosNotas = document.getElementById('listaAlunosNotas') as HTMLTableSectionElement | null; 
const tableHeadNotas = document.getElementById('tableHeadNotas') as HTMLTableSectionElement | null; 
const modalEditarNota = document.getElementById('modalEditarNota'); 
const formEditarNota = document.getElementById('formEditarNota') as HTMLFormElement | null;
const modalAlunoNome = document.getElementById('modalAlunoNome') as HTMLElement | null;
const modalComponenteNome = document.getElementById('modalComponenteNome') as HTMLElement | null;
const inputNota = document.getElementById('inputNota') as HTMLInputElement | null;
const alertCampos = document.getElementById('alertCampos'); 
const alertSucessoGeral = document.getElementById('alertSucessoGeral'); 

// Exportação CSV
const selectInstituicaoExport = document.getElementById('selectInstituicaoExport') as HTMLSelectElement | null;
const selectCursoExport = document.getElementById('selectCursoExport') as HTMLSelectElement | null;
const selectTurmaExport = document.getElementById('selectTurmaExport') as HTMLSelectElement | null;
const selectDisciplinaExport = document.getElementById('selectDisciplinaExport') as HTMLSelectElement | null;
const btnExportarCSV = document.getElementById('btnExportarCSV') as HTMLButtonElement | null;


// =================================================================
// FUNÇÕES AUXILIARES GERAIS
// =================================================================

/**
 * Função Helper para requisições XHR.
 */
function fazerRequisicao(method: string, url: string, callback: (data: any) => void, data?: any): void {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const response = JSON.parse(xhr.responseText);
                callback(response);
            } catch (e) {
                callback({}); 
            }
        } else {
            console.error(`Erro na requisição ${url}: ${xhr.status} ${xhr.statusText}`);
            callback({ error: xhr.statusText || 'Erro desconhecido' });
        }
    };
    
    xhr.onerror = function() {
        console.error(`Erro de rede na requisição ${url}`);
        callback({ error: 'Erro de rede' });
    };

    xhr.send(data ? JSON.stringify(data) : undefined);
}

/**
 * Esconde todos os alertas conhecidos.
 */
function esconderAlertas(): void {
    const alertas = [alertCampos, alertSucessoGeral];
    alertas.forEach(alerta => {
        if (alerta) alerta.classList.add('d-none');
    });
}

/**
 * Mostra um alerta específico (assume que 'alertSucessoGeral' é na página e 'alertCampos' no modal).
 */
function mostrarAlerta(idAlerta: 'alertCampos' | 'alertSucessoGeral'): void {
    esconderAlertas();
    const elemento = document.getElementById(idAlerta);
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
window.onload = function() {
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
        formEditarNota.onsubmit = function(e) {
            e.preventDefault();
            salvarNota();
        };
    }

    // --- Lógica de Filtro para Visualização de Notas (Cascata) ---

    // 1. Instituição Notas (Filtra Cursos)
    if (selectInstituicaoNotas) {
        selectInstituicaoNotas.onchange = function() {
            const id = parseInt(this.value);
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
        selectCursoNotas.onchange = function() {
            const id = parseInt(this.value);
            cursoSelecionado = isNaN(id) ? null : id;
            turmaSelecionada = null;
            disciplinaSelecionada = null;
            atualizarSelectTurmas(selectTurmaNotas, cursoSelecionado);
            preencherSelect(selectDisciplinaNotas, [], 'Disciplina'); // Limpa Disciplinas
        };
    }

    // 3. Turma Notas (Filtra Disciplinas)
    if (selectTurmaNotas) {
        selectTurmaNotas.onchange = function() {
            const id = parseInt(this.value);
            turmaSelecionada = isNaN(id) ? null : id;
            disciplinaSelecionada = null;
            atualizarSelectDisciplinas(selectDisciplinaNotas, turmaSelecionada);
        };
    }
    
    // 4. Disciplina Notas
    if (selectDisciplinaNotas) {
        selectDisciplinaNotas.onchange = function() {
            const id = parseInt(this.value);
            disciplinaSelecionada = isNaN(id) ? null : id;
        };
    }


    // --- Lógica de Filtro para Exportação (Cascata) ---

    // 1. Instituição Export (Filtra Cursos)
    if (selectInstituicaoExport) {
        selectInstituicaoExport.onchange = function() {
            const id = parseInt(this.value);
            atualizarSelectCursos(selectCursoExport, id);
            preencherSelect(selectTurmaExport, [], 'Turma'); 
            preencherSelect(selectDisciplinaExport, [], 'Disciplina');
        };
    }
    
    // 2. Curso Export (Filtra Turmas)
    if (selectCursoExport) {
        selectCursoExport.onchange = function() {
            const id = parseInt(this.value);
            atualizarSelectTurmas(selectTurmaExport, id);
            preencherSelect(selectDisciplinaExport, [], 'Disciplina'); 
        };
    }

    // 3. Turma Export (Filtra Disciplinas)
    if (selectTurmaExport) {
        selectTurmaExport.onchange = function() {
            const id = parseInt(this.value);
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
function preencherSelect(select: HTMLSelectElement | null, items: Array<Instituicao | Curso | Turma | Disciplina>, tipo: 'Instituição' | 'Curso' | 'Turma' | 'Disciplina'): void {
    if (!select) return;
    
    // Limpa e adiciona a opção padrão
    select.innerHTML = `<option value="" selected disabled>Selecione a ${tipo}</option>`;
    
    // Filtra IDs duplicados (Instituição/Curso/Turma podem vir repetidos dependendo da lista)
    const uniqueItemsMap = new Map<number, Instituicao | Curso | Turma | Disciplina>();
    
    items.forEach(item => {
        // Usa o 'id' genérico para o ID da opção
        if ('id' in item) {
             uniqueItemsMap.set(item.id, item);
        } else if ('id_componente' in item) {
            // Ignora componentes
        }
    });

    Array.from(uniqueItemsMap.values()).forEach(item => {
        const option = document.createElement('option');
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
function carregarInstituicoes(): void {
    // Assumindo endpoint /api/instituicoes
    fazerRequisicao('GET', '/api/instituicoes', (data: Instituicao[]) => {
        if (data.error) return; 
        instituicoes = data;
        preencherSelect(selectInstituicaoNotas, data, 'Instituição');
        preencherSelect(selectInstituicaoExport, data, 'Instituição');
    });
}

/**
 * Carrega todos os cursos (para uso na filtragem em cascata).
 */
function carregarCursos(): void {
    // Assumindo endpoint /api/cursos
    fazerRequisicao('GET', '/api/cursos', (data: Curso[]) => {
        if (data.error) return; 
        cursos = data;
    });
}

/**
 * Carrega todas as turmas (para uso na filtragem em cascata).
 */
function carregarTurmas(): void {
    // Endpoint /api/turmas deve retornar Turma[] com curso_id e instituicao_id.
    fazerRequisicao('GET', '/api/turmas', (data: Turma[]) => {
        if (data.error) return; 
        turmas = data;
        // As turmas não são preenchidas inicialmente; apenas após filtro de Curso.
    });
}

/**
 * Carrega todas as disciplinas (para lookup de nome na exportação).
 */
function carregarDisciplinasGlobais(): void {
    // Assumindo endpoint /api/disciplinas
    fazerRequisicao('GET', '/api/disciplinas', (data: Disciplina[]) => {
        if (data.error) return; 
        disciplinas = data;
    });
}

/**
 * Filtra e preenche o select de Cursos com base na Instituição selecionada.
 */
function atualizarSelectCursos(select: HTMLSelectElement | null, instituicaoId: number | null): void {
    if (!select) return;
    
    if (!instituicaoId) {
        preencherSelect(select, [], 'Curso');
        return;
    }

    const cursosFiltrados = cursos.filter(c => c.fk_instituicao_id_instituicao === instituicaoId);
    preencherSelect(select, cursosFiltrados, 'Curso');
}

/**
 * Filtra e preenche o select de Turmas com base no Curso selecionado.
 */
function atualizarSelectTurmas(select: HTMLSelectElement | null, cursoId: number | null): void {
    if (!select) return;

    if (!cursoId) {
        preencherSelect(select, [], 'Turma');
        return;
    }

    const turmasFiltradas = turmas.filter(t => t.curso_id === cursoId);
    preencherSelect(select, turmasFiltradas, 'Turma');
}

/**
 * Filtra e preenche o select de Disciplinas com base na Turma selecionada.
 * Na verdade, busca as disciplinas associadas à Turma (para permitir múltiplos Componentes).
 * O endpoint assumido é o mesmo do arquivo de exemplo `turmas (ex).ts`.
 */
function atualizarSelectDisciplinas(select: HTMLSelectElement | null, turmaId: number | null): void {
    if (!select || !turmaId) {
        preencherSelect(select, [], 'Disciplina');
        return;
    }
    
    // Requisição para buscar disciplinas específicas da turma (melhor prática)
    fazerRequisicao('GET', `/api/turmas/${turmaId}/disciplinas`, (data: Disciplina[]) => {
        if (data.error) return; 
        preencherSelect(select, data, 'Disciplina');
    });
}


// =================================================================
// LÓGICA DE VISUALIZAÇÃO DE NOTAS
// =================================================================

/**
 * Orquestra o carregamento de Alunos, Componentes e Notas para a Turma/Disciplina selecionada.
 */
function carregarDadosCompletosNotas(): void {
    if (!turmaSelecionada || !disciplinaSelecionada) {
        mostrarAlerta('alertCampos');
        document.getElementById('alertCampos')!.textContent = 'Selecione a Instituição, Curso, Turma e Disciplina.';
        return;
    }

    esconderAlertas();
    if (listaAlunosNotas) listaAlunosNotas.innerHTML = '<tr><td colspan="100%" class="text-center py-4">Carregando dados...</td></tr>';

    const requests = [
        `/api/turmas/${turmaSelecionada}/alunos`, 
        `/api/componentes?disciplina_id=${disciplinaSelecionada}`, 
        `/api/notas/detalhes?turma_id=${turmaSelecionada}&disciplina_id=${disciplinaSelecionada}` 
    ];

    const results: any[] = [];
    let completedRequests = 0;

    const onComplete = () => {
        if (completedRequests === requests.length) {
            const alunos: Aluno[] = results[0];
            const componentes: ComponenteNota[] = results[1];
            const notas: NotaRegistro[] = results[2];

            if (alunos.error || componentes.error || notas.error) {
                 if (listaAlunosNotas) listaAlunosNotas.innerHTML = '<tr><td colspan="100%" class="text-center py-4 text-danger">Erro ao carregar os dados. Verifique o console.</td></tr>';
                 return;
            }

            processarDadosNotas(alunos, componentes, notas);
        }
    };

    requests.forEach((url, index) => {
        fazerRequisicao('GET', url, (data) => {
            results[index] = data;
            completedRequests++;
            onComplete();
        });
    });
}


/**
 * Processa os dados brutos e os armazena na estrutura DadosNotas.
 */
function processarDadosNotas(alunos: Aluno[], componentes: ComponenteNota[], notas: NotaRegistro[]): void {
    dadosNotas.componentes = componentes;

    // Inicializa a estrutura de alunos com mapa de notas
    const alunosComNotasMap = new Map<number, typeof dadosNotas.alunosComNotas[0]>();
    alunos.forEach(aluno => {
        alunosComNotasMap.set(aluno.id_aluno, {
            id_aluno: aluno.id_aluno,
            nome_completo: aluno.nome_completo,
            matricula: aluno.matricula,
            notas: {}
        });
    });

    // Preenche as notas
    notas.forEach(nota => {
        const aluno = alunosComNotasMap.get(nota.fk_aluno_id_aluno);
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
function renderizarTabelaNotas(): void {
    if (!listaAlunosNotas || !tableHeadNotas) return;
    
    listaAlunosNotas.innerHTML = ''; 
    tableHeadNotas.innerHTML = '';

    const componentes = dadosNotas.componentes;

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
    const trHead = document.createElement('tr');
    let thAluno = document.createElement('th');
    thAluno.scope = 'col';
    thAluno.textContent = 'Aluno';
    trHead.appendChild(thAluno);
    
    componentes.forEach(c => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = `${c.nome_componente} (${c.peso_componente}%)`; 
        th.classList.add('text-center');
        trHead.appendChild(th);
    });
    tableHeadNotas.appendChild(trHead);
    
    // 2. Cria as linhas do corpo da tabela (tbody)
    dadosNotas.alunosComNotas.forEach(aluno => {
        const tr = document.createElement('tr');
        
        // Célula do Aluno
        const tdAluno = document.createElement('td');
        tdAluno.innerHTML = `<strong>${aluno.nome_completo}</strong><br><small class="text-muted">${aluno.matricula}</small>`;
        tr.appendChild(tdAluno);
        
        // Células das Notas
        componentes.forEach(componente => {
            const componenteId = componente.id_componente;
            const nota = aluno.notas[componenteId] ?? null;
            const notaFormatada = nota !== null ? nota.toFixed(1) : '-';
            
            const tdNota = document.createElement('td');
            tdNota.classList.add('text-center', 'align-middle');
            
            // Botão/Link para Editar
            const btnEditar = document.createElement('a');
            btnEditar.href = '#';
            btnEditar.classList.add('link-primary');
            btnEditar.setAttribute('data-bs-toggle', 'modal');
            btnEditar.setAttribute('data-bs-target', '#modalEditarNota');
            btnEditar.onclick = (e) => {
                e.preventDefault();
                abrirModalEditarNota(aluno.id_aluno, componente.id_componente, aluno.nome_completo, componente.nome_componente, nota);
            };
            btnEditar.innerHTML = `<u>${notaFormatada} <i class="bi bi-pencil-square ms-1"></i></u>`;
            
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
function abrirModalEditarNota(alunoId: number, componenteId: number, alunoNome: string, componenteNome: string, valorAtual: number | null): void {
    if (!modalAlunoNome || !modalComponenteNome || !inputNota) return;
    
    // 1. Define o estado de edição (global)
    notaEditando = {
        alunoId,
        componenteId,
        alunoNome,
        componenteNome,
        valorAtual
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
function esconderAlertosNoModal(): void {
    const alertModal = document.getElementById('alertCampos'); // Usando alertCampos para erros/sucesso no modal
    if (alertModal) alertModal.classList.add('d-none');
}

/**
 * Função para salvar a nota (Submissão do formulário do modal).
 */
function salvarNota(): void {
    if (!inputNota || !notaEditando || !turmaSelecionada || !disciplinaSelecionada) {
        mostrarAlerta('alertCampos');
        document.getElementById('alertCampos')!.textContent = 'Erro interno: contexto de edição perdido.';
        return;
    }
    
    esconderAlertosNoModal();
    
    const notaString = inputNota.value;
    const notaNum = parseFloat(notaString.replace(',', '.')); 
    
    // Validação da nota (0 a 10)
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
        const alertModal = document.getElementById('alertCampos');
        if (alertModal) {
            alertModal.textContent = 'Erro: A nota deve ser um número entre 0 e 10.';
            alertModal.classList.remove('d-none');
        }
        return;
    }
    
    // Se o valor for o mesmo, simplesmente fecha o modal e não faz a requisição.
    if (notaEditando.valorAtual !== null && notaNum.toFixed(1) === notaEditando.valorAtual.toFixed(1)) {
        // Assume que a biblioteca Bootstrap foi carregada (como nos arquivos HTML de exemplo)
        const modal = (window as any).bootstrap.Modal.getInstance(modalEditarNota); 
        if (modal) modal.hide();
        mostrarAlerta('alertSucessoGeral'); 
        document.getElementById('alertSucessoGeral')!.textContent = 'Nota não alterada (valor idêntico).';
        return;
    }

    // Dados para a requisição
    const dados = {
        fk_turma_id_turma: turmaSelecionada,
        fk_disciplina_id_disciplina: disciplinaSelecionada,
        fk_aluno_id_aluno: notaEditando.alunoId,
        fk_componente_nota_id_componente: notaEditando.componenteId,
        valor_nota: notaNum
    };
    
    // Endpoint simulado para salvar/atualizar
    fazerRequisicao('POST', '/api/notas/salvar', (data: any) => {
        if (data.error) {
            const alertModal = document.getElementById('alertCampos');
            if (alertModal) {
                 alertModal.textContent = `Erro ao salvar: ${data.error}`;
                 alertModal.classList.remove('d-none');
            }
            return;
        }

        const modal = (window as any).bootstrap.Modal.getInstance(modalEditarNota);
        if (modal) modal.hide();
        
        mostrarAlerta('alertSucessoGeral');
        document.getElementById('alertSucessoGeral')!.textContent = 'Nota salva com sucesso!';
        carregarDadosCompletosNotas(); // Recarrega os dados para refletir a mudança

    }, dados);
}


// =================================================================
// LÓGICA DE EXPORTAÇÃO CSV
// =================================================================

/**
 * Requisita os dados e gera o arquivo CSV.
 */
function exportarCSV(): void {
    const turmaId = selectTurmaExport ? parseInt(selectTurmaExport.value) : null;
    const disciplinaId = selectDisciplinaExport ? parseInt(selectDisciplinaExport.value) : null;
    
    if (!turmaId || !disciplinaId) {
        alert('Selecione a Turma e a Disciplina para exportar.');
        return;
    }
    
    // Requisição para buscar dados de exportação (assume que este endpoint retorna a estrutura DadosNotas)
    fazerRequisicao('GET', `/api/notas/exportar?turma_id=${turmaId}&disciplina_id=${disciplinaId}`, (dadosExportacao: DadosNotas) => {
        if (dadosExportacao.error) {
             alert('Erro ao carregar dados para exportação. Verifique o console.');
             return;
        }

        if (!dadosExportacao.alunosComNotas || dadosExportacao.alunosComNotas.length === 0) {
             alert('Não há notas para exportar para a turma e disciplina selecionadas.');
             return;
        }
        
        // 1. Monta o Cabeçalho CSV
        let csvContent = '\uFEFFMatrícula;Nome do Aluno'; // Adiciona BOM para forçar UTF-8 em Excel
        dadosExportacao.componentes.forEach(c => {
            csvContent += `;${c.nome_componente} (Peso: ${c.peso_componente}%)`;
        });
        csvContent += '\n'; 
        
        // 2. Monta as Linhas de Dados
        dadosExportacao.alunosComNotas.forEach(aluno => {
            let row = `${aluno.matricula};"${aluno.nome_completo.replace(/"/g, '""')}"`; // Escapa aspas no nome
            dadosExportacao.componentes.forEach(c => {
                const nota = aluno.notas[c.id_componente] ?? '';
                const notaFormatada = typeof nota === 'number' ? nota.toFixed(2).replace('.', ',') : String(nota);
                row += `;${notaFormatada}`;
            });
            csvContent += row + '\n';
        });
        
        // 3. Cria o arquivo e dispara o download
        const turmaNome = turmas.find(t => t.id === turmaId)?.nome || 'Turma';
        const disciplinaNome = disciplinas.find(d => d.id === disciplinaId)?.nome || 'Disciplina';
        const nomeArquivo = `Notas_${turmaNome.replace(/[^a-z0-9]/gi, '_')}_${disciplinaNome.replace(/[^a-z0-9]/gi, '_')}.csv`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        // Configura o link para download
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            // Fallback
            window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
        }

        // Fecha o modal de exportação (se estiver aberto)
        const modalExportar = document.getElementById('modalExportarNotas');
        const modalInstance = modalExportar ? (window as any).bootstrap.Modal.getInstance(modalExportar) : null;
        if (modalInstance) {
            modalInstance.hide();
        }
    });
}