// autor: Cadu Spadari
// Importa tipos do Express para requisições e respostas
import { Router, Request, Response } from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de turmas
const router = Router();

// Rota GET /api/turmas - Lista todas as turmas
router.get('/', (_req: Request, res: Response) => {
  // Query SQL para buscar todas as turmas com informações do curso e instituição
  const sql = `
    SELECT 
      t.id,
      t.nome,
      t.curso_id,
      c.nome as curso_nome,
      c.instituicao_id,
      i.nome as instituicao_nome,
      t.criado_em
    FROM turmas t
    INNER JOIN cursos c ON t.curso_id = c.id
    INNER JOIN instituicoes i ON c.instituicao_id = i.id
    ORDER BY i.nome, c.nome, t.nome
  `;
  
  // Executa a query no banco de dados
  db.all(sql, [], (err, rows) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de turmas
    return res.json(rows);
  });
});

// Rota GET /api/turmas/:id - Busca uma turma específica por ID
router.get('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para buscar a turma pelo ID com informações do curso e instituição
  const sql = `
    SELECT 
      t.id,
      t.nome,
      t.curso_id,
      c.nome as curso_nome,
      c.instituicao_id,
      i.nome as instituicao_nome,
      t.criado_em
    FROM turmas t
    INNER JOIN cursos c ON t.curso_id = c.id
    INNER JOIN instituicoes i ON c.instituicao_id = i.id
    WHERE t.id = ?
  `;
  
  // Executa a query no banco de dados
  db.get(sql, [id], (err, row: any) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar a turma, retorna erro 404
    if (!row) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    // Retorna os dados da turma
    return res.json(row);
  });
});

// Rota POST /api/turmas - Cria uma nova turma
router.post('/', (req: Request, res: Response) => {
  // Extrai os dados do corpo da requisição
  const { nome, curso_id, disciplina_ids } = req.body ?? {};

  // Valida se os campos obrigatórios foram preenchidos
  if (!nome || !curso_id) {
    return res.status(400).json({ 
      error: 'Nome da turma e ID do curso são obrigatórios' 
    });
  }

  // Query SQL para inserir a nova turma
  const sqlTurma = 'INSERT INTO turmas (nome, curso_id) VALUES (?, ?)';
  
  // Executa a query para inserir a turma
  db.run(sqlTurma, [nome, curso_id], function (err) {
    // Se houver erro, retorna erro
    if (err) {
      // Verifica se o erro é de turma duplicada no mesmo curso
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Turma já cadastrada neste curso' });
      }
      // Verifica se o erro é de curso não encontrado
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(404).json({ error: 'Curso não encontrado' });
      }
      return res.status(500).json({ error: err.message });
    }

    // Salva o ID da turma criada
    const turmaId = this.lastID;

    // Se houver disciplinas para associar
    if (disciplina_ids && Array.isArray(disciplina_ids) && disciplina_ids.length > 0) {
      // Prepara a query para inserir as associações turma-disciplina
      const sqlDisciplina = 'INSERT INTO turma_disciplinas (turma_id, disciplina_id) VALUES (?, ?)';
      const stmt = db.prepare(sqlDisciplina);
      
      // Insere cada associação
      let inseridos = 0;
      let erros: string[] = [];

      disciplina_ids.forEach((disciplinaId: number) => {
        stmt.run([turmaId, disciplinaId], function (err) {
          if (err) {
            erros.push(err.message);
          }
          inseridos++;
          // Se todas as disciplinas foram processadas
          if (inseridos === disciplina_ids.length) {
            stmt.finalize();
            // Se houver erros, retorna erro parcial
            if (erros.length > 0) {
              return res.status(207).json({ 
                id: turmaId, 
                nome,
                curso_id: Number(curso_id),
                disciplina_ids,
                avisos: erros
              });
            }
            // Retorna sucesso
            return res.status(201).json({ 
              id: turmaId, 
              nome,
              curso_id: Number(curso_id),
              disciplina_ids
            });
          }
        });
      });
    } else {
      // Se não houver disciplinas, retorna sucesso
      return res.status(201).json({ 
        id: turmaId, 
        nome,
        curso_id: Number(curso_id)
      });
    }
  });
});

// Rota PUT /api/turmas/:id - Atualiza uma turma existente
router.put('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL e o nome do corpo da requisição
  const { id } = req.params;
  const { nome } = req.body ?? {};

  // Valida se o nome foi preenchido
  if (!nome) {
    return res.status(400).json({ error: 'Nome da turma é obrigatório' });
  }

  // Query SQL para atualizar a turma
  const sql = 'UPDATE turmas SET nome = ? WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [nome, id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, a turma não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }
    
    // Retorna sucesso
    return res.json({ id: Number(id), nome });
  });
});

// Rota DELETE /api/turmas/:id - Exclui uma turma
router.delete('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para excluir a turma (as associações serão excluídas automaticamente por CASCADE)
  const sql = 'DELETE FROM turmas WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, a turma não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Turma excluída com sucesso' });
  });
});

// Rota GET /api/turmas/:id/alunos - Lista todos os alunos de uma turma
router.get('/:id/alunos', (req: Request, res: Response) => {
  // Extrai o ID da turma da URL
  const { id } = req.params;

  // Query SQL para buscar todos os alunos da turma
  const sql = `
    SELECT 
      a.id,
      a.identificador,
      a.nome,
      a.criado_em
    FROM alunos a
    INNER JOIN turma_alunos ta ON a.id = ta.aluno_id
    WHERE ta.turma_id = ?
    ORDER BY a.nome
  `;
  
  // Executa a query no banco de dados
  db.all(sql, [id], (err, rows) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de alunos
    return res.json(rows);
  });
});

// Rota GET /api/turmas/:id/disciplinas - Lista todas as disciplinas de uma turma
router.get('/:id/disciplinas', (req: Request, res: Response) => {
  // Extrai o ID da turma da URL
  const { id } = req.params;

  // Query SQL para buscar todas as disciplinas da turma
  const sql = `
    SELECT 
      d.id,
      d.nome,
      d.criado_em
    FROM disciplinas d
    INNER JOIN turma_disciplinas td ON d.id = td.disciplina_id
    WHERE td.turma_id = ?
    ORDER BY d.nome
  `;
  
  // Executa a query no banco de dados
  db.all(sql, [id], (err, rows) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de disciplinas
    return res.json(rows);
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

