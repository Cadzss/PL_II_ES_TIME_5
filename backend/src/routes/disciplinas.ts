// autor: Cadu Spadari
// Importa o Express (biblioteca para criar servidor web)
import express from 'express';
// Importa a conexão do banco de dados
import db from '../database';

// Cria um roteador do Express para agrupar as rotas de disciplinas
const router = express.Router();

// Rota GET /api/disciplinas - Lista todas as disciplinas
router.get('/', function(req: any, res: any) {
  // Query SQL para buscar todas as disciplinas ordenadas por nome
  const sql = 'SELECT * FROM disciplinas ORDER BY nome ASC';
  
  // Executa a query no banco de dados
  db.all(sql, [], function(err: any, rows: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna a lista de disciplinas
    return res.json(rows);
  });
});

// Rota GET /api/disciplinas/:id - Busca uma disciplina específica por ID
router.get('/:id', function(req: any, res: any) {
  // Extrai o ID da URL
  const id = req.params.id;

  // Query SQL para buscar a disciplina pelo ID
  const sql = 'SELECT * FROM disciplinas WHERE id = ?';
  
  // Executa a query no banco de dados
  db.get(sql, [id], function(err: any, row: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se não encontrar a disciplina, retorna erro 404
    if (!row) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }

    // Retorna os dados da disciplina
    return res.json(row);
  });
});

// Rota POST /api/disciplinas - Cria uma nova disciplina
router.post('/', function(req: any, res: any) {
  // Extrai os dados da disciplina do corpo da requisição
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const codigo = req.body.codigo;
  const periodo = req.body.periodo;

  // Valida se o nome foi preenchido
  if (!nome) {
    return res.status(400).json({ error: 'Nome da disciplina é obrigatório' });
  }

  // Query SQL para inserir a nova disciplina
  const sql = 'INSERT INTO disciplinas (nome, sigla, codigo, periodo) VALUES (?, ?, ?, ?)';
  
  // Executa a query no banco de dados
  db.run(sql, [nome, sigla || null, codigo || null, periodo || null], function (err: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Retorna os dados da disciplina criada
    return res.status(201).json({ 
      id: this.lastID, 
      nome: nome,
      sigla: sigla || null,
      codigo: codigo || null,
      periodo: periodo || null
    });
  });
});

// Rota PUT /api/disciplinas/:id - Atualiza uma disciplina existente
router.put('/:id', function(req: any, res: any) {
  // Extrai o ID da URL e os dados do corpo da requisição
  const id = req.params.id;
  const nome = req.body.nome;
  const sigla = req.body.sigla;
  const codigo = req.body.codigo;
  const periodo = req.body.periodo;
  const formulaNotaFinal = req.body.formula_nota_final;

  // Valida se o nome foi preenchido
  if (!nome) {
    return res.status(400).json({ error: 'Nome da disciplina é obrigatório' });
  }

  // Se houver fórmula, valida se todos os componentes estão sendo utilizados
  if (formulaNotaFinal && formulaNotaFinal.trim() !== '') {
    db.all('SELECT sigla FROM componentes_nota WHERE disciplina_id = ?', [id], function(errComponentes: any, componentes: any) {
      if (errComponentes) {
        return res.status(500).json({ error: errComponentes.message });
      }

      // Se houver componentes cadastrados, valida se todos estão na fórmula
      if (componentes && componentes.length > 0) {
        var componentesNaoUsados = [];
        for (var i = 0; i < componentes.length; i++) {
          var sigla = componentes[i].sigla;
          // Verifica se a sigla está na fórmula (usando regex para encontrar palavra completa)
          var regex = new RegExp('\\b' + sigla.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
          if (!regex.test(formulaNotaFinal)) {
            componentesNaoUsados.push(sigla);
          }
        }

        if (componentesNaoUsados.length > 0) {
          return res.status(400).json({ 
            error: 'A fórmula deve utilizar todos os componentes cadastrados. Componentes não utilizados: ' + componentesNaoUsados.join(', ')
          });
        }
      }

      // Query SQL para atualizar a disciplina
      const sql = 'UPDATE disciplinas SET nome = ?, sigla = ?, codigo = ?, periodo = ?, formula_nota_final = ? WHERE id = ?';
      
      // Executa a query no banco de dados
      db.run(sql, [nome, sigla || null, codigo || null, periodo || null, formulaNotaFinal || null, id], function (err: any) {
        // Se houver erro, retorna erro 500
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Se nenhuma linha foi afetada, a disciplina não existe
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Disciplina não encontrada' });
        }
        
        // Retorna sucesso
        return res.json({ 
          id: Number(id), 
          nome: nome,
          sigla: sigla || null,
          codigo: codigo || null,
          periodo: periodo || null,
          formula_nota_final: formulaNotaFinal || null
        });
      });
    });
  } else {
    // Se não houver fórmula, atualiza normalmente
    const sql = 'UPDATE disciplinas SET nome = ?, sigla = ?, codigo = ?, periodo = ?, formula_nota_final = ? WHERE id = ?';
    
    // Executa a query no banco de dados
    db.run(sql, [nome, sigla || null, codigo || null, periodo || null, formulaNotaFinal || null, id], function (err: any) {
      // Se houver erro, retorna erro 500
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Se nenhuma linha foi afetada, a disciplina não existe
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Disciplina não encontrada' });
      }
      
      // Retorna sucesso
      return res.json({ 
        id: Number(id), 
        nome: nome,
        sigla: sigla || null,
        codigo: codigo || null,
        periodo: periodo || null,
        formula_nota_final: formulaNotaFinal || null
      });
    });
  }
});

