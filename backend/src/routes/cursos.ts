// autor: Cadu Spadari
// Importa tipos do Express para requisições e respostas
import { Router, Request, Response } from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de cursos
const router = Router();

// Rota GET /api/cursos - Lista todos os cursos
router.get('/', (_req: Request, res: Response) => {
  // Query SQL para buscar todos os cursos com o nome da instituição
  const sql = `
    SELECT 
      c.id,
      c.nome,
      c.instituicao_id,
      i.nome as instituicao_nome,
      c.criado_em
    FROM cursos c
    INNER JOIN instituicoes i ON c.instituicao_id = i.id
    ORDER BY i.nome, c.nome
  `;
  
  // Executa a query no banco de dados
  db.all(sql, [], (err, rows) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de cursos
    return res.json(rows);
  });
});

// Rota GET /api/cursos/:id - Busca um curso específico por ID
router.get('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para buscar o curso pelo ID com o nome da instituição
  const sql = `
    SELECT 
      c.id,
      c.nome,
      c.instituicao_id,
      i.nome as instituicao_nome,
      c.criado_em
    FROM cursos c
    INNER JOIN instituicoes i ON c.instituicao_id = i.id
    WHERE c.id = ?
  `;
  
  // Executa a query no banco de dados
  db.get(sql, [id], (err, row: any) => {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar o curso, retorna erro 404
    if (!row) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Retorna os dados do curso
    return res.json(row);
  });
});

// Rota POST /api/cursos - Cria um novo curso
router.post('/', (req: Request, res: Response) => {
  // Extrai o nome e o ID da instituição do corpo da requisição
  const { nome, instituicao_id } = req.body ?? {};

  // Valida se os campos obrigatórios foram preenchidos
  if (!nome || !instituicao_id) {
    return res.status(400).json({ 
      error: 'Nome do curso e ID da instituição são obrigatórios' 
    });
  }

  // Query SQL para inserir o novo curso
  const sql = 'INSERT INTO cursos (nome, instituicao_id) VALUES (?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [nome, instituicao_id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      // Verifica se o erro é de curso duplicado na mesma instituição
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Curso já cadastrado nesta instituição' });
      }
      // Verifica se o erro é de instituição não encontrada
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(404).json({ error: 'Instituição não encontrada' });
      }
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna os dados do curso criado
    return res.status(201).json({ 
      id: this.lastID, 
      nome,
      instituicao_id: Number(instituicao_id)
    });
  });
});

// Rota PUT /api/cursos/:id - Atualiza um curso existente
router.put('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL e o nome do corpo da requisição
  const { id } = req.params;
  const { nome } = req.body ?? {};

  // Valida se o nome foi preenchido
  if (!nome) {
    return res.status(400).json({ error: 'Nome do curso é obrigatório' });
  }

  // Query SQL para atualizar o curso
  const sql = 'UPDATE cursos SET nome = ? WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [nome, id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, o curso não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    // Retorna sucesso
    return res.json({ id: Number(id), nome });
  });
});

// Rota DELETE /api/cursos/:id - Exclui um curso
router.delete('/:id', (req: Request, res: Response) => {
  // Extrai o ID da URL
  const { id } = req.params;

  // Query SQL para excluir o curso
  const sql = 'DELETE FROM cursos WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, o curso não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Curso excluído com sucesso' });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

