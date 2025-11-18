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

router.post('/', (req: Request, res: Response) => {
  // ATENÇÃO: Adicionado 'turma_id' para uso na matrícula
  const { identificador, nome, turma_id } = req.body; 

  // Validação: 'turma_id' é necessário para a matrícula
  if (!identificador || !nome || !turma_id) {
    return res.status(400).json({ error: 'Campos identificador, nome e turma_id são obrigatórios.' });
  }

  const checkSql = `SELECT 1 FROM ALUNO WHERE matricula = ? LIMIT 1`;
  db.get(checkSql, [identificador], (checkErr, existing) => {
    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }
    if (existing) {
      return res.status(409).json({ error: 'Identificador já cadastrado' });
    }

    db.serialize(() => {
      // 1. Inserir na tabela ALUNO
      const insertAlunoSql = `INSERT INTO ALUNO (matricula, nome_completo) VALUES (?, ?)`;
      db.run(insertAlunoSql, [identificador, nome], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao inserir aluno: ' + err.message });
        }
  
        const alunoId = this.lastID; // ID do aluno recém-criado
  
        // 2. Inserir na tabela MATRICULA_TURMA
        const insertMatriculaSql = 'INSERT INTO MATRICULA_TURMA (fk_turma_id_turma, fk_aluno_id_aluno) VALUES (?, ?)';
        db.run(insertMatriculaSql, [turma_id, alunoId], (errMatricula: any) => {
          if (errMatricula) {
            // Em caso de erro na matrícula, o ideal seria reverter a inserção do ALUNO (necessita de transação, mas simplificaremos)
            console.error("Erro ao matricular aluno:", errMatricula.message);
            return res.status(500).json({ error: 'Aluno criado, mas erro ao matricular: ' + errMatricula.message });
          }
          
          // Sucesso: Aluno criado E matriculado.
          res.status(201).json({ id: alunoId, identificador, nome, message: 'Aluno cadastrado e matriculado com sucesso.' });
        });
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
// Exclui Aluno (DELETE) - CORRIGIDO PARA LIMPAR DEPENDÊNCIAS
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.serialize(() => {
    // Inicia a transação
    db.run('BEGIN TRANSACTION;');

    // 1. Deleta registros dependentes em REGISTRO_NOTA
    const sqlDeleteNotas = 'DELETE FROM REGISTRO_NOTA WHERE fk_aluno_id_aluno = ?';
    db.run(sqlDeleteNotas, [id], (err) => {
      if (err) {
        db.run('ROLLBACK;'); // Reverte tudo
        console.error("Erro ao deletar REGISTRO_NOTA:", err.message);
        return res.status(500).json({ error: 'Erro ao deletar notas do aluno.' });
      }

      // 2. Deleta registros dependentes em MATRICULA_TURMA
      const sqlDeleteMatriculas = 'DELETE FROM MATRICULA_TURMA WHERE fk_aluno_id_aluno = ?';
      db.run(sqlDeleteMatriculas, [id], (errMatricula) => {
        if (errMatricula) {
          db.run('ROLLBACK;'); // Reverte tudo
          console.error("Erro ao deletar MATRICULA_TURMA:", errMatricula.message);
          return res.status(500).json({ error: 'Erro ao deletar matrículas do aluno.' });
        }

        // 3. Deleta o ALUNO
        const sqlDeleteAluno = 'DELETE FROM ALUNO WHERE id_aluno = ?';
        db.run(sqlDeleteAluno, [id], function (errAluno) {
          if (errAluno) {
            db.run('ROLLBACK;'); // Reverte tudo
            console.error("Erro ao deletar ALUNO:", errAluno.message);
            return res.status(500).json({ error: 'Erro ao deletar aluno do sistema.' });
          }

          if (this.changes === 0) {
            db.run('ROLLBACK;');
            return res.status(404).json({ error: 'Aluno não encontrado.' });
          }

          // Confirma a transação
          db.run('COMMIT;', (errCommit) => {
            if (errCommit) {
              console.error("Erro ao fazer COMMIT:", errCommit.message);
              return res.status(500).json({ error: 'Erro ao finalizar a exclusão do aluno.' });
            }
            return res.json({ message: 'Aluno excluído do sistema com sucesso' });
          });
        });
      });
    });
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