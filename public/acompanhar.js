$(document).ready(function() {

    const API_BASE_URL = '/api/public';

    // Função para buscar o status do pedido
    function buscarStatusPedido() {
        const numeroPedido = $('#input-numero-pedido').val().trim();
        const resultadoDiv = $('#resultado-status');

        if (!numeroPedido) {
            resultadoDiv.text('Por favor, insira um número de pedido.').css('color', 'red');
            return;
        }

        resultadoDiv.text('A procurar...').css('color', 'black');

        $.ajax({
            url: `${API_BASE_URL}/pedido/status/${numeroPedido}`,
            method: 'GET',
            success: function(response) {
                resultadoDiv.text(`Status: ${response.status}`).css('color', 'green');
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao buscar o pedido.';
                resultadoDiv.text(errorMessage).css('color', 'red');
            }
        });
    }

    // Evento de clique no botão
    $('#btn-buscar-pedido').on('click', buscarStatusPedido);

    // Evento de "Enter" no campo de input
    $('#input-numero-pedido').on('keypress', function(e) {
        if (e.which === 13) { // 13 é o código da tecla Enter
            buscarStatusPedido();
        }
    });

});
