# Doces da Lice — minissistema web

Sistema web para a gestão de **pedidos** e a **divulgação** da Doces da Lice, integrado ao WhatsApp, com controle de **estoque, receitas, produção e compras**. Foi construído a partir das modelagens AS-IS e TO-BE do Trabalho Interdisciplinar (PUC Minas).

## O que o sistema faz

- **Pedidos:** cadastro com canal (WhatsApp, Instagram, iFood ou 99Food) e promoção; status do pedido (aguardando pagamento, pago, em preparo, conferido, saiu para entrega, entregue, cancelado); confirmação manual do Pix; checklist de conferência; etiqueta para imprimir; histórico.
- **WhatsApp:** o sistema monta a mensagem de cada etapa e abre o WhatsApp com o texto pronto (a pessoa só aperta enviar). Não há envio automático.
- **Divulgação:** promoções, texto de divulgação pronto para o WhatsApp e o Instagram (copiar e colar) e pedidos por promoção no painel.
- **Estoque:** ingredientes com saldo, mínimo, validade mais próxima, entradas, ajustes e histórico.
- **Receitas e produção:** ficha técnica por produto; planejamento da produção com checagem de estoque antes de liberar; baixa automática dos ingredientes; produtos em pronta entrega.
- **Compras:** lista de compras automática (estoque baixo ou falta na produção), cotação e recebimento.
- **Painel:** números do dia, alertas de estoque e validade, pedidos por promoção.

A entrega é feita por Uber chamado **pelo cliente**; o sistema não chama entregador nem cobra taxa de entrega.

## Como rodar (Windows, macOS ou Linux)

Requisitos: **Node.js 22.13 ou mais novo** (o projeto usa o SQLite embutido do Node; não precisa instalar banco de dados nem Docker).

```
# Terminal 1 - API
cd backend
npm install
npm run seed      # cria dados de exemplo (só na primeira vez)
npm run dev       # sobe em http://localhost:3000

# Terminal 2 - telas
cd frontend
npm install
npm run dev       # abra http://localhost:5173
```

Login de teste: **admin@doces.com** / **admin123** (troque no arquivo `backend/.env`; veja `backend/.env.example`).

### Rodar tudo em um comando só (para a apresentação)

```
cd frontend
npm run build
cd ../backend
npm start         # abra http://localhost:3000
```

## Testes

```
cd backend
npm test
```

Os testes cobrem as regras de status do pedido, o fluxo completo de um pedido, estoque, produção, compras, promoções e painel.

## Estrutura

```
backend/    API em Node.js + Express, banco SQLite (arquivo em backend/data)
frontend/   telas em React + Vite + TypeScript
```

Contrato da API: prefixo `/api/v1`; erros no formato `{ erro: { codigo, mensagem, detalhes } }`; todas as rotas, menos o login, exigem `Authorization: Bearer <token>`.

## Limitações conhecidas

- Há um único usuário administrador.
- As listas não têm paginação (o volume de uma confeitaria pequena não exige).
- O WhatsApp é semiautomático (abre a mensagem pronta). O envio automático exigiria a API oficial, com conta empresarial e custos.
- O Pix é conferido manualmente no aplicativo do banco.
- O estoque guarda só a **validade mais próxima** de cada ingrediente (não controla lote por lote).
- O Node avisa que o SQLite é "experimental" ao iniciar; é só um aviso.
