// Autor: Cadu Spadari
// Script para cadastrar um novo usuário

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Pega o formulário de cadastro
  var formulario = document.getElementById('formCadastro');
  
  // Quando o formulário for enviado, executa esta função
  formulario.onsubmit = function(evento) {
    // Impede que a página recarregue
    evento.preventDefault();
    
    // Pega os valores que o usuário digitou
    var nome = document.getElementById('inputNomeCadastro').value;
    var email = document.getElementById('inputEmailCadastro').value;
    var telefone = document.getElementById('inputTelCadastro').value;
    var senha = document.getElementById('inputPasswordCadastro').value;
    
    // Remove espaços em branco do início e fim
    nome = nome.trim();
    email = email.trim();
    telefone = telefone.trim();
    
    // Pega os elementos de alerta
    var alertaErro = document.querySelector('.alert-danger');
    var alertasAviso = document.querySelectorAll('.alert-warning');
    var alertaSucesso = document.getElementById('sucessoCadastro');
    
    // Esconde todos os alertas
    alertaErro.classList.add('d-none');
    for (var i = 0; i < alertasAviso.length; i++) {
      alertasAviso[i].classList.add('d-none');
    }
    alertaSucesso.classList.add('d-none');
    
    // Verifica se os campos obrigatórios estão preenchidos
    if (nome === '' || email === '' || senha === '') {
      // Mostra o alerta de campos obrigatórios (o segundo alerta)
      alertasAviso[1].classList.remove('d-none');
      return;
    }
    
    // Desabilita o botão para não clicar várias vezes
    var botao = document.getElementById('btnCadastrar');
    botao.disabled = true;
    botao.value = 'Cadastrando...';
    
    // Cria um objeto para fazer requisição HTTP
    var xhr = new XMLHttpRequest();
    
    // Configura a requisição: método POST para a URL /api/auth/cadastro
    xhr.open('POST', '/api/auth/cadastro', true);
    
    // Define que vamos enviar dados em formato JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Quando a requisição terminar, executa esta função
    xhr.onload = function() {
      // Tenta converter a resposta para um objeto JavaScript
      var resposta = null;
      try {
        resposta = JSON.parse(xhr.responseText);
      } catch (e) {
        // Se não conseguir fazer parse, mostra erro genérico
        alertaErro.classList.remove('d-none');
        botao.disabled = false;
        botao.value = 'Cadastrar';
        return;
      }
      
      // Verifica se a requisição foi bem-sucedida (status 200-299)
      if (xhr.status >= 200 && xhr.status < 300) {
        // Verifica se deu erro na resposta
        if (resposta.error) {
          // Se o erro for de email já cadastrado
          if (resposta.error.indexOf('já cadastrado') !== -1) {
            alertasAviso[0].classList.remove('d-none');
          } else {
            // Se for outro erro
            alertaErro.classList.remove('d-none');
          }
          // Reabilita o botão
          botao.disabled = false;
          botao.value = 'Cadastrar';
        } else {
          // Se deu certo, mostra o alerta de sucesso
          alertaSucesso.classList.remove('d-none');
          // Depois de 2 segundos, redireciona para a página de login
          setTimeout(function() {
            window.location.href = '/index.html';
          }, 2000);
        }
      } else {
        // Se o status não for de sucesso, verifica se há mensagem de erro
        if (resposta && resposta.error) {
          // Se o erro for de email já cadastrado
          if (resposta.error.indexOf('já cadastrado') !== -1) {
            alertasAviso[0].classList.remove('d-none');
          } else {
            // Se for outro erro
            alertaErro.classList.remove('d-none');
          }
        } else {
          // Se não houver mensagem de erro específica, mostra erro genérico
          alertaErro.classList.remove('d-none');
        }
        // Reabilita o botão
        botao.disabled = false;
        botao.value = 'Cadastrar';
      }
    };
    
    // Se acontecer algum erro de rede, executa esta função
    xhr.onerror = function() {
      alertaErro.classList.remove('d-none');
      botao.disabled = false;
      botao.value = 'Cadastrar';
    };
    
    // Prepara os dados para enviar
    var dados = {
      nome: nome,
      email: email,
      telefone: telefone || null,
      senha: senha
    };
    
    // Envia a requisição com os dados convertidos para texto JSON
    xhr.send(JSON.stringify(dados));
  };
};
