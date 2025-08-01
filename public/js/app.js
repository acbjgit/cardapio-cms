// public/js/app.js

// LÓGICA DO PWA
let deferredPrompt; 

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('#btn-instalar-app').removeClass('hidden');
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
});
// FIM DA LÓGICA DO PWA

const API_BASE_URL = '/api/public';
let ID_LOJA = null;

var CARDAPIO = {
    itens: [],
    meuCarrinho: [],
    produtoSelecionado: null,
    taxaEntrega: 0,
    metodoEntrega: 'entrega',
    formaPagamento: 'dinheiro',
    whatsappLoja: '',

    metodos: {
        iniciar: () => {
            const urlParams = new URLSearchParams(window.location.search);
            ID_LOJA = urlParams.get('loja');
            
            if (ID_LOJA) {
                CARDAPIO.metodos.carregarDadosIniciais();
                CARDAPIO.metodos.eventos();
            } else {
                $('body').html('<div style="text-align: center; margin-top: 50px;"><h1>Loja não encontrada.</h1><p>Por favor, verifique o link de acesso.</p></div>');
            }
        },

        carregarDadosIniciais: () => {
            CARDAPIO.metodos.carregarConfiguracoes();
        },

        carregarConfiguracoes: () => {
            $.ajax({
                url: `${API_BASE_URL}/loja/${ID_LOJA}`,
                method: 'GET',
                success: (configs) => {
                    CARDAPIO.whatsappLoja = configs.whatsapp_loja;
                    if (configs.logo_url) {
                        $('#logo-img').attr('src', configs.logo_url).show();
                    }
                    if (configs.nome_loja) {
                        $('#nome-loja').text(configs.nome_loja);
                        document.title = configs.nome_loja;
                    }
                    if (configs.cor_tema) {
                        document.documentElement.style.setProperty('--cor-primaria', configs.cor_tema);
                    }
                    if (configs.imagem_fundo_url) {
                        $('body').css({
                            'background-image': `url(${configs.imagem_fundo_url})`,
                            'background-size': 'cover',
                            'background-position': 'center',
                            'background-attachment': 'fixed'
                        });
                    }
                    if (configs.mostrar_endereco) {
                        $('#endereco-loja').text(configs.endereco_loja || '');
                        $('#horario-loja').text(configs.horario_funcionamento || '');
                        $('.info-loja').removeClass('hidden');
                    } else {
                        $('.info-loja').addClass('hidden');
                    }
                    const statusLoja = $('#status-loja');
                    if (configs.status_loja === 'aberto') {
                        statusLoja.text('Aberta').removeClass('fechado').addClass('aberto');
                    } else {
                        statusLoja.text('Fechada').removeClass('aberto').addClass('fechado');
                    }

                    CARDAPIO.metodos.carregarCategorias();
                    CARDAPIO.metodos.carregarProdutos();
                },
                error: (xhr) => {
                    if (xhr.status === 404) {
                        $('body').html('<div style="text-align: center; margin-top: 50px;"><h1>Loja não encontrada.</h1><p>Por favor, verifique o link de acesso.</p></div>');
                    }
                }
            });
        },

        carregarCategorias: () => {
            $.get(`${API_BASE_URL}/categorias/${ID_LOJA}`, (categorias) => {
                const filtroContainer = $('#filtro-categorias');
                filtroContainer.html('').append(`<button class="btn-categoria active" data-id-categoria="todos">Ver Todos</button>`);
                $.each(categorias, function(index, categoria) {
                    filtroContainer.append(`<button class="btn-categoria" data-id-categoria="${categoria.id}">${categoria.nome}</button>`);
                });
            });
        },

        carregarProdutos: () => {
            $.get(`${API_BASE_URL}/produtos/${ID_LOJA}`, (produtos) => {
                CARDAPIO.itens = produtos;
                CARDAPIO.metodos.renderizarProdutos('todos');
            });
        },

        renderizarProdutos: (filtro) => {
            const menuContainer = $('#menu-itens');
            menuContainer.html('');
            const produtosFiltrados = (filtro === 'todos') ? CARDAPIO.itens : CARDAPIO.itens.filter(p => p.id_categoria == filtro);
            $.each(produtosFiltrados, (index, produto) => {
                const precoFormatado = parseFloat(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const cardHtml = `
                    <div class="card-produto">
                        <div class="img-container">
                            <img src="${produto.imagem_url}" alt="${produto.nome}">
                        </div>
                        <div class="info-container">
                            <p class="produto-nome"><b>${produto.nome}</b></p>
                            <p class="produto-descricao">${produto.descricao || ''}</p>
                            <div class="preco-container">
                                <p class="produto-preco"><b>${precoFormatado}</b></p>
                                <button class="btn-add" title="Personalizar e adicionar" data-id="${produto.id}">
                                    <i class="fa fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                menuContainer.append(cardHtml);
            });
        },

        abrirModalProduto: (id) => {
            const produto = CARDAPIO.itens.find(p => p.id == id);
            if (!produto) return;
            CARDAPIO.produtoSelecionado = produto;
            $('#produto-nome-modal').text(produto.nome);
            $('#produto-imagem-modal').attr('src', produto.imagem_url);
            $('#produto-descricao-modal').text(produto.descricao || '');
            $('#quantidade-produto-modal').text(1);
            $('#observacoes-produto').val('');
            const listaAdicionais = $('#lista-adicionais-modal');
            listaAdicionais.html('');
            if (produto.adicionais && produto.adicionais.length > 0) {
                $('.secao-opcoes:has(#lista-adicionais-modal)').show();
                $.each(produto.adicionais, (index, adicional) => {
                    const precoAdicional = parseFloat(adicional.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const adicionalHtml = `
                        <div class="item-adicional">
                            <label>
                                <input type="checkbox" class="checkbox-adicional" data-preco="${adicional.preco}">
                                <span class="adicional-nome">${adicional.nome}</span>
                            </label>
                            <span class="adicional-preco">+ ${precoAdicional}</span>
                        </div>
                    `;
                    listaAdicionais.append(adicionalHtml);
                });
            } else {
                $('.secao-opcoes:has(#lista-adicionais-modal)').hide();
            }
            CARDAPIO.metodos.atualizarPrecoModal();
            $('#modal-produto').addClass('visivel');
        },

        atualizarPrecoModal: () => {
            if (!CARDAPIO.produtoSelecionado) return;
            let precoTotal = parseFloat(CARDAPIO.produtoSelecionado.preco);
            $('#lista-adicionais-modal .checkbox-adicional:checked').each(function() {
                precoTotal += parseFloat($(this).data('preco'));
            });
            const quantidade = parseInt($('#quantidade-produto-modal').text());
            precoTotal *= quantidade;
            $('#preco-total-produto-modal').text(precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        },

        eventos: () => {
            $('#btn-instalar-app').on('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        console.log('Utilizador aceitou a instalação');
                    }
                    deferredPrompt = null;
                    $('#btn-instalar-app').addClass('hidden');
                }
            });
            $('#filtro-categorias').on('click', '.btn-categoria', function() {
                $('.btn-categoria').removeClass('active');
                $(this).addClass('active');
                CARDAPIO.metodos.renderizarProdutos($(this).data('id-categoria'));
            });
            $('#menu-itens').on('click', '.btn-add', function() {
                CARDAPIO.metodos.abrirModalProduto($(this).data('id'));
            });
            $('#btn-fechar-produto-modal').on('click', () => $('#modal-produto').removeClass('visivel'));
            $('#btn-aumentar-qt').on('click', () => {
                let qt = parseInt($('#quantidade-produto-modal').text());
                $('#quantidade-produto-modal').text(qt + 1);
                CARDAPIO.metodos.atualizarPrecoModal();
            });
            $('#btn-diminuir-qt').on('click', () => {
                let qt = parseInt($('#quantidade-produto-modal').text());
                if (qt > 1) {
                    $('#quantidade-produto-modal').text(qt - 1);
                    CARDAPIO.metodos.atualizarPrecoModal();
                }
            });
            $('#lista-adicionais-modal').on('change', '.checkbox-adicional', CARDAPIO.metodos.atualizarPrecoModal);
            $('#btn-adicionar-ao-carrinho').on('click', CARDAPIO.metodos.adicionarAoCarrinho);
            $('#btn-carrinho').on('click', () => { CARDAPIO.metodos.atualizarCarrinho(); $('#modal-carrinho').addClass('visivel'); });
            $('#btn-fechar-carrinho').on('click', () => $('#modal-carrinho').removeClass('visivel'));
            $('#lista-carrinho').on('click', '.btn-aumentar-carrinho', function() {
                CARDAPIO.metodos.alterarQuantidadeCarrinho($(this).data('id'), 1);
            });
            $('#lista-carrinho').on('click', '.btn-diminuir-carrinho', function() {
                CARDAPIO.metodos.alterarQuantidadeCarrinho($(this).data('id'), -1);
            });
            $('#btn-buscar-cep').on('click', CARDAPIO.metodos.buscarCep);
            $('input[name="metodo-entrega"]').on('change', CARDAPIO.metodos.mudarMetodoEntrega);
            $('input[name="metodo-pagamento"]').on('change', CARDAPIO.metodos.mudarFormaPagamento);
            $('#checkout-btn').on('click', CARDAPIO.metodos.finalizarPedido);
        },

        mudarMetodoEntrega: (e) => {
            CARDAPIO.metodoEntrega = e.target.value;
            if (CARDAPIO.metodoEntrega === "retirada") {
                $('.entrega-info').addClass('hidden');
                CARDAPIO.taxaEntrega = 0;
            } else {
                $('.entrega-info').removeClass('hidden');
                if ($('#input-bairro').val().length > 0) {
                    CARDAPIO.metodos.buscarTaxaPorBairro($('#input-bairro').val());
                }
            }
            CARDAPIO.metodos.atualizarCarrinho();
        },

        mudarFormaPagamento: (e) => {
            CARDAPIO.formaPagamento = e.target.value;
            if (CARDAPIO.formaPagamento === "dinheiro") {
                $('.troco-container').removeClass('hidden');
            } else {
                $('.troco-container').addClass('hidden');
                $('#input-troco').val('');
            }
        },

        adicionarAoCarrinho: () => {
            const produto = CARDAPIO.produtoSelecionado;
            if (!produto) return;
            const quantidade = parseInt($('#quantidade-produto-modal').text());
            const observacoes = $('#observacoes-produto').val();
            const adicionaisSelecionados = [];
            $('#lista-adicionais-modal .checkbox-adicional:checked').each(function() {
                adicionaisSelecionados.push({
                    nome: $(this).siblings('.adicional-nome').text(),
                    preco: parseFloat($(this).data('preco'))
                });
            });
            const carrinhoId = `${produto.id}-${new Date().getTime()}`;
            CARDAPIO.meuCarrinho.push({
                idUnico: carrinhoId,
                id: produto.id,
                name: produto.nome,
                price: parseFloat(produto.preco),
                quantity: quantidade,
                adicionais: adicionaisSelecionados,
                observacoes: observacoes
            });
            $('#modal-produto').removeClass('visivel');
            CARDAPIO.metodos.mensagem('Item adicionado com sucesso!');
            CARDAPIO.metodos.atualizarBadgeCarrinho();
        },
        
        alterarQuantidadeCarrinho: (idUnico, mudanca) => {
            const itemNoCarrinho = CARDAPIO.meuCarrinho.find(item => item.idUnico === idUnico);
            if (itemNoCarrinho) {
                itemNoCarrinho.quantity += mudanca;
                if (itemNoCarrinho.quantity <= 0) {
                    CARDAPIO.meuCarrinho = CARDAPIO.meuCarrinho.filter(item => item.idUnico !== idUnico);
                }
            }
            CARDAPIO.metodos.atualizarCarrinho();
        },

        atualizarCarrinho: () => {
            const listaCarrinho = $('#lista-carrinho');
            let subTotal = 0;

            listaCarrinho.find(".item-carrinho").remove();
            if (listaCarrinho.find(".carrinho-vazio").length) {
                listaCarrinho.find(".carrinho-vazio").remove();
            }

            if (CARDAPIO.meuCarrinho.length === 0) {
                listaCarrinho.prepend('<p class="carrinho-vazio">O seu carrinho está vazio.</p>');
            } else {
                $.each(CARDAPIO.meuCarrinho, (index, item) => {
                    let precoItemTotal = parseFloat(item.price);
                    let adicionaisHtml = '';
                    if (item.adicionais.length > 0) {
                        adicionaisHtml += '<div class="adicionais">';
                        item.adicionais.forEach(adicional => {
                            precoItemTotal += adicional.preco;
                            adicionaisHtml += `<p>+ ${adicional.nome}</p>`;
                        });
                        adicionaisHtml += '</div>';
                    }
                    let observacaoHtml = item.observacoes ? `<div class="observacao">"${item.observacoes}"</div>` : '';
                    subTotal += precoItemTotal * item.quantity;
                    const precoTotalItemFormatado = (precoItemTotal * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const itemHtml = `
                        <div class="item-carrinho">
                            <div class="info">
                                <p class="nome">${item.name}</p>
                                ${adicionaisHtml}
                                ${observacaoHtml}
                            </div>
                            <div class="preco-qt">
                                <p class="preco">${precoTotalItemFormatado}</p>
                                <div class="controlo-quantidade-carrinho">
                                    <button class="btn-diminuir-carrinho" data-id="${item.idUnico}">-</button>
                                    <span>${item.quantity}</span>
                                    <button class="btn-aumentar-carrinho" data-id="${item.idUnico}">+</button>
                                </div>
                            </div>
                        </div>
                    `;
                    listaCarrinho.prepend(itemHtml);
                });
            }

            const taxaEntregaFinal = CARDAPIO.metodoEntrega === 'entrega' ? CARDAPIO.taxaEntrega : 0;
            const totalGeral = subTotal + taxaEntregaFinal;
            
            $('#lblSubTotal').text(subTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            $('#lblTaxaEntrega').text(`+ ${taxaEntregaFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
            $('#lblTotalGeral').text(totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            
            CARDAPIO.metodos.atualizarBadgeCarrinho();
        },

        atualizarBadgeCarrinho: () => {
            let totalItens = CARDAPIO.meuCarrinho.reduce((acc, item) => acc + item.quantity, 0);
            $('#badge-carrinho').text(totalItens);
        },

        buscarCep: () => {
            const cep = $('#input-cep').val().replace(/\D/g, '');
            if (cep.length !== 8) {
                $('#cep-invalido').removeClass('hidden');
                return;
            }
            $('#cep-invalido').addClass('hidden');
            
            $.get(`https://viacep.com.br/ws/${cep}/json/`, (data) => {
                if (data.erro) {
                    $('#cep-invalido').removeClass('hidden');
                    CARDAPIO.metodos.limparEndereco();
                } else {
                    $('#input-rua').val(data.logradouro);
                    $('#input-bairro').val(data.bairro);
                    $('#input-numero').focus();
                    CARDAPIO.metodos.buscarTaxaPorBairro(data.bairro);
                }
            }).fail(() => {
                $('#cep-invalido').removeClass('hidden');
                CARDAPIO.metodos.limparEndereco();
            });
        },

        buscarTaxaPorBairro: (bairro) => {
            if (CARDAPIO.metodoEntrega !== 'entrega') return;
            $.get(`${API_BASE_URL}/taxa-por-bairro?id_loja=${ID_LOJA}&bairro=${bairro}`, (data) => {
                CARDAPIO.taxaEntrega = parseFloat(data.taxa);
            }).fail(() => {
                CARDAPIO.taxaEntrega = 0;
                alert('Infelizmente, não fazemos entregas neste bairro.');
            }).always(() => {
                CARDAPIO.metodos.atualizarCarrinho();
            });
        },

        limparEndereco: () => {
            $('#input-rua').val('');
            $('#input-bairro').val('');
            CARDAPIO.taxaEntrega = 0;
            CARDAPIO.metodos.atualizarCarrinho();
        },

        finalizarPedido: () => {
            if (CARDAPIO.meuCarrinho.length === 0) {
                CARDAPIO.metodos.mensagem('O seu carrinho está vazio.');
                return;
            }

            if (CARDAPIO.metodoEntrega === 'entrega') {
                const rua = $('#input-rua').val();
                const numero = $('#input-numero').val();
                if (!rua || !numero) {
                    CARDAPIO.metodos.mensagem('Por favor, preencha o seu endereço completo.');
                    return;
                }
            }

            let subTotal = 0;
            CARDAPIO.meuCarrinho.forEach(item => {
                let precoItem = parseFloat(item.price);
                item.adicionais.forEach(ad => precoItem += ad.preco);
                subTotal += precoItem * item.quantity;
            });
            const taxaEntregaFinal = CARDAPIO.metodoEntrega === 'entrega' ? CARDAPIO.taxaEntrega : 0;
            const totalGeral = subTotal + taxaEntregaFinal;

            const pedido = {
                id_loja: ID_LOJA,
                carrinho: CARDAPIO.meuCarrinho,
                totais: {
                    subTotal: subTotal,
                    taxaEntrega: taxaEntregaFinal,
                    totalGeral: totalGeral
                },
                entrega: {
                    metodo: CARDAPIO.metodoEntrega,
                    cep: $('#input-cep').val(),
                    rua: $('#input-rua').val(),
                    bairro: $('#input-bairro').val(),
                    numero: $('#input-numero').val(),
                    complemento: $('#input-complemento').val()
                },
                pagamento: {
                    forma: CARDAPIO.formaPagamento,
                    troco: $('#input-troco').val() || null
                }
            };

            $.ajax({
                url: `${API_BASE_URL}/pedidos`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(pedido),
                success: function(response) {
                    // ✨ MENSAGEM ATUALIZADA COM LINK PARA ACOMPANHAR ✨
                    const linkAcompanhar = `<a href="/acompanhar.html?pedido=${response.numeroPedido}" target="_blank">Clique aqui para acompanhar</a>`;
                    CARDAPIO.metodos.mensagem(`Pedido enviado com sucesso! O seu número é: ${response.numeroPedido}.<br>${linkAcompanhar}`, 'green', 5000);
                    
                    CARDAPIO.meuCarrinho = [];
                    CARDAPIO.metodos.limparEndereco();
                    CARDAPIO.metodos.atualizarCarrinho();
                    $('#modal-carrinho').removeClass('visivel');
                },
                error: function() {
                    CARDAPIO.metodos.mensagem('Ocorreu um erro ao enviar o seu pedido. Tente novamente.');
                }
            });
        },

        mensagem: (texto, cor = 'green', tempo = 3000) => {
            let containerMsg = $('#container-mensagens');
            if (containerMsg.length === 0) {
                $('body').append('<div id="container-mensagens" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>');
                containerMsg = $('#container-mensagens');
            }
            let id = `msg-${Date.now()}`;
            let msg = $(`<div id="${id}" class="toast ${cor}" style="padding: 10px 20px; background-color: ${cor === 'green' ? '#28a745' : '#d9534f'}; color: white; border-radius: 5px; margin-bottom: 10px; opacity: 0; transition: opacity 0.5s;">${texto}</div>`);
            containerMsg.append(msg);
            msg.animate({ opacity: 1 }, 500);
            setTimeout(() => {
                msg.animate({ opacity: 0 }, 500, function() { $(this).remove(); });
            }, tempo);
        }
    }
};

$(document).ready(() => {
    CARDAPIO.metodos.iniciar();
});
