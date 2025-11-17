// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de cadastro inicial
const router = express.Router();

// Rota POST /api/cadastro-inicial - Cria uma instituição e um curso ao mesmo tempo
router.post('/', function(req: any, res: any) {
  // Extrai os dados do corpo da requisição
  const nomeInstituicao = req.body.nome_instituicao;
  const nomeCurso = req.body.nome_curso;

  // Valida se os campos obrigatórios foram preenchidos
  if (!nomeInstituicao || !nomeCurso) {
    return res.status(400).json({ 
      error: 'Nome da instituição e nome do curso são obrigatórios' 
    });
  }

  // Query SQL para inserir a nova instituição (ou usar existente)
  const sqlInstituicao = 'INSERT OR IGNORE INTO instituicoes (nome) VALUES (?)';
  
  // Executa a query para inserir a instituição
  db.run(sqlInstituicao, [nomeInstituicao], function (err: any) {
    // Se houver erro, retorna erro
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Busca o ID da instituição (pode ser recém-criada ou já existente)
    db.get('SELECT id FROM instituicoes WHERE nome = ?', [nomeInstituicao], function(errGet: any, row: any) {
      if (errGet) {
        return res.status(500).json({ error: errGet.message });
      }

      const instituicaoId = row.id;

      // Query SQL para inserir o novo curso
      const sqlCurso = 'INSERT INTO cursos (nome, instituicao_id) VALUES (?, ?)';
      
      // Executa a query para inserir o curso
      db.run(sqlCurso, [nomeCurso, instituicaoId], function (errCurso: any) {
        // Se houver erro, retorna erro
        if (errCurso) {
          // Verifica se o erro é de curso duplicado na mesma instituição
          if (errCurso.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Curso já cadastrado nesta instituição' });
          }
          return res.status(500).json({ error: errCurso.message });
        }

        // Retorna os dados criados
        return res.status(201).json({ 
          instituicao: {
            id: instituicaoId,
            nome: nomeInstituicao
          },
          curso: {
            id: this.lastID,
            nome: nomeCurso,
            instituicao_id: instituicaoId
          }
        });
      });
    });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

