// autor: Cadu Spadari
// Importa tipos do Express para requisições e respostas
import { Router, Request, Response } from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de cadastro inicial
const router = Router();

// Rota POST /api/cadastro-inicial - Cria uma instituição e um curso ao mesmo tempo
router.post('/', (req: Request, res: Response) => {
  // Extrai os dados do corpo da requisição
  const { nome_instituicao, nome_curso } = req.body ?? {};

  // Valida se os campos obrigatórios foram preenchidos
  if (!nome_instituicao || !nome_curso) {
    return res.status(400).json({ 
      error: 'Nome da instituição e nome do curso são obrigatórios' 
    });
  }

  // Query SQL para inserir a nova instituição (ou usar existente)
  const sqlInstituicao = 'INSERT OR IGNORE INTO instituicoes (nome) VALUES (?)';
  
  // Executa a query para inserir a instituição
  db.run(sqlInstituicao, [nome_instituicao], function (err) {
    // Se houver erro, retorna erro
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Busca o ID da instituição (pode ser recém-criada ou já existente)
    db.get('SELECT id FROM instituicoes WHERE nome = ?', [nome_instituicao], (err, row: any) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const instituicaoId = row.id;

      // Query SQL para inserir o novo curso
      const sqlCurso = 'INSERT INTO cursos (nome, instituicao_id) VALUES (?, ?)';
      
      // Executa a query para inserir o curso
      db.run(sqlCurso, [nome_curso, instituicaoId], function (err) {
        // Se houver erro, retorna erro
        if (err) {
          // Verifica se o erro é de curso duplicado na mesma instituição
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Curso já cadastrado nesta instituição' });
          }
          return res.status(500).json({ error: err.message });
        }

        // Retorna os dados criados
        return res.status(201).json({ 
          instituicao: {
            id: instituicaoId,
            nome: nome_instituicao
          },
          curso: {
            id: this.lastID,
            nome: nome_curso,
            instituicao_id: instituicaoId
          }
        });
      });
    });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

