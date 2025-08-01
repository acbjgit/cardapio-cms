-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 23/07/2025 às 14:51
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `cardapio_db`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `adicionais`
--

CREATE TABLE `adicionais` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `preco` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `adicionais`
--

INSERT INTO `adicionais` (`id`, `nome`, `preco`) VALUES
(1, 'Salsisha', 2.00),
(2, 'Mussarela', 1.50);

-- --------------------------------------------------------

--
-- Estrutura para tabela `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `categorias`
--

INSERT INTO `categorias` (`id`, `nome`) VALUES
(1, 'Lanches'),
(2, 'Sobremesas'),
(3, 'Bebidas'),
(4, 'Porções'),
(5, 'Pizzas'),
(6, 'Sorvetes');

-- --------------------------------------------------------

--
-- Estrutura para tabela `configuracoes`
--

CREATE TABLE `configuracoes` (
  `id` int(11) NOT NULL,
  `chave` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `configuracoes`
--

INSERT INTO `configuracoes` (`id`, `chave`, `valor`) VALUES
(1, 'nome_loja', 'SHOPPING DO LANCHE'),
(2, 'cor_titulo', '#c4780e'),
(4, 'imagem_fundo_url', 'https://res.cloudinary.com/duz0ijwa1/image/upload/v1752951486/cardapio_online/config/fqpyh97njfsijx65hvn0.png'),
(6, 'horario_funcionamento', 'Seg. à Sex das 08:00 as 20:00h'),
(7, 'endereco_loja', 'Rua XV de Novembro, 590, Centro, Jundiaí - SP'),
(10, 'status_loja', 'aberto'),
(22, 'mostrar_endereco', 'true'),
(29, 'whatsapp_loja', '5511945903307');

-- --------------------------------------------------------

--
-- Estrutura para tabela `produtos`
--

CREATE TABLE `produtos` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `descricao` text DEFAULT NULL,
  `preco` decimal(10,2) NOT NULL,
  `imagem_url` varchar(255) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `produtos`
--

INSERT INTO `produtos` (`id`, `nome`, `descricao`, `preco`, `imagem_url`, `id_categoria`) VALUES
(5, 'X-Tudo Hulk', 'Pão de hambruger, tomate verde, alface, cebola, hamburger, ovo frito, maionese verde e catchup', 32.90, 'https://res.cloudinary.com/duz0ijwa1/image/upload/v1752951257/cardapio_online/ujythmrpkdrkreeixvsz.jpg', 1),
(6, 'X-Tudo Hulk', 'Pão de hamburger, hamburger bovina, alface, tomate, ovo frito, mussarela, presunto, orégano', 32.90, 'https://res.cloudinary.com/duz0ijwa1/image/upload/v1752951284/cardapio_online/ypgsee8uz3c6b17c4msm.jpg', 1),
(7, 'X-Tudo', 'Pão bola, salsisha, cebola, mussarela, bacon, maionese, mostarda', 29.90, 'https://res.cloudinary.com/duz0ijwa1/image/upload/v1752951307/cardapio_online/qmow7lodyb5qadfbebqw.jpg', 1);

-- --------------------------------------------------------

--
-- Estrutura para tabela `produto_adicionais`
--

CREATE TABLE `produto_adicionais` (
  `id_produto` int(11) NOT NULL,
  `id_adicional` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `produto_adicionais`
--

INSERT INTO `produto_adicionais` (`id_produto`, `id_adicional`) VALUES
(6, 1),
(6, 2),
(7, 1),
(7, 2);

-- --------------------------------------------------------

--
-- Estrutura para tabela `taxas_entrega`
--

CREATE TABLE `taxas_entrega` (
  `id` int(11) NOT NULL,
  `bairro` varchar(100) NOT NULL,
  `taxa` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `taxas_entrega`
--

INSERT INTO `taxas_entrega` (`id`, `bairro`, `taxa`) VALUES
(1, 'Vila Arens', 7.00),
(2, 'Centro', 5.00);

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuarios`
--

INSERT INTO `usuarios` (`id`, `username`, `password_hash`) VALUES
(1, 'admin', '$2b$10$9fr0Y2PD2w77swGDQSRC9udxgZuejq4IsWOBSjaoHvsZzIenKd706');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `adicionais`
--
ALTER TABLE `adicionais`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `configuracoes`
--
ALTER TABLE `configuracoes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chave` (`chave`);

--
-- Índices de tabela `produtos`
--
ALTER TABLE `produtos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_categoria` (`id_categoria`);

--
-- Índices de tabela `produto_adicionais`
--
ALTER TABLE `produto_adicionais`
  ADD PRIMARY KEY (`id_produto`,`id_adicional`),
  ADD KEY `id_adicional` (`id_adicional`);

--
-- Índices de tabela `taxas_entrega`
--
ALTER TABLE `taxas_entrega`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bairro` (`bairro`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `adicionais`
--
ALTER TABLE `adicionais`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `configuracoes`
--
ALTER TABLE `configuracoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de tabela `produtos`
--
ALTER TABLE `produtos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `taxas_entrega`
--
ALTER TABLE `taxas_entrega`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `produtos`
--
ALTER TABLE `produtos`
  ADD CONSTRAINT `produtos_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`);

--
-- Restrições para tabelas `produto_adicionais`
--
ALTER TABLE `produto_adicionais`
  ADD CONSTRAINT `produto_adicionais_ibfk_1` FOREIGN KEY (`id_produto`) REFERENCES `produtos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `produto_adicionais_ibfk_2` FOREIGN KEY (`id_adicional`) REFERENCES `adicionais` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
