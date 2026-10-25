# API de Gerenciamento de Pedidos

Projeto prático avaliativo — Tópicos Avançados em Sistemas de Informação II.

**Aluno:** Gabriel Francisco Siqueira **RA:** 42872031

API REST para gerenciar pedidos de uma pequena loja, feita com **Node.js + Express (JavaScript)**, arquitetura em camadas, armazenamento em memória e testes com **Jest**.

## Instalação e execução

Requisito: Node.js 18 ou superior.

```bash
npm install
npm start        # sobe em http://localhost:3000
npm test         # executa os testes automatizados
```

A porta pode ser alterada pela variável de ambiente `PORT` (ex.: `PORT=4000 npm start`).

## Arquitetura

```
src/
├── server.js                  # sobe o servidor (listen)
├── app.js                     # configura Express, rotas e middlewares
├── routes/                    # define método + caminho e liga ao controller
├── controllers/               # lê req, chama o service, devolve res (sem regra de negócio)
├── services/                  # regras de negócio e validações
├── repositories/              # armazenamento em memória (sem regra, sem HTTP)
├── middlewares/               # 404 de rota e tratamento central de erros
└── errors/AppError.js         # erro conhecido (validação/negócio) com status HTTP
tests/pedidos.test.js          # testes automatizados (Jest + Supertest)
evidencias/                    # prints do Postman
```

**Fluxo de uma requisição:** `route → controller → service → repository`, e a resposta volta pelo mesmo caminho. Erros lançados no service (`AppError`) chegam ao `tratadorDeErros`, que os converte em HTTP 400/404. Qualquer outro erro é tratado como inesperado e vira **500** com mensagem genérica (o detalhe fica só no log do servidor).

**Padrão implementado:** arquitetura em camadas (Layered Architecture) com separação de responsabilidades: o controller cuida de HTTP, o service das regras e o repository do armazenamento. Por isso, trocar a memória por um banco de dados só exigiria mexer no repository.

## Valores aceitos

| Campo | Valores |
|---|---|
| `tipo` | `entrega`, `retirada`, `local` |
| `prioridade` | `baixa`, `normal`, `alta` |
| `status` | `recebido`, `em_preparacao`, `enviado`, `entregue`, `cancelado` |

Textos de `tipo`, `prioridade` e `status` são aceitos sem diferenciar maiúsculas/minúsculas e sem espaços nas pontas (são salvos em minúsculas).

### Regras de transição de status

Todo pedido nasce como `recebido`.

| Status atual | Pode ir para |
|---|---|
| `recebido` | `em_preparacao`, `cancelado` |
| `em_preparacao` | `enviado`, `cancelado` |
| `enviado` | `entregue` |
| `entregue` | _(final)_ |
| `cancelado` | _(final)_ |

Transição não permitida (inclusive repetir o mesmo status) retorna **400**.

## Rotas

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| POST | `/pedidos` | 201 | 400 |
| GET | `/pedidos` | 200 | — |
| GET | `/pedidos/:id` | 200 | 404 |
| PATCH | `/pedidos/:id/status` | 200 | 404 (ID inexistente), 400 (dados inválidos) |

Rota desconhecida: 404. Erro inesperado: 500.

### Validações

- `cliente`: texto obrigatório, não vazio mesmo após remover espaços (é salvo já sem espaços nas pontas).
- `valor`: precisa ser **número** (tipo JSON number, não texto) e maior que zero.
- `tipo` e `prioridade`: devem estar nas listas acima.
- `id`: se não for um inteiro positivo (ex.: `abc`, `0`, `-1`), é tratado como inexistente (**404**).
- No PATCH, a existência do pedido é verificada **antes** do corpo: ID inexistente → 404, mesmo com corpo inválido.
- JSON malformado → 400.

### Exemplos

**Criar pedido** — `POST /pedidos`

```json
{ "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal" }
```

Resposta `201`:

```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "recebido" }
```

**Erro de validação** — `POST /pedidos` com `"valor": -5` → `400`:

```json
{ "erro": "O campo \"valor\" deve ser numérico e maior que zero." }
```

**Atualizar status** — `PATCH /pedidos/1/status`

```json
{ "status": "em_preparacao" }
```

Resposta `200`:

```json
{ "id": 1, "cliente": "Carlos Silva", "tipo": "entrega", "valor": 350, "prioridade": "normal", "status": "em_preparacao" }
```

**Pedido inexistente** — `GET /pedidos/999` → `404`:

```json
{ "erro": "Pedido não encontrado." }
```

## Testes

`npm test` roda 35 testes (Jest + Supertest) cobrindo: criação válida, cada validação de entrada, listagem, consulta existente/inexistente, transições válidas e inválidas de status, estados finais, JSON malformado, rota inexistente e erro inesperado (500).

Os dados ficam em memória: ao reiniciar o servidor, os pedidos são perdidos.

## Evidências

Capturas do Postman na pasta [`evidencias/`](./evidencias): `01-criacao.png`, `02-validacao.png`, `03-listagem.png`, `04-consulta-inexistente.png`, `05-atualizacao.png`.

## Uso de IA

Utilizei IA (Claude) como apoio para: estruturar o projeto em camadas, escrever o primeiro rascunho do código, redigir o README. Testei a API manualmente no Postman e conferi os resultados dos testes automatizados.

- **Sugestão aceita:** separar um `repository` para o armazenamento em memória. Aceitei porque deixa o service sem depender de como os dados são guardados.

