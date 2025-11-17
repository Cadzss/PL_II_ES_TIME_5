// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de alunos
const router = express.Router();

// Rota GET /api/alunos - Lista todos os alunos
router.get('/', function(req: any, res: any) {
  // Query SQL para buscar todos os alunos ordenados por nome
  const sql = 'SELECT * FROM alunos ORDER BY nome ASC';
  
  // Executa a query no banco de dados
  db.all(sql, [], function(err: any, rows: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de alunos
    return res.json(rows);
  });
});

// Rota GET /api/alunos/:id - Busca um aluno específico por ID
router.get('/:id', function(req: any, res: any) {
  // Extrai o ID da URL
  const id = req.params.id;

  // Query SQL para buscar o aluno pelo ID
  const sql = 'SELECT * FROM alunos WHERE id = ?';
  
  // Executa a query no banco de dados
  db.get(sql, [id], function(err: any, row: any) {
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
router.post('/', function(req: any, res: any) {
  // Extrai os dados do corpo da requisição
  const identificador = req.body.identificador;
  const nome = req.body.nome;

  // Valida se os campos obrigatórios foram preenchidos
  if (!identificador || !nome) {
    return res.status(400).json({ 
      error: 'Identificador e nome do aluno são obrigatórios' 
    });
  }

  // Query SQL para inserir o novo aluno
  const sql = 'INSERT INTO alunos (identificador, nome) VALUES (?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [identificador, nome], function (err: any) {
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
router.post('/importar', function(req: any, res: any) {
  // Extrai a lista de alunos do corpo da requisição
  const alunos = req.body.alunos;
  const turmaId = req.body.turma_id;

  // Valida se a lista de alunos foi fornecida
  if (!alunos || !Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({ 
      error: 'Lista de alunos é obrigatória' 
    });
  }

  var processados = 0;
  var sucessos = 0;
  var erros: string[] = [];

  // Processa cada aluno da lista
  function processarAluno(index: number) {
    if (index >= alunos.length) {
      // Todos os alunos foram processados
      if (erros.length > 0) {
        return res.status(500).json({ 
          error: 'Alguns alunos não puderam ser importados',
          sucessos: sucessos,
          erros: erros.length,
          detalhes: erros
        });
      }
      return res.status(201).json({ 
        message: sucessos + ' aluno(s) importado(s) com sucesso',
        total: sucessos
      });
    }

    var aluno = alunos[index];
    
    // Valida se o aluno tem os campos necessários
    if (!aluno.identificador || !aluno.nome) {
      erros.push('Aluno inválido na linha ' + (index + 1) + ': identificador ou nome faltando');
      processados++;
      processarAluno(index + 1);
      return;
    }

    // Insere o aluno (ou ignora se já existir)
    var sqlAluno = 'INSERT OR IGNORE INTO alunos (identificador, nome) VALUES (?, ?)';
    db.run(sqlAluno, [aluno.identificador, aluno.nome], function(errAluno: any) {
      if (errAluno) {
        erros.push('Erro ao inserir aluno ' + aluno.identificador + ': ' + errAluno.message);
        processados++;
        processarAluno(index + 1);
        return;
      }

      // Se houver turma_id, associa o aluno à turma
      if (turmaId) {
        // Primeiro busca o ID do aluno pelo identificador
        db.get('SELECT id FROM alunos WHERE identificador = ?', [aluno.identificador], function(errGet: any, row: any) {
          if (errGet || !row) {
            erros.push('Erro ao buscar aluno ' + aluno.identificador);
            processados++;
            processarAluno(index + 1);
            return;
          }

          // Associa o aluno à turma
          var sqlTurmaAluno = 'INSERT OR IGNORE INTO turma_alunos (turma_id, aluno_id) VALUES (?, ?)';
          db.run(sqlTurmaAluno, [turmaId, row.id], function(errTurma: any) {
            if (errTurma) {
              erros.push('Erro ao associar aluno ' + aluno.identificador + ' à turma: ' + errTurma.message);
            } else {
              sucessos++;
            }
            processados++;
            processarAluno(index + 1);
          });
        });
      } else {
        sucessos++;
        processados++;
        processarAluno(index + 1);
      }
    });
  }

  // Inicia o processamento
  processarAluno(0);
});

// Rota POST /api/alunos/:turma_id/adicionar - Adiciona um aluno a uma turma
router.post('/:turma_id/adicionar', function(req: any, res: any) {
  // Extrai o ID da turma da URL e os dados do corpo da requisição
  const turmaId = req.params.turma_id;
  const alunoId = req.body.aluno_id;

  // Valida se o ID do aluno foi fornecido
  if (!alunoId) {
    return res.status(400).json({ error: 'ID do aluno é obrigatório' });
  }

  // Query SQL para associar o aluno à turma
  const sql = 'INSERT INTO turma_alunos (turma_id, aluno_id) VALUES (?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [turmaId, alunoId], function (err: any) {
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
      turma_id: Number(turmaId),
      aluno_id: Number(alunoId)
    });
  });
});

// Rota PUT /api/alunos/:id - Atualiza um aluno existente
router.put('/:id', function(req: any, res: any) {
  // Extrai o ID da URL e os dados do corpo da requisição
  const id = req.params.id;
  const identificador = req.body.identificador;
  const nome = req.body.nome;

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
  db.run(sql, values, function (err: any) {
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
router.delete('/:id', function(req: any, res: any) {
  // Extrai o ID da URL
  const id = req.params.id;

  // Query SQL para excluir o aluno (as associações serão excluídas automaticamente por CASCADE)
  const sql = 'DELETE FROM alunos WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err: any) {
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
router.delete('/:turma_id/remover/:aluno_id', function(req: any, res: any) {
  // Extrai os IDs da URL
  const turmaId = req.params.turma_id;
  const alunoId = req.params.aluno_id;

  // Query SQL para remover a associação entre aluno e turma
  const sql = 'DELETE FROM turma_alunos WHERE turma_id = ? AND aluno_id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [turmaId, alunoId], function (err: any) {
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