// Rota PUT /api/disciplinas/:id/formula - Atualiza apenas a fórmula de nota final
router.put('/:id/formula', function(req: any, res: any) {
  // Extrai o ID da URL e a fórmula do corpo da requisição
  const id = req.params.id;
  const formulaNotaFinal = req.body.formula_nota_final;

  // Valida se a fórmula foi fornecida
  if (formulaNotaFinal === undefined || formulaNotaFinal === null) {
    return res.status(400).json({ error: 'Fórmula de nota final é obrigatória' });
  }

  // Busca todos os componentes da disciplina para validar a fórmula
  db.all('SELECT sigla FROM componentes_nota WHERE disciplina_id = ?', [id], function(errComponentes: any, componentes: any) {
    if (errComponentes) {
      return res.status(500).json({ error: errComponentes.message });
    }

    // Se houver componentes cadastrados, valida se todos estão na fórmula
    if (componentes && componentes.length > 0) {
      var componentesNaoUsados = [];
      for (var i = 0; i < componentes.length; i++) {
        var sigla = componentes[i].sigla;
        // Verifica se a sigla está na fórmula (usando regex para encontrar palavra completa)
        var regex = new RegExp('\\b' + sigla.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (!regex.test(formulaNotaFinal)) {
          componentesNaoUsados.push(sigla);
        }
      }

      if (componentesNaoUsados.length > 0) {
        return res.status(400).json({ 
          error: 'A fórmula deve utilizar todos os componentes cadastrados. Componentes não utilizados: ' + componentesNaoUsados.join(', ')
        });
      }
    }

    // Query SQL para atualizar apenas a fórmula
    const sql = 'UPDATE disciplinas SET formula_nota_final = ? WHERE id = ?';
    
    // Executa a query no banco de dados
    db.run(sql, [formulaNotaFinal, id], function (err: any) {
      // Se houver erro, retorna erro 500
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Se nenhuma linha foi afetada, a disciplina não existe
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Disciplina não encontrada' });
      }
      
      // Retorna sucesso
      return res.json({ 
        id: Number(id), 
        formula_nota_final: formulaNotaFinal
      });
    });
  });
});

// Rota DELETE /api/disciplinas/:id - Exclui uma disciplina
router.delete('/:id', function(req: any, res: any) {
  // Extrai o ID da URL
  const id = req.params.id;

  // Query SQL para excluir a disciplina
  const sql = 'DELETE FROM disciplinas WHERE id = ?';
  
  // Executa a query no banco de dados
  db.run(sql, [id], function (err: any) {
    // Se houver erro, retorna erro 500
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Se nenhuma linha foi afetada, a disciplina não existe
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Disciplina não encontrada' });
    }
    
    // Retorna sucesso
    return res.json({ message: 'Disciplina excluída com sucesso' });
  });
});

// Exporta o roteador para ser usado no servidor principal
export default router;

