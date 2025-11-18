// Autor Geral: Cadu Spadari - Autor Código BD: Felipe N. C. Moussa
// Express & BD
import { Router, Request, Response } from 'express';
import db from '../database';
const router = Router();

// Lista todos os cursos (GET)
router.get('/', (_req: Request, res: Response) => {
  const sql = `
    SELECT
      c.id_curso AS id,
      c.nome_curso AS nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM CURSO c
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    ORDER BY i.nome_instituicao, c.nome_curso
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json(rows);
  });
});

// Busca curso por ID (GET)
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = `
    SELECT
      c.id_curso AS id,
      c.nome_curso AS nome,
      c.fk_instituicao_id_instituicao AS instituicao_id,
      i.nome_instituicao AS instituicao_nome,
      NULL AS criado_em
    FROM CURSO c
    INNER JOIN INSTITUICAO i ON c.fk_instituicao_id_instituicao = i.id_instituicao
    WHERE c.id_curso = ?
  `;

  db.get(sql, [id], (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    return res.json(row);
  });
});

// Cria novo curso (POST)
router.post('/', (req: Request, res: Response) => {
  const { nome, instituicao_id } = req.body ?? {};

  if (!nome || !instituicao_id) {
    return res.status(400).json({
      error: 'Nome do curso e ID da instituição são obrigatórios'
    });
  }

  const sql = 'INSERT INTO CURSO (nome_curso, fk_instituicao_id_instituicao) VALUES (?, ?)';

  db.run(sql, [nome, instituicao_id], function (err: any) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Curso já cadastrado nesta instituição' });
      }
      if (err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(404).json({ error: 'Instituição não encontrada' });
      }
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      id: this.lastID,
      nome,
      instituicao_id: Number(instituicao_id)
    });
  });
});

// Atualiza curso (PUT)
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome } = req.body ?? {};

  if (!nome) {
    return res.status(400).json({ error: 'Nome do curso é obrigatório' });
  }

  const sql = 'UPDATE CURSO SET nome_curso = ? WHERE id_curso = ?';

  db.run(sql, [nome, id], function (err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    return res.json({ id: Number(id), nome });
  });
});

// Exclui curso (DELETE)
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const sql = 'DELETE FROM CURSO WHERE id_curso = ?';

  db.run(sql, [id], function (err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    return res.json({ message: 'Curso excluído com sucesso' });
  });
});

// Exportar Router
export default router;