// Autor: Cadu Spadari
// Script para recuperar senha usando o token do e-mail

// Quando a página terminar de carregar, executa este código
window.onload = function() {
  // Pega o token da URL (ex: ?token=abc123)
  var urlParams = new URLSearchParams(window.location.search);
  var token = urlParams.get('token');

  // Se não tiver token na URL, mostra erro
  if (!token) {
    document.getElementById('alertErro').classList.remove('d-none');
    document.getElementById('mensagemErro').textContent = 'Token inválido ou ausente.';
    return;
  }

  // Pega o formulário de recuperar senha
  var formulario = document.getElementById('formRecuperarSenha');
  
  // Quando o formulário for enviado, executa esta função
  formulario.onsubmit = function(evento) {
    // Impede que a página recarregue
    evento.preventDefault();
    
    // Pega os valores que o usuário digitou
    var novaSenha = document.getElementById('inputNovaSenha').value;
    var confirmarSenha = document.getElementById('inputConfirmarSenha').value;
    
    // Pega os elementos de alerta
    var alertaErro = document.getElementById('alertErro');
    var alertaCampos = document.getElementById('alertCampos');
    var alertaSucesso = document.getElementById('alertSucesso');
    
    // Esconde todos os alertas
    alertaErro.classList.add('d-none');
    alertaCampos.classList.add('d-none');
    alertaSucesso.classList.add('d-none');
    
    // Verifica se os campos estão preenchidos
    if (novaSenha === '' || confirmarSenha === '') {
      alertaCampos.classList.remove('d-none');
      return;
    }
    
    // Verifica se as senhas são iguais
    if (novaSenha !== confirmarSenha) {
      alertaErro.classList.remove('d-none');
      document.getElementById('mensagemErro').textContent = 'As senhas não coincidem.';
      return;
    }
    
    // Verifica se a senha tem pelo menos 6 caracteres
    if (novaSenha.length < 6) {
      alertaErro.classList.remove('d-none');
      document.getElementById('mensagemErro').textContent = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }
    
    // Desabilita o botão para não clicar várias vezes
    var botao = document.getElementById('btnRedefinir');
    botao.disabled = true;
    botao.value = 'Redefinindo...';
    
    // Cria um objeto para fazer requisição HTTP
    var xhr = new XMLHttpRequest();
    
    // Configura a requisição: método POST para a URL /api/auth/redefinir-senha
    xhr.open('POST', '/api/auth/redefinir-senha', true);
    
    // Define que vamos enviar dados em formato JSON
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    // Quando a requisição terminar, executa esta função
    xhr.onload = function() {
      // Tenta converter a resposta para um objeto JavaScript
      var resposta = null;
      try {
        resposta = JSON.parse(xhr.responseText);
      } catch (e) {
        alertaErro.classList.remove('d-none');
        document.getElementById('mensagemErro').textContent = 'Erro ao processar resposta do servidor.';
        botao.disabled = false;
        botao.value = 'Redefinir Senha';
        return;
      }
      
      // Verifica se a requisição foi bem-sucedida (status 200-299)
      if (xhr.status >= 200 && xhr.status < 300) {
        // Verifica se deu erro na resposta
        if (resposta.error) {
          alertaErro.classList.remove('d-none');
          document.getElementById('mensagemErro').textContent = resposta.error;
          botao.disabled = false;
          botao.value = 'Redefinir Senha';
        } else {
          // Se deu certo, mostra o alerta de sucesso
          alertaSucesso.classList.remove('d-none');
          // Depois de 2 segundos, redireciona para a página de login
          setTimeout(function() {
            window.location.href = '/index.html';
          }, 2000);
        }
      } else {
        // Se o status não for de sucesso, mostra erro
        if (resposta && resposta.error) {
          alertaErro.classList.remove('d-none');
          document.getElementById('mensagemErro').textContent = resposta.error;
        } else {
          alertaErro.classList.remove('d-none');
          document.getElementById('mensagemErro').textContent = 'Erro ao redefinir senha.';
        }
        botao.disabled = false;
        botao.value = 'Redefinir Senha';
      }
    };
    
    // Se acontecer algum erro de rede, executa esta função
    xhr.onerror = function() {
      alertaErro.classList.remove('d-none');
      document.getElementById('mensagemErro').textContent = 'Erro de conexão. Verifique sua internet.';
      botao.disabled = false;
      botao.value = 'Redefinir Senha';
    };
    
    // Prepara os dados para enviar
    var dados = {
      token: token,
      novaSenha: novaSenha
    };
    
    // Envia a requisição com os dados convertidos para texto JSON
    xhr.send(JSON.stringify(dados));
  };
};

