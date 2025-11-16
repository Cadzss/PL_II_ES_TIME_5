// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de instituições
const router = express.Router();

// Rota GET /api/instituicoes - Lista todas as instituições
// Quando alguém faz uma requisição GET para /api/instituicoes, esta função é executada
router.get('/', function(req: any, res: any) {
  // Comando SQL para buscar todas as instituições do banco, ordenadas por data de criação (mais recentes primeiro)
  const sql = 'SELECT * FROM instituicoes ORDER BY criado_em DESC';
  
  // Executa o comando SQL no banco de dados
  db.all(sql, [], function(err: any, rows: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Se tudo deu certo, retorna a lista de instituições em formato JSON
    return res.json(rows);
  });
});

// Rota GET /api/instituicoes/:id - Busca uma instituição específica por ID
// Quando alguém faz uma requisição GET para /api/instituicoes/1 (por exemplo), esta função é executada
router.get('/:id', function(req: any, res: any) {
  // Pega o ID que veio na URL (por exemplo, se a URL é /api/instituicoes/5, o id será 5)
  const id = req.params.id;

  // Comando SQL para buscar a instituição que tem esse ID
  const sql = 'SELECT * FROM instituicoes WHERE id = ?';
  
  // Executa o comando SQL no banco de dados
  // O valor ? será substituído pelo valor do array [id]
  db.get(sql, [id], function(err: any, row: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar nenhuma instituição com esse ID
    if (!row) {
      // Retorna erro 404 (Not Found - não encontrado)
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }

    // Se encontrou a instituição, retorna os dados dela em formato JSON
    return res.json(row);
  });
});

// Rota POST /api/instituicoes - Cria uma nova instituição
// Quando alguém faz uma requisição POST para /api/instituicoes, esta função é executada
router.post('/', function(req: any, res: any) {
  // Pega o nome da instituição que veio no corpo da requisição
  const nome = req.body.nome;

  // Verifica se o nome foi preenchido
  if (!nome) {
    // Se não foi preenchido, retorna erro 400 (Bad Request)
    return res.status(400).json({ error: 'Nome da instituição é obrigatório' });
  }

  // Comando SQL para inserir uma nova instituição na tabela
  const sql = 'INSERT INTO instituicoes (nome) VALUES (?)';
  
  // Executa o comando SQL no banco de dados
  // O valor ? será substituído pelo valor do array [nome]
  db.run(sql, [nome], function(err: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      // Verifica se o erro é porque já existe uma instituição com esse nome
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Instituição já cadastrada' });
      }
      // Se for outro tipo de erro, retorna erro 500 (Internal Server Error)
      return res.status(500).json({ error: err.message });
    }
    
    // Se tudo deu certo, retorna os dados da instituição criada
    return res.status(201).json({ 
      id: this.lastID,  // ID que foi gerado automaticamente pelo banco
      nome: nome 
    });
  });
});

// Rota PUT /api/instituicoes/:id - Atualiza uma instituição existente
// Quando alguém faz uma requisição PUT para /api/instituicoes/1 (por exemplo), esta função é executada
router.put('/:id', function(req: any, res: any) {
  // Pega o ID que veio na URL
  const id = req.params.id;
  // Pega o novo nome que veio no corpo da requisição
  const nome = req.body.nome;

  // Verifica se o nome foi preenchido
  if (!nome) {
    // Se não foi preenchido, retorna erro 400 (Bad Request)
    return res.status(400).json({ error: 'Nome da instituição é obrigatório' });
  }

  // Comando SQL para atualizar o nome da instituição que tem esse ID
  const sql = 'UPDATE instituicoes SET nome = ? WHERE id = ?';
  
  // Executa o comando SQL no banco de dados
  // Os valores ? serão substituídos pelos valores do array [nome, id]
  db.run(sql, [nome, id], function(err: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi atualizada, significa que não existe instituição com esse ID
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }
    
    // Se tudo deu certo, retorna os dados atualizados
    return res.json({ id: Number(id), nome: nome });
  });
});

// Rota DELETE /api/instituicoes/:id - Exclui uma instituição
// Quando alguém faz uma requisição DELETE para /api/instituicoes/1 (por exemplo), esta função é executada
router.delete('/:id', function(req: any, res: any) {
  // Pega o ID que veio na URL
  const id = req.params.id;

  // Comando SQL para excluir a instituição que tem esse ID
  const sql = 'DELETE FROM instituicoes WHERE id = ?';
  
  // Executa o comando SQL no banco de dados
  // O valor ? será substituído pelo valor do array [id]
  db.run(sql, [id], function(err: any) {
    // Se acontecer algum erro ao executar o SQL
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi excluída, significa que não existe instituição com esse ID
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Instituição não encontrada' });
    }
    
    // Se tudo deu certo, retorna uma mensagem de sucesso
    return res.json({ message: 'Instituição excluída com sucesso' });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

