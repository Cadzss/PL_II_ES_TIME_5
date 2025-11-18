// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de componentes de nota
const router = express.Router();

// Rota GET /api/componentes/:disciplina_id - Lista todos os componentes de uma disciplina
router.get('/:disciplina_id', function(req: any, res: any) {
  // Extrai o ID da disciplina da URL
  const disciplinaId = req.params.disciplina_id;

  // Query SQL para buscar todos os componentes da disciplina
  const sql = 'SELECT * FROM componentes_nota WHERE disciplina_id = ? ORDER BY sigla ASC';
  
  // Executa a query no banco de dados
  db.all(sql, [disciplinaId], function(err: any, rows: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de componentes
    return res.json(rows);
  });
});

// Rota GET /api/componentes/:disciplina_id/:id - Busca um componente específico por ID
router.get('/:disciplina_id/:id', function(req: any, res: any) {
  // Extrai os IDs da URL
  const disciplinaId = req.params.disciplina_id;
  const id = req.params.id;

  // Query SQL para buscar o componente pelo ID
  const sql = 'SELECT * FROM componentes_nota WHERE id = ? AND disciplina_id = ?';
  
  // Executa a query no banco de dados
  db.get(sql, [id, disciplinaId], function(err: any, row: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar o componente, retorna erro 404
    if (!row) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }

    // Retorna os dados do componente
    return res.json(row);
  });
});

// Rota POST /api/componentes - Cria um novo componente de nota
router.post('/', function(req: any, res: any) {
  // Extrai os dados do corpo da requisição
  const disciplinaId = req.body.disciplina_id;
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const descricao = req.body.descricao;

  // Valida se os campos obrigatórios foram preenchidos
  if (!disciplinaId || !nome || !sigla) {
    return res.status(400).json({ 
      error: 'Disciplina, nome e sigla do componente são obrigatórios' 
    });
  }

  // Query SQL para inserir o novo componente
  const sql = 'INSERT INTO componentes_nota (disciplina_id, nome, sigla, descricao) VALUES (?, ?, ?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [disciplinaId, nome, sigla, descricao || null], function (err: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      // Verifica se o erro é de sigla duplicada na mesma disciplina
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Já existe um componente com esta sigla nesta disciplina' });
      }
      // Verifica se o erro é de disciplina não encontrada
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(404).json({ error: 'Disciplina não encontrada' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna os dados do componente criado
    return res.status(201).json({ 
      id: this.lastID, 
      disciplina_id: Number(disciplinaId),
      nome: nome,
      sigla: sigla,
      descricao: descricao || null
    });
  });
});

// Rota PUT /api/componentes/:id - Atualiza um componente existente
router.put('/:id', function(req: any, res: any) {
  // Extrai o ID da URL e os dados do corpo da requisição
  const id = req.params.id;
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const descricao = req.body.descricao;

  // Valida se pelo menos um campo foi fornecido
  if (!nome && !sigla && descricao === undefined) {
    return res.status(400).json({ error: 'Pelo menos um campo deve ser fornecido' });
  }

  // Monta a query de atualização dinamicamente
  var updates = [];
  var values = [];

  if (nome) {
    updates.push('nome = ?');
    values.push(nome);
  }
  if (sigla) {
    updates.push('sigla = ?');
    values.push(sigla);
  }
  if (descricao !== undefined) {
    updates.push('descricao = ?');
    values.push(descricao || null);
  }

  values.push(id);

  // Query SQL para atualizar o componente
  const sql = `UPDATE componentes_nota SET ${updates.join(', ')} WHERE id = ?`;
  
  // Executa a query no banco de dados
  db.run(sql, values, function (err: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      // Verifica se o erro é de sigla duplicada
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Já existe um componente com esta sigla nesta disciplina' });
      }
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, o componente não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }
    
    // Retorna sucesso
    return res.json({ 
      id: Number(id), 
      nome: nome || undefined,
      sigla: sigla || undefined,
      descricao: descricao !== undefined ? (descricao || null) : undefined
    });
  });
});

// Rota DELETE /api/componentes/:id - Exclui um componente
router.delete('/:id', function(req: any, res: any) {
  // Extrai o ID da URL
  const id = req.params.id;

  // Query SQL para excluir o componente (as notas serão excluídas automaticamente por CASCADE)
  const sql = 'DELETE FROM componentes_nota WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, o componente não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Componente não encontrado' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Componente excluído com sucesso' });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

