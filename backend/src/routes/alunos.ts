// autor: Cadu Spadari
// Importa tipos do Express para requisições e respostas
import { Router, Request, Response } from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de alunos
const router = Router();

// Rota GET /api/alunos - Lista todos os alunos
router.get('/', (_req: Request, res: Response) => {
  // Query SQL para buscar todos os alunos ordenados por nome
  const sql = 'SELECT * FROM alunos ORDER BY nome ASC';
  
  // Executa a query no banco de dados
  db.all(sql, [], (err, rows) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de alunos
    return res.json(rows);
  });
});

// Rota GET /api/alunos/:id - Busca um aluno específico por ID
router.get('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para buscar o aluno pelo ID
  const sql = 'SELECT * FROM alunos WHERE id = ?';
  
  // Executa a query no banco de dados
  db.get(sql, [id], (err, row: any) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar o aluno, retorna erro 404
    if (!row) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Retorna os dados do aluno
    return res.json(row);
  });
});

// Rota POST /api/alunos - Cria um novo aluno
router.post('/', (req: Request, res: Response) => {
  // Extrai os dados do corpo da requisição
  const { identificador, nome } = req.body ?? {};

  // Valida se os campos obrigatórios foram preenchidos
  if (!identificador || !nome) {
    return res.status(400).json({ 
      error: 'Identificador e nome do aluno são obrigatórios' 
    });
  }

  // Query SQL para inserir o novo aluno
  const sql = 'INSERT INTO alunos (identificador, nome) VALUES (?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [identificador, nome], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      // Verifica se o erro é de identificador duplicado
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Identificador já cadastrado' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna os dados do aluno criado
    return res.status(201).json({ 
      id: this.lastID, 
      identificador,
      nome
    });
  });
});

// Rota POST /api/alunos/importar - Importa múltiplos alunos de uma vez (para CSV)
router.post('/importar', (req: Request, res: Response) => {
  // Extrai a lista de alunos do corpo da requisição
  const { alunos, turma_id } = req.body ?? {};

  // Valida se a lista de alunos foi fornecida
  if (!alunos || !Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({ 
      error: 'Lista de alunos é obrigatória' 
    });
  }

  // Prepara a query para inserir alunos
  const sqlAluno = 'INSERT OR IGNORE INTO alunos (identificador, nome) VALUES (?, ?)';
  const stmtAluno = db.prepare(sqlAluno);

  // Prepara a query para associar aluno à turma
  const sqlTurmaAluno = `
    INSERT OR IGNORE INTO turma_alunos (turma_id, aluno_id) 
    VALUES (?, (SELECT id FROM alunos WHERE identificador = ?))
  `;
  const stmtTurmaAluno = db.prepare(sqlTurmaAluno);

  let processados = 0;
  let erros: string[] = [];

  // Processa cada aluno da lista
  alunos.forEach((aluno: { identificador: string; nome: string }) => {
    // Valida se o aluno tem os campos necessários
    if (!aluno.identificador || !aluno.nome) {
      erros.push(`Aluno inválido: ${JSON.stringify(aluno)}`);
      processados++;
      if (processados === alunos.length) {
        stmtAluno.finalize();
        stmtTurmaAluno.finalize();
        if (erros.length > 0) {
          return res.status(400).json({ error: 'Alguns alunos são inválidos', detalhes: erros });
        }
        return res.status(201).json({ 
          message: `${alunos.length} aluno(s) importado(s) com sucesso`,
          total: alunos.length
        });
      }
      return;
    }

    // Insere o aluno (ou ignora se já existir)
    stmtAluno.run([aluno.identificador, aluno.nome], function (err) {
      if (err) {
        erros.push(`Erro ao inserir aluno ${aluno.identificador}: ${err.message}`);
      }

      // Se houver turma_id, associa o aluno à turma
      if (turma_id) {
        stmtTurmaAluno.run([turma_id, aluno.identificador], function (err) {
          if (err) {
            erros.push(`Erro ao associar aluno ${aluno.identificador} à turma: ${err.message}`);
          }
        });
      }

      processados++;
      // Se todos os alunos foram processados, finaliza
      if (processados === alunos.length) {
        stmtAluno.finalize();
        stmtTurmaAluno.finalize();
        if (erros.length > 0) {
          return res.status(500).json({ error: 'Erros ao importar alunos', detalhes: erros });
        }
        return res.status(201).json({ 
          message: `${alunos.length} aluno(s) importado(s) com sucesso`,
          total: alunos.length
        });
      }
    });
  });
});

// Rota POST /api/alunos/:turma_id/adicionar - Adiciona um aluno a uma turma
router.post('/:turma_id/adicionar', (req: Request, res: Response) => {
  // Extrai o ID da turma da URL e os dados do corpo da requisição
  const { turma_id } = req.params;
  const { aluno_id } = req.body ?? {};

  // Valida se o ID do aluno foi fornecido
  if (!aluno_id) {
    return res.status(400).json({ error: 'ID do aluno é obrigatório' });
  }

  // Query SQL para associar o aluno à turma
  const sql = 'INSERT INTO turma_alunos (turma_id, aluno_id) VALUES (?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [turma_id, aluno_id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      // Verifica se o erro é de associação duplicada
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Aluno já está nesta turma' });
      }
      // Verifica se o erro é de turma ou aluno não encontrado
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(404).json({ error: 'Turma ou aluno não encontrado' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna sucesso
    return res.status(201).json({ 
      message: 'Aluno adicionado à turma com sucesso',
      turma_id: Number(turma_id),
      aluno_id: Number(aluno_id)
    });
  });
});

// Rota PUT /api/alunos/:id - Atualiza um aluno existente
router.put('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL e os dados do corpo da requisição
  const { id } = req.params;
  const { identificador, nome } = req.body ?? {};

  // Valida se pelo menos um campo foi fornecido
  if (!identificador && !nome) {
    return res.status(400).json({ error: 'Pelo menos um campo (identificador ou nome) deve ser fornecido' });
  }

  // Monta a query dinamicamente baseado nos campos fornecidos
  const updates: string[] = [];
  const values: any[] = [];

  if (identificador) {
    updates.push('identificador = ?');
    values.push(identificador);
  }

  if (nome) {
    updates.push('nome = ?');
    values.push(nome);
  }

  values.push(id);

  // Query SQL para atualizar o aluno
  const sql = `UPDATE alunos SET ${updates.join(', ')} WHERE id = ?`;
  
  // Executa a query no banco de dados
  db.run(sql, values, function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      // Verifica se o erro é de identificador duplicado
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Identificador já cadastrado' });
      }
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, o aluno não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    
    // Retorna sucesso
    return res.json({ 
      id: Number(id), 
      identificador: identificador || undefined,
      nome: nome || undefined
    });
  });
});

// Rota DELETE /api/alunos/:id - Exclui um aluno
router.delete('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para excluir o aluno (as associações serão excluídas automaticamente por CASCADE)
  const sql = 'DELETE FROM alunos WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, o aluno não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Aluno excluído com sucesso' });
  });
});

// Rota DELETE /api/alunos/:turma_id/remover/:aluno_id - Remove um aluno de uma turma
router.delete('/:turma_id/remover/:aluno_id', (req: Request, res: Response) => {
  // Extrai os IDs da URL
  const { turma_id, aluno_id } = req.params;

  // Query SQL para remover a associação entre aluno e turma
  const sql = 'DELETE FROM turma_alunos WHERE turma_id = ? AND aluno_id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [turma_id, aluno_id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, a associação não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Aluno não está nesta turma' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Aluno removido da turma com sucesso' });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

