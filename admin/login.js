$(document).ready(function() {
    
    const API_BASE_URL = 'http://localhost:3000/api';

    $('#form-login').on('submit', function(event) {
        event.preventDefault();

        const username = $('#username').val();
        const password = $('#password').val();

        $.ajax({
            url: `${API_BASE_URL}/login`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username: username, password: password }),
            
            success: function(response) {
                // Se o login for bem-sucedido, redireciona para o painel principal.
                window.location.href = 'index.html';
            },
            error: function(xhr) {
                // Se der erro, exibe a mensagem de erro retornada pela API.
                const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao tentar fazer login.';
                $('#error-message').text(errorMessage).show();
            }
        });
    });

});