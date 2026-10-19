// Camada de controle: traduz HTTP <-> serviço.
// Não contém regra de negócio; erros vão para o middleware via next().
const service = require('../services/pedidos.service');

function criar(req, res, next) {
  try {
    const pedido = service.criarPedido(req.body);
    return res.status(201).json(pedido);
  } catch (erro) {
    return next(erro);
  }
}

function listar(req, res, next) {
  try {
    return res.status(200).json(service.listarPedidos());
  } catch (erro) {
    return next(erro);
  }
}

function buscarPorId(req, res, next) {
  try {
    return res.status(200).json(service.buscarPedido(req.params.id));
  } catch (erro) {
    return next(erro);
  }
}

function atualizarStatus(req, res, next) {
  try {
    const pedido = service.atualizarStatus(req.params.id, req.body);
    return res.status(200).json(pedido);
  } catch (erro) {
    return next(erro);
  }
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
