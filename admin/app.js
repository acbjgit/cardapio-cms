$(document).ready(function() {

    const API_BASE_URL = '/api';

    // Objeto para guardar os detalhes dos pedidos carregados em cache
    let pedidosDetalhesCache = {};

    // Verifica se o utilizador está autenticado e a sua assinatura
    function verificarLoginEAssinatura() {
        $.ajax({
            url: `${API_BASE_URL}/check-auth`,
            method: 'GET',
            success: function(response) {
                exibirBannerAssinatura(response.assinatura);
            },
            error: function() {
                window.location.href = 'login.html';
            }
        });
    }

    function exibirBannerAssinatura(assinatura) {
        if (!assinatura) return;
        const banner = $('#banner-assinatura');
        const textoBanner = $('#texto-banner-assinatura');
        const hoje = new Date();
        const dataFimTrial = new Date(assinatura.data_fim_trial);

        if (assinatura.status_assinatura === 'ativo') {
            banner.addClass('hidden');
            return;
        }

        const diffTime = dataFimTrial.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            textoBanner.text(`O seu período de teste termina em ${diffDays} dia(s).`);
            banner.removeClass('expirado hidden');
        } else {
            textoBanner.text('O seu período de teste expirou! Assine agora para continuar a usar o sistema.');
            banner.addClass('expirado').removeClass('hidden');
        }
    }

    // LÓGICA DOS SEPARADORES (TABS)
    $('.tab-link').on('click', function() {
        const tabId = $(this).data('tab');
        $('.tab-link').removeClass('active');
        $('.tab-content').removeClass('active');
        $(this).addClass('active');
        $('#' + tabId).addClass('active');
    });

    // FUNÇÕES DE CARREGAMENTO DE DADOS
    function carregarPedidos() {
        $.ajax({
            url: `${API_BASE_URL}/pedidos`,
            method: 'GET',
            success: function(pedidos) {
                const listaPedidos = $('#lista-pedidos');
                listaPedidos.empty();
                const novosPedidos = pedidos.filter(p => p.status === 'Pendente').length;
                const notificacao = $('#notificacao-pedidos');
                if (novosPedidos > 0) {
                    notificacao.text(novosPedidos).removeClass('hidden');
                } else {
                    notificacao.addClass('hidden');
                }
                $.each(pedidos, function(index, pedido) {
                    const dataPedido = new Date(pedido.data_pedido).toLocaleString('pt-BR');
                    const totalFormatado = parseFloat(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const statusClass = pedido.status.toLowerCase().replace(/\s+/g, '-');
                    const cardPedidoHtml = `
                        <div class="card-pedido status-${statusClass}">
                            <div class="pedido-header">
                                <span class="numero">${pedido.numero_pedido}</span>
                                <span class="hora">${dataPedido}</span>
                            </div>
                            <div class="pedido-total">${totalFormatado}</div>
                            <div class="pedido-footer">
                                <select class="pedido-status-select" data-id="${pedido.id}">
                                    <option value="Pendente" ${pedido.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                    <option value="Em preparação" ${pedido.status === 'Em preparação' ? 'selected' : ''}>Em preparação</option>
                                    <option value="A caminho" ${pedido.status === 'A caminho' ? 'selected' : ''}>A caminho</option>
                                    <option value="Entregue" ${pedido.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                                    <option value="Cancelado" ${pedido.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                                </select>
                                <button class="btn-ver-detalhes" data-id="${pedido.id}">Ver Detalhes</button>
                            </div>
                        </div>
                    `;
                    listaPedidos.append(cardPedidoHtml);
                });
            },
            error: function(xhr) {
                if (xhr.responseJSON && xhr.responseJSON.assinaturaInvalida) {
                    // Se a assinatura for inválida, não faz nada (o banner já avisa)
                } else {
                    alert('Erro ao carregar os pedidos.');
                }
            }
        });
    }

    function carregarCategorias() {
        $.get(`${API_BASE_URL}/categorias`, function(categorias) {
            const tabelaCategoriasBody = $('#tabela-categorias tbody');
            const selectProdutoCategoria = $('#produto-categoria');
            tabelaCategoriasBody.empty();
            selectProdutoCategoria.empty().append('<option value="">Selecione uma categoria...</option>');
            $.each(categorias, function(index, categoria) {
                tabelaCategoriasBody.append(`
                    <tr>
                        <td>${categoria.id}</td>
                        <td>${categoria.nome}</td>
                        <td>
                            <button class="btn-editar" data-id="${categoria.id}">Editar</button>
                            <button class="btn-deletar" data-id="${categoria.id}">Apagar</button>
                        </td>
                    </tr>
                `);
                selectProdutoCategoria.append(`<option value="${categoria.id}">${categoria.nome}</option>`);
            });
        }).fail(function(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.assinaturaInvalida) { /* Silencia o erro */ }
        });
    }

    function carregarAdicionais() {
        $.get(`${API_BASE_URL}/adicionais`, function(adicionais) {
            const tabelaAdicionaisBody = $('#tabela-adicionais tbody');
            const selectProdutoAdicionais = $('#produto-adicionais');
            tabelaAdicionaisBody.empty();
            selectProdutoAdicionais.empty();
            $.each(adicionais, function(index, adicional) {
                const precoFormatado = adicional.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                tabelaAdicionaisBody.append(`
                    <tr>
                        <td>${adicional.id}</td>
                        <td>${adicional.nome}</td>
                        <td>${precoFormatado}</td>
                        <td>
                            <button class="btn-editar-adicional" data-id="${adicional.id}">Editar</button>
                            <button class="btn-deletar-adicional" data-id="${adicional.id}">Apagar</button>
                        </td>
                    </tr>
                `);
                selectProdutoAdicionais.append(`<option value="${adicional.id}">${adicional.nome} - ${precoFormatado}</option>`);
            });
        }).fail(function(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.assinaturaInvalida) { /* Silencia o erro */ }
        });
    }

    function carregarTaxasEntrega() {
        $.get(`${API_BASE_URL}/taxas-entrega`, function(taxas) {
            const tabelaTaxasBody = $('#tabela-taxas-entrega tbody');
            tabelaTaxasBody.empty();
            $.each(taxas, function(index, taxa) {
                const taxaFormatada = taxa.taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                tabelaTaxasBody.append(`
                    <tr>
                        <td>${taxa.id}</td>
                        <td>${taxa.bairro}</td>
                        <td>${taxaFormatada}</td>
                        <td>
                            <button class="btn-editar-taxa" data-id="${taxa.id}">Editar</button>
                            <button class="btn-deletar-taxa" data-id="${taxa.id}">Apagar</button>
                        </td>
                    </tr>
                `);
            });
        }).fail(function(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.assinaturaInvalida) { /* Silencia o erro */ }
        });
    }

    function carregarProdutos() {
        $.get(`${API_BASE_URL}/produtos`, function(produtos) {
            const tabelaProdutosBody = $('#tabela-produtos tbody');
            tabelaProdutosBody.empty();
            $.each(produtos, function(index, produto) {
                const precoFormatado = produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const adicionaisData = JSON.stringify((produto.adicionais || []).map(a => a.id));
                tabelaProdutosBody.append(`
                    <tr>
                        <td>${produto.id}</td>
                        <td><img src="${produto.imagem_url}" alt="${produto.nome}" width="80"></td>
                        <td>${produto.nome}</td>
                        <td>${precoFormatado}</td>
                        <td>${produto.nome_categoria}</td>
                        <td>
                            <button class="btn-editar-produto" 
                                data-id="${produto.id}" 
                                data-nome="${produto.nome}" 
                                data-descricao="${produto.descricao || ''}"
                                data-preco="${produto.preco}"
                                data-id_categoria="${produto.id_categoria}"
                                data-adicionais='${adicionaisData}'>Editar</button>
                            <button class="btn-deletar-produto" data-id="${produto.id}">Apagar</button>
                        </td>
                    </tr>
                `);
            });
        }).fail(function(xhr) {
            if (xhr.responseJSON && xhr.responseJSON.assinaturaInvalida) { /* Silencia o erro */ }
        });
    }

    function carregarConfiguracoes() {
        $.get(`${API_BASE_URL}/configuracoes`, function(configs) {
            $('#config-nome-loja').val(configs.nome_loja || '');
            $('#config-whatsapp').val(configs.whatsapp_loja || '');
            $('#config-endereco').val(configs.endereco_loja || '');
            $('#config-horario').val(configs.horario_funcionamento || '');
            $('#config-status').val(configs.status_loja || 'fechado');
            $('#config-mostrar-endereco').prop('checked', configs.mostrar_endereco);
            $('#config-cor-titulo').val(configs.cor_tema || '#FF6347');
            
            const logoPreview = $('#logo-loja-preview');
            logoPreview.empty();
            if (configs.logo_url) {
                logoPreview.html(`<p>Logo Atual:</p><img src="${configs.logo_url}" alt="Logo da Loja" style="max-width: 100px;">`);
            }

            const fundoPreview = $('#imagem-fundo-preview');
            fundoPreview.empty();
            if (configs.imagem_fundo_url) {
                fundoPreview.html(`<p>Imagem de Fundo Atual:</p><img src="${configs.imagem_fundo_url}" alt="Imagem de Fundo">`);
            }
        });
    }

    // MANIPULAÇÃO DE EVENTOS
    $('#lista-pedidos').on('change', '.pedido-status-select', function() {
        const pedidoId = $(this).data('id');
        const novoStatus = $(this).val();
        $.ajax({
            url: `${API_BASE_URL}/pedidos/${pedidoId}/status`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ status: novoStatus }),
            success: () => carregarPedidos(),
            error: (xhr) => alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao atualizar o status.')
        });
    });

    $('#lista-pedidos').on('click', '.btn-ver-detalhes', function() {
        const pedidoId = $(this).data('id');
        $.get(`${API_BASE_URL}/pedidos/${pedidoId}/detalhes`, function(pedido) {
            pedidosDetalhesCache[pedidoId] = pedido;
            const corpoModal = $('#corpo-modal-detalhes');
            corpoModal.empty();
            $('#detalhes-numero-pedido').text(`Detalhes do ${pedido.numero_pedido}`);

            let itensHtml = '<div class="detalhes-secao"><h4>Itens do Pedido</h4>';
            pedido.itens.forEach(item => {
                itensHtml += `<div class="detalhes-item"><b>${item.quantidade}x ${item.nome_produto}</b>`;
                if (item.adicionais && item.adicionais.length > 0) {
                    item.adicionais.forEach(ad => {
                        itensHtml += `<div class="adicional">+ ${ad.nome_adicional}</div>`;
                    });
                }
                if (item.observacoes) {
                    itensHtml += `<div class="observacao">Obs: ${item.observacoes}</div>`;
                }
                itensHtml += '</div>';
            });
            itensHtml += '</div>';
            corpoModal.append(itensHtml);

            let entregaHtml = '<div class="detalhes-secao"><h4>Detalhes da Entrega</h4>';
            if (pedido.metodo_entrega === 'retirada') {
                entregaHtml += '<p>Retirada no local</p>';
            } else {
                entregaHtml += `<p><b>Endereço:</b> ${pedido.endereco_rua}, ${pedido.endereco_numero}</p>`;
                entregaHtml += `<p><b>Bairro:</b> ${pedido.endereco_bairro}</p>`;
                if (pedido.endereco_complemento) {
                    entregaHtml += `<p><b>Complemento:</b> ${pedido.endereco_complemento}</p>`;
                }
            }
            entregaHtml += '</div>';
            corpoModal.append(entregaHtml);

            let pagamentoHtml = '<div class="detalhes-secao"><h4>Pagamento</h4>';
            pagamentoHtml += `<p><b>Forma:</b> ${pedido.forma_pagamento}</p>`;
            if (pedido.forma_pagamento === 'dinheiro' && pedido.troco_para > 0) {
                pagamentoHtml += `<p><b>Troco para:</b> ${parseFloat(pedido.troco_para).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>`;
            }
            pagamentoHtml += '</div>';
            corpoModal.append(pagamentoHtml);

            $('#modal-detalhes-pedido').removeClass('hidden').data('id', pedidoId);
        });
    });

    $('.btn-fechar-modal-detalhes').on('click', () => $('#modal-detalhes-pedido').addClass('hidden'));
    $('.btn-fechar-modal-planos').on('click', () => $('#modal-planos-assinatura').addClass('hidden'));

    $('.btn-imprimir-pedido').on('click', function() {
        const conteudo = document.getElementById('corpo-modal-detalhes').innerHTML;
        const numeroPedido = document.getElementById('detalhes-numero-pedido').innerText;
        const janela = window.open('', 'PRINT', 'height=600,width=800');
        janela.document.write('<html><head><title>' + numeroPedido + '</title>');
        janela.document.write('<style>body{font-family: Arial, sans-serif;} h3, h4 {margin-bottom: 10px;} .detalhes-secao {margin-bottom: 15px;} .adicional, .observacao {padding-left: 20px; font-size: 0.9em;}</style>');
        janela.document.write('</head><body>');
        janela.document.write('<h3>' + numeroPedido + '</h3>');
        janela.document.write(conteudo);
        janela.document.write('</body></html>');
        janela.document.close();
        janela.focus();
        janela.print();
        janela.close();
    });

    $('#btn-assinar-agora').on('click', () => $('#modal-planos-assinatura').removeClass('hidden'));

    $('.btn-escolher-plano').on('click', function() {
        const plano = $(this).data('plano');
        $.ajax({
            url: `${API_BASE_URL}/criar-sessao-checkout`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ plano: plano }),
            success: function(response) {
                window.location.href = response.url;
            },
            error: function() {
                alert('Erro ao iniciar o processo de pagamento. Tente novamente.');
            }
        });
    });

    $('#form-categoria').on('submit', function(event) {
        event.preventDefault();
        const nomeCategoria = $('#categoria-nome').val();
        const idCategoria = $('#categoria-id').val();
        if (!nomeCategoria) { alert('Por favor, insira o nome da categoria.'); return; }
        let url = `${API_BASE_URL}/categorias`;
        let method = 'POST';
        if (idCategoria) { url += `/${idCategoria}`; method = 'PUT'; }
        $.ajax({
            url: url, method: method, contentType: 'application/json', data: JSON.stringify({ nome: nomeCategoria }),
            success: function() {
                alert(idCategoria ? 'Categoria atualizada!' : 'Categoria criada!');
                $('#form-categoria')[0].reset(); $('#categoria-id').val('');
                carregarCategorias();
            },
            error: (xhr) => alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao guardar a categoria.')
        });
    });
    $('#tabela-categorias').on('click', '.btn-editar', function() {
        const id = $(this).data('id');
        const nome = $(this).closest('tr').find('td:eq(1)').text();
        $('#categoria-id').val(id); $('#categoria-nome').val(nome);
    });
    $('#tabela-categorias').on('click', '.btn-deletar', function() {
        if (!confirm('Tem a certeza que deseja apagar esta categoria?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `${API_BASE_URL}/categorias/${id}`, method: 'DELETE',
            success: function() { alert('Categoria apagada!'); carregarCategorias(); },
            error: function(xhr) { alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro desconhecido.'); }
        });
    });

    $('#form-adicional').on('submit', function(event) {
        event.preventDefault();
        const nome = $('#adicional-nome').val();
        const preco = $('#adicional-preco').val();
        const id = $('#adicional-id').val();
        if (!nome || !preco) { alert('Por favor, preencha nome e preço.'); return; }
        let url = `${API_BASE_URL}/adicionais`;
        let method = 'POST';
        if (id) { url += `/${id}`; method = 'PUT'; }
        $.ajax({
            url: url, method: method, contentType: 'application/json', data: JSON.stringify({ nome, preco }),
            success: function() {
                alert(id ? 'Adicional atualizado!' : 'Adicional criado!');
                $('#form-adicional')[0].reset(); $('#adicional-id').val('');
                carregarAdicionais();
            },
            error: (xhr) => alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao guardar o adicional.')
        });
    });
    $('#tabela-adicionais').on('click', '.btn-editar-adicional', function() {
        const id = $(this).data('id');
        const linha = $(this).closest('tr');
        const nome = linha.find('td:eq(1)').text();
        const preco = parseFloat(linha.find('td:eq(2)').text().replace('R$', '').replace(/\./g, '').replace(',', '.'));
        $('#adicional-id').val(id); $('#adicional-nome').val(nome); $('#adicional-preco').val(preco);
    });
    $('#tabela-adicionais').on('click', '.btn-deletar-adicional', function() {
        if (!confirm('Tem a certeza que deseja apagar este adicional?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `${API_BASE_URL}/adicionais/${id}`, method: 'DELETE',
            success: function() { alert('Adicional apagado!'); carregarAdicionais(); },
            error: function(xhr) { alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro desconhecido.'); }
        });
    });

    $('#form-taxa-entrega').on('submit', function(event) {
        event.preventDefault();
        const bairro = $('#taxa-bairro').val();
        const taxa = $('#taxa-valor').val();
        const id = $('#taxa-id').val();
        if (!bairro || !taxa) { alert('Por favor, preencha bairro e taxa.'); return; }
        let url = `${API_BASE_URL}/taxas-entrega`;
        let method = 'POST';
        if (id) { url += `/${id}`; method = 'PUT'; }
        $.ajax({
            url: url, method: method, contentType: 'application/json', data: JSON.stringify({ bairro, taxa }),
            success: function() {
                alert(id ? 'Taxa atualizada!' : 'Taxa criada!');
                $('#form-taxa-entrega')[0].reset(); $('#taxa-id').val('');
                carregarTaxasEntrega();
            },
            error: (xhr) => alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao guardar a taxa.')
        });
    });
    $('#tabela-taxas-entrega').on('click', '.btn-editar-taxa', function() {
        const id = $(this).data('id');
        const linha = $(this).closest('tr');
        const bairro = linha.find('td:eq(1)').text();
        const taxa = parseFloat(linha.find('td:eq(2)').text().replace('R$', '').replace(/\./g, '').replace(',', '.'));
        $('#taxa-id').val(id); $('#taxa-bairro').val(bairro); $('#taxa-valor').val(taxa);
    });
    $('#tabela-taxas-entrega').on('click', '.btn-deletar-taxa', function() {
        if (!confirm('Tem a certeza que deseja apagar esta taxa?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `${API_BASE_URL}/taxas-entrega/${id}`, method: 'DELETE',
            success: function() { alert('Taxa apagada!'); carregarTaxasEntrega(); },
            error: function(xhr) { alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro desconhecido.'); }
        });
    });

    $('#form-produto').on('submit', function(event) {
        event.preventDefault();
        const produtoId = $('#produto-id').val();
        const formData = new FormData();
        formData.append('nome', $('#produto-nome').val());
        formData.append('descricao', $('#produto-descricao').val());
        formData.append('preco', $('#produto-preco').val());
        formData.append('id_categoria', $('#produto-categoria').val());
        const adicionaisSelecionados = $('#produto-adicionais').val() || [];
        formData.append('adicionais', JSON.stringify(adicionaisSelecionados));
        const imagemInput = $('#produto-imagem')[0];
        if (imagemInput.files.length > 0) {
            formData.append('imagem', imagemInput.files[0]);
        }
        let url = `${API_BASE_URL}/produtos`;
        let method = 'POST';
        if (produtoId) {
            url += `/${produtoId}`;
            method = 'PUT';
        } else {
            if (imagemInput.files.length === 0) {
                alert('Por favor, selecione uma imagem para o novo produto.');
                return;
            }
        }
        $.ajax({
            url: url, method: method, data: formData, processData: false, contentType: false,
            success: function() {
                alert(produtoId ? 'Produto atualizado!' : 'Produto criado!');
                $('#form-produto')[0].reset(); $('#produto-id').val('');
                carregarProdutos();
            },
            error: (xhr) => alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao guardar o produto.')
        });
    });
    $('#tabela-produtos').on('click', '.btn-editar-produto', function() {
        const botao = $(this);
        $('#produto-id').val(botao.data('id'));
        $('#produto-nome').val(botao.data('nome'));
        $('#produto-descricao').val(botao.data('descricao'));
        $('#produto-preco').val(botao.data('preco'));
        $('#produto-categoria').val(botao.data('id_categoria'));
        $('#produto-adicionais').val(botao.data('adicionais'));
        alert('Editando produto. Se desejar alterar a imagem, por favor, selecione um novo ficheiro.');
    });
    $('#tabela-produtos').on('click', '.btn-deletar-produto', function() {
        if (!confirm('Tem a certeza que deseja apagar este produto?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `${API_BASE_URL}/produtos/${id}`, method: 'DELETE',
            success: function() { alert('Produto apagado!'); carregarProdutos(); },
            error: function() { alert('Erro ao apagar o produto.'); }
        });
    });

    $('#form-configuracoes').on('submit', function(event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('nome_loja', $('#config-nome-loja').val());
        formData.append('whatsapp_loja', $('#config-whatsapp').val());
        formData.append('endereco_loja', $('#config-endereco').val());
        formData.append('horario_funcionamento', $('#config-horario').val());
        formData.append('status_loja', $('#config-status').val());
        formData.append('mostrar_endereco', $('#config-mostrar-endereco').is(':checked'));
        formData.append('cor_tema', $('#config-cor-titulo').val());
        
        const logoInput = $('#config-logo-loja')[0];
        if (logoInput.files.length > 0) {
            formData.append('logo_loja', logoInput.files[0]);
        }
        const imagemInput = $('#config-imagem-fundo')[0];
        if (imagemInput.files.length > 0) {
            formData.append('imagem_fundo', imagemInput.files[0]);
        }
        $.ajax({
            url: `${API_BASE_URL}/configuracoes`, method: 'PUT', data: formData, processData: false, contentType: false,
            success: function() {
                alert('Configurações guardadas!');
                carregarConfiguracoes();
            },
            error: (xhr) => alert(xhr.responseJSON ? xhr.responseJSON.message : 'Erro ao guardar as configurações.')
        });
    });
    
    $('#btn-logout').on('click', function() {
        $.ajax({
            url: `${API_BASE_URL}/logout`, method: 'POST',
            success: function() {
                alert('Logout bem-sucedido!');
                window.location.href = 'login.html';
            }
        });
    });

    // CHAMADAS INICIAIS E ATUALIZAÇÃO AUTOMÁTICA
    function carregarTodosOsDados() {
        carregarCategorias();
        carregarAdicionais();
        carregarTaxasEntrega();
        carregarProdutos();
        carregarConfiguracoes();
        carregarPedidos();
    }
    
    verificarLoginEAssinatura();
    carregarTodosOsDados();

    setInterval(carregarPedidos, 30000);

});
