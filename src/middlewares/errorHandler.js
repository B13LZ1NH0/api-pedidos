const AppError = require('../errors/AppError');

// Rota inexistente
function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// Tratamento central de erros (precisa ter 4 parâmetros para o Express reconhecer)
// eslint-disable-next-line no-unused-vars
function tratadorDeErros(erro, req, res, next) {
  // Erros de negócio/validação conhecidos
  if (erro instanceof AppError) {
    return res.status(erro.statusCode).json({ erro: erro.message });
  }

  // JSON malformado enviado pelo cliente (erro do usuário -> 400)
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  // Qualquer outra coisa é erro inesperado: não expõe detalhes ao cliente
  console.error('Erro inesperado:', erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { rotaNaoEncontrada, tratadorDeErros };
