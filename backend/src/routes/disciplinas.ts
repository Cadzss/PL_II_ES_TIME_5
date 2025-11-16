// autor: Cadu Spadari
// Importa tipos do Express para requisições e respostas
import { Router, Request, Response } from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de disciplinas
const router = Router();

// Rota GET /api/disciplinas - Lista todas as disciplinas
router.get('/', (_req: Request, res: Response) => {
  // Query SQL para buscar todas as disciplinas ordenadas por nome
  const sql = 'SELECT * FROM disciplinas ORDER BY nome ASC';
  
  // Executa a query no banco de dados
  db.all(sql, [], (err, rows) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de disciplinas
    return res.json(rows);
  });
});

// Rota GET /api/disciplinas/:id - Busca uma disciplina específica por ID
router.get('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para buscar a disciplina pelo ID
  const sql = 'SELECT * FROM disciplinas WHERE id = ?';
  
  // Executa a query no banco de dados
  db.get(sql, [id], (err, row: any) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar a disciplina, retorna erro 404
    if (!row) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    // Retorna os dados da disciplina
    return res.json(row);
  });
});

// Rota POST /api/disciplinas - Cria uma nova disciplina
router.post('/', (req: Request, res: Response) => {
  // Extrai o nome da disciplina do corpo da requisição
  const { nome } = req.body ?? {};

  // Valida se o nome foi preenchido
  if (!nome) {
    return res.status(400).json({ error: 'Nome da disciplina é obrigatório' });
  }

  // Query SQL para inserir a nova disciplina
  const sql = 'INSERT INTO disciplinas (nome) VALUES (?)';
  
  // Executa a query no banco de dados
  db.run(sql, [nome], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna os dados da disciplina criada
    return res.status(201).json({ 
      id: this.lastID, 
      nome 
    });
  });
});

// Rota PUT /api/disciplinas/:id - Atualiza uma disciplina existente
router.put('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL e o nome do corpo da requisição
  const { id } = req.params;
  const { nome } = req.body ?? {};

  // Valida se o nome foi preenchido
  if (!nome) {
    return res.status(400).json({ error: 'Nome da disciplina é obrigatório' });
  }

  // Query SQL para atualizar a disciplina
  const sql = 'UPDATE disciplinas SET nome = ? WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [nome, id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, a disciplina não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }
    
    // Retorna sucesso
    return res.json({ id: Number(id), nome });
  });
});

// Rota DELETE /api/disciplinas/:id - Exclui uma disciplina
router.delete('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para excluir a disciplina
  const sql = 'DELETE FROM disciplinas WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, a disciplina não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Disciplina excluída com sucesso' });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

