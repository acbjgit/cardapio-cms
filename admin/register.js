$(document).ready(function() {
    
    const API_BASE_URL = '/api';

    $('#form-register').on('submit', function(event) {
        event.preventDefault();

        const nome_loja = $('#nome_loja').val();
        const username = $('#username').val();
        const password = $('#password').val();

        const messageEl = $('#message');

        $.ajax({
            url: `${API_BASE_URL}/register`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                nome_loja: nome_loja, 
                username: username, 
                password: password 
            }),
            
            success: function(response) {
                // Mostra mensagem de sucesso
                messageEl.text(response.message + ' A redirecionar para o login...').removeClass('error').addClass('success').show();
                
                // Redireciona para a página de login após 3 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            },
            error: function(xhr) {
                // Mostra a mensagem de erro retornada pela API
                const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao tentar inscrever-se.';
                messageEl.text(errorMessage).removeClass('success').addClass('error').show();
            }
        });
    });

});
