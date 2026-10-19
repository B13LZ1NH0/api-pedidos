// Camada de armazenamento em memória.
// Só guarda e recupera dados; não conhece regras de negócio nem HTTP.
let pedidos = [];
let proximoId = 1;

function criar(dados) {
  const pedido = { id: proximoId++, ...dados };
  pedidos.push(pedido);
  return pedido;
}

function listar() {
  return [...pedidos];
}

function buscarPorId(id) {
  return pedidos.find((p) => p.id === id) || null;
}

function atualizar(id, campos) {
  const pedido = buscarPorId(id);
  if (!pedido) return null;
  Object.assign(pedido, campos);
  return pedido;
}

// Usado apenas nos testes para isolar os cenários.
function resetar() {
  pedidos = [];
  proximoId = 1;
}

module.exports = { criar, listar, buscarPorId, atualizar, resetar };
