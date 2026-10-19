// Camada de serviço: regras de negócio e validações.
// Não conhece req/res (HTTP); lança AppError quando algo está errado.
const repository = require('../repositories/pedidos.repository');
const AppError = require('../errors/AppError');

const TIPOS = ['entrega', 'retirada', 'local'];
const PRIORIDADES = ['baixa', 'normal', 'alta'];
const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

// Transições permitidas de status.
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

function ehObjetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : valor;
}

function validarNovoPedido(dados) {
  if (!ehObjetoSimples(dados)) {
    throw new AppError('O corpo da requisição deve ser um objeto JSON.', 400);
  }

  const { cliente, tipo, valor, prioridade } = dados;

  if (typeof cliente !== 'string' || cliente.trim() === '') {
    throw new AppError('O campo "cliente" é obrigatório e não pode ser vazio.', 400);
  }

  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new AppError('O campo "valor" deve ser numérico e maior que zero.', 400);
  }

  const tipoNormalizado = normalizarTexto(tipo);
  if (!TIPOS.includes(tipoNormalizado)) {
    throw new AppError(`O campo "tipo" deve ser um destes valores: ${TIPOS.join(', ')}.`, 400);
  }

  const prioridadeNormalizada = normalizarTexto(prioridade);
  if (!PRIORIDADES.includes(prioridadeNormalizada)) {
    throw new AppError(
      `O campo "prioridade" deve ser um destes valores: ${PRIORIDADES.join(', ')}.`,
      400
    );
  }

  return {
    cliente: cliente.trim(),
    tipo: tipoNormalizado,
    valor,
    prioridade: prioridadeNormalizada,
  };
}

function criarPedido(dados) {
  const validos = validarNovoPedido(dados);
  return repository.criar({ ...validos, status: 'recebido' });
}

function listarPedidos() {
  return repository.listar();
}

// Um id que não é inteiro positivo nunca existirá -> 404.
function converterId(idTexto) {
  if (!/^\d+$/.test(String(idTexto))) return null;
  const id = Number(idTexto);
  return id > 0 ? id : null;
}

function buscarPedido(idTexto) {
  const id = converterId(idTexto);
  const pedido = id === null ? null : repository.buscarPorId(id);
  if (!pedido) {
    throw new AppError('Pedido não encontrado.', 404);
  }
  return pedido;
}

function atualizarStatus(idTexto, dados) {
  // 1º: o pedido precisa existir (404). 2º: valida o corpo (400).
  const pedido = buscarPedido(idTexto);

  if (!ehObjetoSimples(dados) || typeof dados.status !== 'string') {
    throw new AppError('O campo "status" é obrigatório e deve ser um texto.', 400);
  }

  const novoStatus = normalizarTexto(dados.status);

  if (!STATUS.includes(novoStatus)) {
    throw new AppError(`Status inválido. Valores aceitos: ${STATUS.join(', ')}.`, 400);
  }

  if (!TRANSICOES[pedido.status].includes(novoStatus)) {
    const permitidas = TRANSICOES[pedido.status];
    const detalhe = permitidas.length
      ? `Transições permitidas: ${permitidas.join(', ')}.`
      : 'Este status é final e não pode ser alterado.';
    throw new AppError(
      `Transição inválida de "${pedido.status}" para "${novoStatus}". ${detalhe}`,
      400
    );
  }

  return repository.atualizar(pedido.id, { status: novoStatus });
}

module.exports = {
  TIPOS,
  PRIORIDADES,
  STATUS,
  TRANSICOES,
  criarPedido,
  listarPedidos,
  buscarPedido,
  atualizarStatus,
};
