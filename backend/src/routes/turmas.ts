// autor: Cadu Spadari (adaptado para novo schema TURMA com fk_disciplina e fk_curso)
// Importa tipos do Express para requisições e respostas
import { Router, Request, Response } from 'express';
// Importa a conexão do banco de dados
import db from '../database';

const router = Router();

/**
 * Helper: transforma possíveis strings vazias/nulos em número (ou null)
 */
function toNumberOrNull(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * GET /api/turmas
 */
router.get('/', (_req: Request, res: Response) => {
  const sql = `
    SELECT
      t.id_turma AS id,
      t.nome_turma AS nome,
      d.fk_curso_id_curso AS curso_id,
      c.nome_curso AS curso_nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM TURMA t
    INNER JOIN DISCIPLINA d ON t.fk_disciplina_id_disciplina = d.id_disciplina
    INNER JOIN CURSO c ON d.fk_curso_id_curso = c.id_curso
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    ORDER BY i.nome_instituicao, c.nome_curso, t.nome_turma
  `;

  db.all(sql, [], (err: any, rows: any) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

/**
 * GET /api/turmas/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      t.id_turma AS id,
      t.nome_turma AS nome,
      d.fk_curso_id_curso AS curso_id,
      c.nome_curso AS curso_nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM TURMA t
    INNER JOIN DISCIPLINA d ON t.fk_disciplina_id_disciplina = d.id_disciplina
    INNER JOIN CURSO c ON d.fk_curso_id_curso = c.id_curso
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    WHERE t.id_turma = ?
  `;

  db.get(sql, [id], (err: any, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Turma não encontrada' });
    return res.json(row);
  });
});

/**
 * POST /api/turmas
 * - aceita payload { nome, curso_id, disciplina_ids }
 * - tenta usar a primeira disciplina válida que pertença ao curso selecionado
 * - se não vier disciplina_ids, escolhe a primeira disciplina do curso (fallback)
 * - se não houver disciplina no curso, retorna erro explicando o motivo
 */
router.post('/', (req: Request, res: Response) => {
  const nomeRaw = req.body?.nome;
  const cursoIdRaw = req.body?.curso_id;
  const disciplinaIdsRaw = req.body?.disciplina_ids;

  const nome = typeof nomeRaw === 'string' ? nomeRaw.trim() : nomeRaw;
  const curso_id = toNumberOrNull(cursoIdRaw);
  const disciplina_ids = Array.isArray(disciplinaIdsRaw)
    ? disciplinaIdsRaw.map((x: any) => toNumberOrNull(x)).filter((x: any) => x !== null)
    : [];

  // Valida campos obrigatórios (nome e curso_id)
  if (!nome || !curso_id) {
    return res.status(400).json({ error: 'Nome da turma e ID do curso são obrigatórios' });
  }

  // Verifica se o curso existe
  db.get('SELECT id_curso, nome_curso FROM CURSO WHERE id_curso = ?', [curso_id], (errCurso: any, cursoRow: any) => {
    if (errCurso) return res.status(500).json({ error: errCurso.message });
    if (!cursoRow) return res.status(404).json({ error: 'Curso não encontrado' });

    // Função inserção utilizando disciplina definitiva
    const inserirTurma = (disciplinaIdToUse: number) => {
      const sqlTurma = `
        INSERT INTO TURMA (nome_turma, fk_disciplina_id_disciplina, fk_curso_id_curso)
        VALUES (?, ?, ?)
      `;
      db.run(sqlTurma, [nome, disciplinaIdToUse, curso_id], function (errInsert: any) {
        if (errInsert) {
          if (errInsert.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Turma já cadastrada neste curso/disciplina' });
          }
          if (errInsert.message.includes('FOREIGN KEY constraint failed')) {
            return res.status(404).json({ error: 'Disciplina ou curso não encontrado' });
          }
          return res.status(500).json({ error: errInsert.message });
        }

        const turmaId = this.lastID;

        if (disciplina_ids.length > 1) {
          return res.status(201).json({
            id: turmaId,
            nome,
            curso_id: Number(curso_id),
            disciplina_ids,
            avisos: ['A nova modelagem aceita apenas uma disciplina por turma; apenas o primeiro disciplina_id foi associada.']
          });
        }

        return res.status(201).json({
          id: turmaId,
          nome,
          curso_id: Number(curso_id),
          disciplina_ids: [Number(disciplinaIdToUse)]
        });
      });
    };

    // Se vier disciplina_ids: procurar a primeira que pertença ao curso (tolerante ao front que envia checkboxes de outros cursos)
    if (disciplina_ids.length > 0) {
      // Monta placeholders para IN (...)
      const placeholders = disciplina_ids.map(() => '?').join(',');
      const sql = `SELECT id_disciplina FROM DISCIPLINA WHERE id_disciplina IN (${placeholders}) AND fk_curso_id_curso = ? LIMIT 1`;
      const params = [...disciplina_ids, curso_id];

      db.get(sql, params, (errDiscSel: any, discSelRow: any) => {
        if (errDiscSel) return res.status(500).json({ error: errDiscSel.message });
        if (discSelRow && discSelRow.id_disciplina) {
          // Achou uma disciplina dentre as enviadas que pertence ao curso -> usa essa
          return inserirTurma(discSelRow.id_disciplina);
        }

        // Nenhuma das disciplinas enviadas pertence ao curso: tentamos pegar a primeira disciplina do curso (fallback)
        db.get('SELECT id_disciplina FROM DISCIPLINA WHERE fk_curso_id_curso = ? LIMIT 1', [curso_id], (errFind: any, found: any) => {
          if (errFind) return res.status(500).json({ error: errFind.message });
          if (!found) {
            // Não existe disciplina no curso
            return res.status(400).json({ error: 'Nenhuma disciplina encontrada para o curso informado. Informe disciplina_ids válidas ou crie uma disciplina para o curso.' });
          }
          // usamos a disciplina encontrada no curso (mesmo que não tenha sido enviada pelo front)
          return inserirTurma(found.id_disciplina);
        });
      });

      return;
    }

    // Se não veio disciplina_ids: escolhemos a primeira disciplina do curso (como fallback)
    db.get('SELECT id_disciplina FROM DISCIPLINA WHERE fk_curso_id_curso = ? LIMIT 1', [curso_id], (errFind2: any, found2: any) => {
      if (errFind2) return res.status(500).json({ error: errFind2.message });
      if (!found2) {
        return res.status(400).json({ error: 'Nenhuma disciplina encontrada para o curso informado. Informe disciplina_ids ou crie uma disciplina para o curso.' });
      }
      return inserirTurma(found2.id_disciplina);
    });
  });
});

/**
 * PUT /api/turmas/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const nomeRaw = req.body?.nome;
  const nome = typeof nomeRaw === 'string' ? nomeRaw.trim() : nomeRaw;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da turma é obrigatório' });
  }

  const sql = 'UPDATE TURMA SET nome_turma = ? WHERE id_turma = ?';

  db.run(sql, [nome, id], function (err: any) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Turma não encontrada' });
    return res.json({ id: Number(id), nome });
  });
});

/**
 * DELETE /api/turmas/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const sql = 'DELETE FROM TURMA WHERE id_turma = ?';
  db.run(sql, [id], function (err: any) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Turma não encontrada' });
    return res.json({ message: 'Turma excluída com sucesso' });
  });
});

/**
 * GET /api/turmas/:id/alunos
 */
router.get('/:id/alunos', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      a.id_aluno AS id,
      a.matricula AS identificador,
      a.nome_completo AS nome,
      NULL AS criado_em
    FROM ALUNO a
    INNER JOIN MATRICULA_TURMA mt ON a.id_aluno = mt.fk_aluno_id_aluno
    WHERE mt.fk_turma_id_turma = ?
    ORDER BY a.nome_completo
  `;

  db.all(sql, [id], (err: any, rows: any) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

/**
 * GET /api/turmas/:id/disciplinas
 */
router.get('/:id/disciplinas', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      d.id_disciplina AS id,
      d.nome_disciplina AS nome,
      NULL AS criado_em
    FROM DISCIPLINA d
    INNER JOIN TURMA t ON t.fk_disciplina_id_disciplina = d.id_disciplina
    WHERE t.id_turma = ?
  `;

  db.all(sql, [id], (err: any, rows: any) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

export default router;