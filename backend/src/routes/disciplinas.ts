// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import db from '../database';
const router = Router();

// Lista todas as disciplinas (GET)
router.get('/', function(_req: Request, res: Response) {
  const sql = `
    SELECT
      id_disciplina AS id,
      nome_disciplina AS nome,
      sigla,
      codigo,
      periodo,
      formula_calculo
    FROM DISCIPLINA
    ORDER BY nome_disciplina ASC
  `;

  db.all(sql, [], function(err: any, rows: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Busca disciplina por ID (GET)
router.get('/:id', function(req: Request, res: Response) {
  const id = req.params.id;

  const sql = `
    SELECT
      id_disciplina AS id,
      nome_disciplina AS nome,
      sigla,
      codigo,
      periodo,
      formula_calculo
    FROM DISCIPLINA
    WHERE id_disciplina = ?
  `;

  db.get(sql, [id], function(err: any, row: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    return res.json(row);
  });
});

// Cria nova disciplina (POST)
router.post('/', function(req: Request, res: Response) {
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const codigo = req.body.codigo;
  const periodo = req.body.periodo;
  const formula_calculo = req.body.formula_calculo ?? null;
  const curso_id_body = req.body.curso_id !== undefined && req.body.curso_id !== null
  ? Number(req.body.curso_id)
  : null;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da disciplina é obrigatório' });
  }

  const inserirDisciplina = (fk_curso_id: number) => {
    const sql = `
      INSERT INTO DISCIPLINA (nome_disciplina, sigla, codigo, periodo, formula_calculo, fk_curso_id_curso)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [nome, sigla || null, codigo || null, periodo || null, formula_calculo, fk_curso_id], function (err: any) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      return res.status(201).json({
        id: this.lastID,
        nome,
        sigla: sigla || null,
        codigo: codigo || null,
        periodo: periodo || null,
        formula_calculo: formula_calculo
      });
    });
  };

  if (curso_id_body !== null && !Number.isNaN(curso_id_body)) {
    return inserirDisciplina(Number(curso_id_body));
  }

  db.get('SELECT id_curso FROM CURSO LIMIT 1', [], (err: any, row: any) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row || !row.id_curso) {
      return res.status(400).json({
        error: 'Não existe curso cadastrado no sistema. Para criar uma disciplina, crie primeiro um curso ou envie "curso_id" no corpo da requisição.'
      });
    }

    return inserirDisciplina(row.id_curso);
  });
});

// Atualiza disciplina (PUT)
router.put('/:id', function(req: Request, res: Response) {
  const id = req.params.id;
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const codigo = req.body.codigo;
  const periodo = req.body.periodo;
  const formula_calculo = req.body.formula_calculo ?? null;

  if (!nome) {
    return res.status(400).json({ error: 'Nome da disciplina é obrigatório' });
  }

  const sql = `
    UPDATE DISCIPLINA
    SET nome_disciplina = ?, sigla = ?, codigo = ?, periodo = ?, formula_calculo = ?
    WHERE id_disciplina = ?
  `;

  db.run(sql, [nome, sigla || null, codigo || null, periodo || null, formula_calculo, id], function (err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    return res.json({
      id: Number(id),
      nome,
      sigla: sigla || null,
      codigo: codigo || null,
      periodo: periodo || null,
      formula_calculo: formula_calculo
    });
  });
});

// Exclui disciplina (DELETE)
router.delete('/:id', function(req: Request, res: Response) {
  const id = req.params.id;

  const sql = 'DELETE FROM DISCIPLINA WHERE id_disciplina = ?';

  db.run(sql, [id], function (err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    return res.json({ message: 'Disciplina excluída com sucesso' });
  });
});

// Exportar Router
export default router;