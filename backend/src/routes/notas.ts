// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de notas
const router = express.Router();

// Rota GET /api/notas - Busca notas por turma e disciplina
router.get('/', function(req: any, res: any) {
  const turmaId = req.query.turma_id;
  const disciplinaId = req.query.disciplina_id;

  if (!turmaId || !disciplinaId) {
    return res.status(400).json({ error: 'turma_id e disciplina_id são obrigatórios' });
  }

  // Query SQL para buscar notas com informações dos alunos
  const sql = `
    SELECT 
      n.id,
      n.turma_id,
      n.disciplina_id,
      n.aluno_id,
      n.nota,
      a.identificador,
      a.nome as aluno_nome
    FROM notas n
    INNER JOIN alunos a ON n.aluno_id = a.id
    WHERE n.turma_id = ? AND n.disciplina_id = ?
    ORDER BY a.nome ASC
  `;

  db.all(sql, [turmaId, disciplinaId], function(err: any, rows: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Rota GET /api/notas/alunos - Busca alunos de uma turma com suas notas
router.get('/alunos', function(req: any, res: any) {
  const turmaId = req.query.turma_id;
  const disciplinaId = req.query.disciplina_id;

  if (!turmaId || !disciplinaId) {
    return res.status(400).json({ error: 'turma_id e disciplina_id são obrigatórios' });
  }

  // Query SQL para buscar alunos da turma com suas notas (se existirem)
  const sql = `
    SELECT 
      a.id as aluno_id,
      a.identificador,
      a.nome,
      n.nota,
      n.id as nota_id
    FROM turma_alunos ta
    INNER JOIN alunos a ON ta.aluno_id = a.id
    LEFT JOIN notas n ON n.aluno_id = a.id AND n.turma_id = ? AND n.disciplina_id = ?
    WHERE ta.turma_id = ?
    ORDER BY a.nome ASC
  `;

  db.all(sql, [turmaId, disciplinaId, turmaId], function(err: any, rows: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Rota POST /api/notas - Cria ou atualiza uma nota
router.post('/', function(req: any, res: any) {
  const turmaId = req.body.turma_id;
  const disciplinaId = req.body.disciplina_id;
  const alunoId = req.body.aluno_id;
  const nota = req.body.nota;

  if (!turmaId || !disciplinaId || !alunoId) {
    return res.status(400).json({ error: 'turma_id, disciplina_id e aluno_id são obrigatórios' });
  }

  if (nota === null || nota === undefined) {
    return res.status(400).json({ error: 'nota é obrigatória' });
  }

  const notaNum = parseFloat(nota);
  if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
    return res.status(400).json({ error: 'Nota deve ser um número entre 0 e 10' });
  }

  // Primeiro verifica se a nota já existe
  db.get('SELECT id FROM notas WHERE turma_id = ? AND disciplina_id = ? AND aluno_id = ?', [turmaId, disciplinaId, alunoId], function(errGet: any, row: any) {
    if (errGet) {
      return res.status(500).json({ error: errGet.message });
    }

    if (row) {
      // Se a nota já existe, atualiza
      const sqlUpdate = 'UPDATE notas SET nota = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sqlUpdate, [notaNum, row.id], function(errUpdate: any) {
        if (errUpdate) {
          return res.status(500).json({ error: errUpdate.message });
        }
        return res.json({ 
          id: row.id,
          turma_id: turmaId,
          disciplina_id: disciplinaId,
          aluno_id: alunoId,
          nota: notaNum,
          message: 'Nota atualizada com sucesso'
        });
      });
    } else {
      // Se a nota não existe, insere
      const sqlInsert = 'INSERT INTO notas (turma_id, disciplina_id, aluno_id, nota, atualizado_em) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)';
      db.run(sqlInsert, [turmaId, disciplinaId, alunoId, notaNum], function(errInsert: any) {
        if (errInsert) {
          return res.status(500).json({ error: errInsert.message });
        }
        return res.status(201).json({ 
          id: this.lastID,
          turma_id: turmaId,
          disciplina_id: disciplinaId,
          aluno_id: alunoId,
          nota: notaNum,
          message: 'Nota salva com sucesso'
        });
      });
    }
  });
});

// Rota PUT /api/notas/:id - Atualiza uma nota específica
router.put('/:id', function(req: any, res: any) {
  const id = req.params.id;
  const nota = req.body.nota;

  if (nota === null || nota === undefined) {
    return res.status(400).json({ error: 'nota é obrigatória' });
  }

  const notaNum = parseFloat(nota);
  if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
    return res.status(400).json({ error: 'Nota deve ser um número entre 0 e 10' });
  }

  const sql = 'UPDATE notas SET nota = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?';

  db.run(sql, [notaNum, id], function(err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    return res.json({ 
      id: Number(id),
      nota: notaNum,
      message: 'Nota atualizada com sucesso'
    });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

