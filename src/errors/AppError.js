// Erro de negócio/validação com status HTTP associado.
// Qualquer outro tipo de erro é tratado como inesperado (500).
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
