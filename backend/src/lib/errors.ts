// Erro de regra de negócio que vira resposta HTTP com mensagem para o usuário.
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(entidade: string) {
    super(`${entidade} não encontrado(a)`, 404);
  }
}
