// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de notas
const router = express.Router();

// Função auxiliar para registrar auditoria de notas
function registrarAuditoria(notaId: number, turmaId: number, disciplinaId: number, alunoId: number, componenteId: number, notaAnterior: number | null, notaNova: number | null, acao: string) {
  const sql = `
    INSERT INTO auditoria_notas (nota_id, turma_id, disciplina_id, aluno_id, componente_id, nota_anterior, nota_nova, acao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(sql, [notaId, turmaId, disciplinaId, alunoId, componenteId, notaAnterior, notaNova, acao], function(err: any) {
    // Ignora erros de auditoria para não quebrar o fluxo principal
    if (err) {
      console.error('Erro ao registrar auditoria:', err);
    }
  });
}

// Rota GET /api/notas/:turma_id/:disciplina_id - Busca todas as notas de uma turma/disciplina com componentes
router.get('/:turma_id/:disciplina_id', function(req: any, res: any) {
  const turmaId = req.params.turma_id;
  const disciplinaId = req.params.disciplina_id;

  // Query SQL para buscar todas as notas com informações dos alunos e componentes
  const sql = `
    SELECT 
      n.id,
      n.turma_id,
      n.disciplina_id,
      n.aluno_id,
      n.componente_id,
      n.nota,
      a.identificador,
      a.nome as aluno_nome,
      c.sigla as componente_sigla,
      c.nome as componente_nome
    FROM notas n
    INNER JOIN alunos a ON n.aluno_id = a.id
    INNER JOIN componentes_nota c ON n.componente_id = c.id
    WHERE n.turma_id = ? AND n.disciplina_id = ?
    ORDER BY a.nome ASC, c.sigla ASC
  `;

  db.all(sql, [turmaId, disciplinaId], function(err: any, rows: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Rota GET /api/notas/:turma_id/:disciplina_id/:componente_id - Busca notas de um componente específico
router.get('/:turma_id/:disciplina_id/:componente_id', function(req: any, res: any) {
  const turmaId = req.params.turma_id;
  const disciplinaId = req.params.disciplina_id;
  const componenteId = req.params.componente_id;

  // Query SQL para buscar notas de um componente específico
  const sql = `
    SELECT 
      n.id,
      n.turma_id,
      n.disciplina_id,
      n.aluno_id,
      n.componente_id,
      n.nota,
      a.identificador,
      a.nome as aluno_nome,
      c.sigla as componente_sigla,
      c.nome as componente_nome
    FROM notas n
    INNER JOIN alunos a ON n.aluno_id = a.id
    INNER JOIN componentes_nota c ON n.componente_id = c.id
    WHERE n.turma_id = ? AND n.disciplina_id = ? AND n.componente_id = ?
    ORDER BY a.nome ASC
  `;

  db.all(sql, [turmaId, disciplinaId, componenteId], function(err: any, rows: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Rota GET /api/notas/quadro/:turma_id/:disciplina_id - Retorna quadro completo de notas (alunos x componentes)
router.get('/quadro/:turma_id/:disciplina_id', function(req: any, res: any) {
  const turmaId = req.params.turma_id;
  const disciplinaId = req.params.disciplina_id;

  // Primeiro busca todos os alunos da turma
  db.all(`
    SELECT a.id, a.identificador, a.nome
    FROM turma_alunos ta
    INNER JOIN alunos a ON ta.aluno_id = a.id
    WHERE ta.turma_id = ?
    ORDER BY a.nome ASC
  `, [turmaId], function(errAlunos: any, alunos: any) {
    if (errAlunos) {
      return res.status(500).json({ error: errAlunos.message });
    }

    // Depois busca todos os componentes da disciplina
    db.all(`
      SELECT id, nome, sigla
      FROM componentes_nota
      WHERE disciplina_id = ?
      ORDER BY sigla ASC
    `, [disciplinaId], function(errComponentes: any, componentes: any) {
      if (errComponentes) {
        return res.status(500).json({ error: errComponentes.message });
      }

      // Busca todas as notas
      db.all(`
        SELECT aluno_id, componente_id, nota
        FROM notas
        WHERE turma_id = ? AND disciplina_id = ?
      `, [turmaId, disciplinaId], function(errNotas: any, notas: any) {
        if (errNotas) {
          return res.status(500).json({ error: errNotas.message });
        }

        // Organiza as notas em um mapa para acesso rápido
        var notasMap: any = {};
        for (var i = 0; i < notas.length; i++) {
          var nota = notas[i];
          var key = nota.aluno_id + '_' + nota.componente_id;
          notasMap[key] = nota.nota;
        }

        // Monta o quadro de notas
        var quadro = alunos.map(function(aluno: any) {
          var alunoNotas: any = {
            aluno_id: aluno.id,
            identificador: aluno.identificador,
            nome: aluno.nome,
            notas: {}
          };

          componentes.forEach(function(componente: any) {
            var key = aluno.id + '_' + componente.id;
            alunoNotas.notas[componente.sigla] = notasMap[key] !== undefined ? notasMap[key] : null;
          });

          return alunoNotas;
        });

        return res.json({
          alunos: quadro,
          componentes: componentes
        });
      });
    });
  });
});

// Rota POST /api/notas - Cria ou atualiza uma nota
router.post('/', function(req: any, res: any) {
  const turmaId = req.body.turma_id;
  const disciplinaId = req.body.disciplina_id;
  const alunoId = req.body.aluno_id;
  const componenteId = req.body.componente_id;
  const nota = req.body.nota;

  if (!turmaId || !disciplinaId || !alunoId || !componenteId) {
    return res.status(400).json({ error: 'turma_id, disciplina_id, aluno_id e componente_id são obrigatórios' });
  }

  if (nota === null || nota === undefined) {
    return res.status(400).json({ error: 'nota é obrigatória' });
  }

  const notaNum = parseFloat(nota);
  if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
    return res.status(400).json({ error: 'Nota deve ser um número entre 0 e 10' });
  }

  // Arredonda para 2 casas decimais
  const notaArredondada = Math.round(notaNum * 100) / 100;

  // Primeiro verifica se a nota já existe
  db.get('SELECT id FROM notas WHERE turma_id = ? AND disciplina_id = ? AND aluno_id = ? AND componente_id = ?', 
    [turmaId, disciplinaId, alunoId, componenteId], function(errGet: any, row: any) {
    if (errGet) {
      return res.status(500).json({ error: errGet.message });
    }

    if (row) {
      // Se a nota já existe, busca a nota anterior antes de atualizar
      db.get('SELECT nota FROM notas WHERE id = ?', [row.id], function(errGetNota: any, notaAtual: any) {
        const notaAnterior = notaAtual ? notaAtual.nota : null;
        
        // Atualiza a nota
        const sqlUpdate = 'UPDATE notas SET nota = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?';
        db.run(sqlUpdate, [notaArredondada, row.id], function(errUpdate: any) {
          if (errUpdate) {
            return res.status(500).json({ error: errUpdate.message });
          }
          
          // Registra auditoria
          registrarAuditoria(row.id, turmaId, disciplinaId, alunoId, componenteId, notaAnterior, notaArredondada, 'ATUALIZADA');
          
          return res.json({ 
            id: row.id,
            turma_id: turmaId,
            disciplina_id: disciplinaId,
            aluno_id: alunoId,
            componente_id: componenteId,
            nota: notaArredondada,
            message: 'Nota atualizada com sucesso'
          });
        });
      });
    } else {
      // Se a nota não existe, insere
      const sqlInsert = 'INSERT INTO notas (turma_id, disciplina_id, aluno_id, componente_id, nota, atualizado_em) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)';
      db.run(sqlInsert, [turmaId, disciplinaId, alunoId, componenteId, notaArredondada], function(errInsert: any) {
        if (errInsert) {
          return res.status(500).json({ error: errInsert.message });
        }
        
        const notaId = this.lastID;
        
        // Registra auditoria
        registrarAuditoria(notaId, turmaId, disciplinaId, alunoId, componenteId, null, notaArredondada, 'CRIADA');
        
        return res.status(201).json({ 
          id: notaId,
          turma_id: turmaId,
          disciplina_id: disciplinaId,
          aluno_id: alunoId,
          componente_id: componenteId,
          nota: notaArredondada,
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

  // Arredonda para 2 casas decimais
  const notaArredondada = Math.round(notaNum * 100) / 100;

  // Busca a nota anterior e informações da nota antes de atualizar
  db.get('SELECT turma_id, disciplina_id, aluno_id, componente_id, nota FROM notas WHERE id = ?', [id], function(errGet: any, notaAtual: any) {
    if (errGet) {
      return res.status(500).json({ error: errGet.message });
    }

    if (!notaAtual) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    const notaAnterior = notaAtual.nota;

    const sql = 'UPDATE notas SET nota = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?';

    db.run(sql, [notaArredondada, id], function(err: any) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Nota não encontrada' });
      }

      // Registra auditoria
      registrarAuditoria(Number(id), notaAtual.turma_id, notaAtual.disciplina_id, notaAtual.aluno_id, notaAtual.componente_id, notaAnterior, notaArredondada, 'ATUALIZADA');

      return res.json({ 
        id: Number(id),
        nota: notaArredondada,
        message: 'Nota atualizada com sucesso'
      });
    });
  });
});

// Rota DELETE /api/notas/:id - Exclui uma nota
router.delete('/:id', function(req: any, res: any) {
  const id = req.params.id;

  // Busca informações da nota antes de excluir para registrar auditoria
  db.get('SELECT turma_id, disciplina_id, aluno_id, componente_id, nota FROM notas WHERE id = ?', [id], function(errGet: any, notaAtual: any) {
    if (errGet) {
      return res.status(500).json({ error: errGet.message });
    }

    if (!notaAtual) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    const sql = 'DELETE FROM notas WHERE id = ?';

    db.run(sql, [id], function(err: any) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Nota não encontrada' });
      }

      // Registra auditoria antes de excluir (usa nota_id = id mesmo após exclusão para histórico)
      registrarAuditoria(Number(id), notaAtual.turma_id, notaAtual.disciplina_id, notaAtual.aluno_id, notaAtual.componente_id, notaAtual.nota, null, 'EXCLUIDA');

      return res.json({ message: 'Nota excluída com sucesso' });
    });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;
