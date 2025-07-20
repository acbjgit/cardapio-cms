$(document).ready(function() {

    // const API_BASE_URL = 'http://localhost:3000/api'; // modo desenvolvimento
    const API_BASE_URL = '/api'; // modo produção

    // Verifica se o utilizador está autenticado
    $.ajax({
        url: `${API_BASE_URL}/check-auth`,
        method: 'GET',
        error: function() {
            window.location.href = 'login.html';
        }
    });

    // ... (Funções de carregar e CRUD de Categorias, Adicionais, Taxas e Produtos sem alterações) ...
    
    function carregarCategorias() {
        $.ajax({
            url: `${API_BASE_URL}/categorias`,
            method: 'GET',
            success: function(categorias) {
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
            }
        });
    }

    function carregarAdicionais() {
        $.ajax({
            url: `${API_BASE_URL}/adicionais`,
            method: 'GET',
            success: function(adicionais) {
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
            }
        });
    }

    function carregarTaxasEntrega() {
        $.ajax({
            url: `${API_BASE_URL}/taxas-entrega`,
            method: 'GET',
            success: function(taxas) {
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
            }
        });
    }

    function carregarProdutos() {
        $.ajax({
            url: `${API_BASE_URL}/produtos`,
            method: 'GET',
            success: function(produtos) {
                try {
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
                } catch (e) {
                    console.error("Erro ao renderizar produtos:", e);
                    alert("Ocorreu um erro ao exibir os produtos. Verifique o console para mais detalhes.");
                }
            },
            error: function(xhr) {
                console.error("Erro ao buscar produtos da API:", xhr);
                alert("Não foi possível carregar os produtos. Verifique o console para mais detalhes.");
            }
        });
    }

    // ✨ FUNÇÃO ATUALIZADA ✨
    function carregarConfiguracoes() {
        $.ajax({
            url: `${API_BASE_URL}/configuracoes`,
            method: 'GET',
            success: function(configs) {
                $('#config-nome-loja').val(configs.nome_loja || '');
                $('#config-whatsapp').val(configs.whatsapp_loja || ''); // Carrega WhatsApp
                $('#config-endereco').val(configs.endereco_loja || '');
                $('#config-horario').val(configs.horario_funcionamento || '');
                $('#config-status').val(configs.status_loja || 'fechado');
                $('#config-mostrar-endereco').prop('checked', configs.mostrar_endereco === 'true');
                $('#config-cor-titulo').val(configs.cor_titulo || '#000000');
                
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
            }
        });
    }

    // ... (CRUD de Categorias, Adicionais, Taxas e Produtos sem alterações) ...
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
            }
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
            error: function(xhr) { alert(xhr.responseJSON.message); }
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
            }
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
            error: function(xhr) { alert(xhr.responseJSON.message); }
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
            }
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
            error: function(xhr) { alert(xhr.responseJSON.message); }
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
            }
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

    // ✨ CRUD DE CONFIGURAÇÕES ATUALIZADO ✨
    $('#form-configuracoes').on('submit', function(event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('nome_loja', $('#config-nome-loja').val());
        formData.append('whatsapp_loja', $('#config-whatsapp').val()); // Envia WhatsApp
        formData.append('endereco_loja', $('#config-endereco').val());
        formData.append('horario_funcionamento', $('#config-horario').val());
        formData.append('status_loja', $('#config-status').val());
        formData.append('mostrar_endereco', $('#config-mostrar-endereco').is(':checked'));
        formData.append('cor_titulo', $('#config-cor-titulo').val());
        
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
            }
        });
    });
    
    // Logout
    $('#btn-logout').on('click', function() {
        $.ajax({
            url: `${API_BASE_URL}/logout`, method: 'POST',
            success: function() {
                alert('Logout bem-sucedido!');
                window.location.href = 'login.html';
            }
        });
    });

    // CHAMADAS INICIAIS
    carregarCategorias();
    carregarAdicionais();
    carregarTaxasEntrega();
    carregarProdutos();
    carregarConfiguracoes();
});
