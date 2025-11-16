// Autor: Cadu Spadari
// Script para fazer login no sistema

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Pega o formulário de login
  var formulario = document.getElementById('formLogin');
  
  // Quando o formulário for enviado, executa esta função
  formulario.onsubmit = function(evento) {
    // Impede que a página recarregue
    evento.preventDefault();
    
    // Pega os valores que o usuário digitou
    var email = document.getElementById('inputEmailLogin').value;
    var senha = document.getElementById('inputPasswordLogin').value;
    
    // Remove espaços em branco do início e fim
    email = email.trim();
    
    // Pega os elementos de alerta
    var alertaErro = document.querySelector('.alert-danger');
    var alertasAviso = document.querySelectorAll('.alert-warning');
    
    // Esconde todos os alertas
    alertaErro.classList.add('d-none');
    for (var i = 0; i < alertasAviso.length; i++) {
      alertasAviso[i].classList.add('d-none');
    }
    
    // Verifica se os campos estão preenchidos
    if (email === '' || senha === '') {
      // Mostra o alerta de campos obrigatórios (o terceiro alerta)
      alertasAviso[1].classList.remove('d-none');
      return;
    }
    
    // Desabilita o botão para não clicar várias vezes
    var botao = document.getElementById('btnEntrar');
    botao.disabled = true;
    botao.value = 'Entrando...';
    
    // Cria um objeto para fazer requisição HTTP
    var xhr = new XMLHttpRequest();
    
    // Configura a requisição: método POST para a URL /api/auth/login
    xhr.open('POST', '/api/auth/login', true);
    
    // Define que vamos enviar dados em formato JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Quando a requisição terminar, executa esta função
    xhr.onload = function() {
      // Verifica se a requisição foi bem-sucedida (status 200-299)
      if (xhr.status >= 200 && xhr.status < 300) {
        // Tenta converter a resposta para um objeto JavaScript
        var resposta = JSON.parse(xhr.responseText);
        
        // Verifica se deu erro na resposta
        if (resposta.error) {
          // Mostra o alerta de erro
          alertaErro.classList.remove('d-none');
          // Reabilita o botão
          botao.disabled = false;
          botao.value = 'Entrar';
        } else {
          // Se deu certo, salva os dados do usuário
          localStorage.setItem('usuario', JSON.stringify(resposta));
          // Redireciona para a página principal
          window.location.href = '/pages/home.html';
        }
      } else {
        // Se o status não for de sucesso, mostra erro
        alertaErro.classList.remove('d-none');
        botao.disabled = false;
        botao.value = 'Entrar';
      }
    };
    
    // Se acontecer algum erro de rede, executa esta função
    xhr.onerror = function() {
      alertaErro.classList.remove('d-none');
      botao.disabled = false;
      botao.value = 'Entrar';
    };
    
    // Prepara os dados para enviar
    var dados = {
      email: email,
      senha: senha
    };
    
    // Envia a requisição com os dados convertidos para texto JSON
    xhr.send(JSON.stringify(dados));
  };
};
