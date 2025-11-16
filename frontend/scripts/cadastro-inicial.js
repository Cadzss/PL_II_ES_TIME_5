// Autor: Cadu Spadari
// Script para cadastro inicial (primeira instituição e curso)

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Tenta pegar o nome do usuário que foi salvo no login
  var usuarioSalvo = localStorage.getItem('usuario');
  if (usuarioSalvo) {
    var usuario = JSON.parse(usuarioSalvo);
    var alertaBemVindo = document.querySelector('.alert-success');
    if (alertaBemVindo) {
      alertaBemVindo.innerHTML = '<div><strong>Seja bem-vindo(a), ' + usuario.nome + '!</strong></div>';
    }
  }
  
  // Pega o formulário de cadastro inicial
  var formulario = document.getElementById('formCadastroInicial');
  
  // Quando o formulário for enviado, executa esta função
  formulario.onsubmit = function(evento) {
    // Impede que a página recarregue
    evento.preventDefault();
    
    // Pega os valores que o usuário digitou
    var nomeInstituicao = document.getElementById('inputNomeLugar').value;
    var nomeCurso = document.getElementById('inputCurso').value;
    
    // Remove espaços em branco do início e fim
    nomeInstituicao = nomeInstituicao.trim();
    nomeCurso = nomeCurso.trim();
    
    // Pega os elementos de alerta
    var alertaErro = document.querySelector('.alert-danger');
    var alertasAviso = document.querySelectorAll('.alert-warning');
    
    // Esconde todos os alertas
    alertaErro.classList.add('d-none');
    for (var i = 0; i < alertasAviso.length; i++) {
      alertasAviso[i].classList.add('d-none');
    }
    
    // Verifica se os campos estão preenchidos
    if (nomeInstituicao === '' || nomeCurso === '') {
      // Mostra o alerta de campos obrigatórios (o primeiro alerta)
      alertasAviso[0].classList.remove('d-none');
      return;
    }
    
    // Valida se contém apenas letras e espaços (opcional)
    var regex = /^[a-zA-ZÀ-ÿ\s\-]+$/;
    if (!regex.test(nomeInstituicao) || !regex.test(nomeCurso)) {
      // Mostra o alerta de dados inválidos (o segundo alerta)
      alertasAviso[1].classList.remove('d-none');
      return;
    }
    
    // Desabilita o botão para não clicar várias vezes
    var botao = document.getElementById('btnSalvarContinuar');
    botao.disabled = true;
    botao.value = 'Salvando...';
    
    // Cria um objeto para fazer requisição HTTP
    var xhr = new XMLHttpRequest();
    
    // Configura a requisição: método POST para a URL /api/cadastro-inicial
    xhr.open('POST', '/api/cadastro-inicial', true);
    
    // Define que vamos enviar dados em formato JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Quando a requisição terminar, executa esta função
    xhr.onload = function() {
      // Tenta converter a resposta para um objeto JavaScript
      var resposta = JSON.parse(xhr.responseText);
      
      // Verifica se deu erro
      if (resposta.error) {
        // Mostra o alerta de erro
        alertaErro.classList.remove('d-none');
        // Reabilita o botão
        botao.disabled = false;
        botao.value = 'Salvar e Continuar';
      } else {
        // Se deu certo, redireciona para a página principal
        window.location.href = '/pages/home.html';
      }
    };
    
    // Se acontecer algum erro de rede, executa esta função
    xhr.onerror = function() {
      alertaErro.classList.remove('d-none');
      botao.disabled = false;
      botao.value = 'Salvar e Continuar';
    };
    
    // Prepara os dados para enviar
    var dados = {
      nome_instituicao: nomeInstituicao,
      nome_curso: nomeCurso
    };
    
    // Envia a requisição com os dados convertidos para texto JSON
    xhr.send(JSON.stringify(dados));
  };
};
