// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa

// Express & BD
import { Router, Request, Response } from 'express';
import db from '../database';
const router = Router();

// Listar Alunos (GET)
router.get('/', (_req: Request, res: Response) => {
  const sql = `
    SELECT
      id_aluno AS id,
      matricula AS identificador,
      nome_completo AS nome
    FROM ALUNO
    ORDER BY nome_completo ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Buscar Aluno (GET)
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id_aluno AS id,
      matricula AS identificador,
      nome_completo AS nome
    FROM ALUNO
    WHERE id_aluno = ?
  `;

  db.get(sql, [id], (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    return res.json(row);
  });
});

// Criar Aluno (POST)
router.post('/', (req: Request, res: Response) => {
  const { identificador, nome } = req.body ?? {};

  if (!identificador || !nome) {
    return res.status(400).json({
      error: 'Identificador e nome do aluno são obrigatórios'
    });
  }

  const checkSql = `SELECT 1 FROM ALUNO WHERE matricula = ? LIMIT 1`;
  db.get(checkSql, [identificador], (checkErr, existing) => {
    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }
    if (existing) {
      return res.status(409).json({ error: 'Identificador já cadastrado' });
    }

    const insertSql = `INSERT INTO ALUNO (matricula, nome_completo) VALUES (?, ?)`;
    db.run(insertSql, [identificador, nome], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      return res.status(201).json({
        id: this.lastID,
        identificador,
        nome
      });
    });
  });
});

// Importa CSV (POST)
router.post('/importar', (req: Request, res: Response) => {
  const { alunos, turma_id } = req.body ?? {};

  if (!alunos || !Array.isArray(alunos) || alunos.length === 0) {
    return res.status(400).json({
      error: 'Lista de alunos é obrigatória'
    });
  }

  const sqlAlunoCheck = `SELECT id_aluno FROM ALUNO WHERE matricula = ? LIMIT 1`;
  const sqlAlunoInsert = `INSERT INTO ALUNO (matricula, nome_completo) VALUES (?, ?)`;

  const sqlMatriculaTurma = `
    INSERT OR IGNORE INTO MATRICULA_TURMA (fk_turma_id_turma, fk_aluno_id_aluno)
    VALUES (?, (SELECT id_aluno FROM ALUNO WHERE matricula = ?))
  `;

  let processados = 0;
  let erros: string[] = [];

  alunos.forEach((aluno: { identificador: string; nome: string }) => {
    if (!aluno.identificador || !aluno.nome) {
      erros.push(`Aluno inválido: ${JSON.stringify(aluno)}`);
      processados++;
      if (processados === alunos.length) {
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

    db.get(sqlAlunoCheck, [aluno.identificador], (checkErr, row: any) => {
      if (checkErr) {
        erros.push(`Erro ao verificar aluno ${aluno.identificador}: ${checkErr.message}`);
        processados++;
        if (processados === alunos.length) {
          if (erros.length > 0) {
            return res.status(500).json({ error: 'Erros ao importar alunos', detalhes: erros });
          }
          return res.status(201).json({
            message: `${alunos.length} aluno(s) importado(s) com sucesso`,
            total: alunos.length
          });
        }
        return;
      }

      const continueAfterInsert = () => {
        if (turma_id) {
          db.run(sqlMatriculaTurma, [turma_id, aluno.identificador], function (err) {
            if (err) {
              erros.push(`Erro ao associar aluno ${aluno.identificador} à turma: ${err.message}`);
            }
            processados++;
            if (processados === alunos.length) {
              if (erros.length > 0) {
                return res.status(500).json({ error: 'Erros ao importar alunos', detalhes: erros });
              }
              return res.status(201).json({
                message: `${alunos.length} aluno(s) importado(s) com sucesso`,
                total: alunos.length
              });
            }
          });
        } else {
          processados++;
          if (processados === alunos.length) {
            if (erros.length > 0) {
              return res.status(500).json({ error: 'Erros ao importar alunos', detalhes: erros });
            }
            return res.status(201).json({
              message: `${alunos.length} aluno(s) importado(s) com sucesso`,
              total: alunos.length
            });
          }
        }
      };

      if (row && row.id_aluno) {
        continueAfterInsert();
      } else {
        db.run(sqlAlunoInsert, [aluno.identificador, aluno.nome], function (insertErr) {
          if (insertErr) {
            if (insertErr.message.includes('UNIQUE constraint failed')) {
            } else {
              erros.push(`Erro ao inserir aluno ${aluno.identificador}: ${insertErr.message}`);
            }
          }
          continueAfterInsert();
        });
      }
    });
  });
});

// Adicionar à Turma (POST)
router.post('/:turma_id/adicionar', (req: Request, res: Response) => {
  const { turma_id } = req.params;
  const { aluno_id } = req.body ?? {};

  if (!aluno_id) {
    return res.status(400).json({ error: 'ID do aluno é obrigatório' });
  }

  const sql = `
    INSERT INTO MATRICULA_TURMA (fk_turma_id_turma, fk_aluno_id_aluno)
    VALUES (?, ?)
  `;

  db.run(sql, [turma_id, aluno_id], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Aluno já está nesta turma' });
      }
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(404).json({ error: 'Turma ou aluno não encontrado' });
      }
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      message: 'Aluno adicionado à turma com sucesso',
      turma_id: Number(turma_id),
      aluno_id: Number(aluno_id)
    });
  });
});

// Atualiza Aluno (PUT)
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { identificador, nome } = req.body ?? {};

  if (!identificador && !nome) {
    return res.status(400).json({ error: 'Pelo menos um campo (identificador ou nome) deve ser fornecido' });
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (identificador) {
    updates.push('matricula = ?');
    values.push(identificador);
  }

  if (nome) {
    updates.push('nome_completo = ?');
    values.push(nome);
  }

  values.push(id);

  const sql = `UPDATE ALUNO SET ${updates.join(', ')} WHERE id_aluno = ?`;

  db.run(sql, values, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Identificador já cadastrado' });
      }
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    return res.json({
      id: Number(id),
      identificador: identificador || undefined,
      nome: nome || undefined
    });
  });
});

// Exclui Aluno (DELETE)
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = 'DELETE FROM ALUNO WHERE id_aluno = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    return res.json({ message: 'Aluno excluído com sucesso' });
  });
});

// Remove da Turma (DELETE)
router.delete('/:turma_id/remover/:aluno_id', (req: Request, res: Response) => {
  const { turma_id, aluno_id } = req.params;

  const sql = `
    DELETE FROM MATRICULA_TURMA
    WHERE fk_turma_id_turma = ? AND fk_aluno_id_aluno = ?
  `;

  db.run(sql, [turma_id, aluno_id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Aluno não está nesta turma' });
    }

    return res.json({ message: 'Aluno removido da turma com sucesso' });
  });
});

// Exportar Router
export default router;