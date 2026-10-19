const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/pedidos.repository');
const service = require('../src/services/pedidos.service');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => repository.resetar());

describe('POST /pedidos', () => {
  test('cria pedido válido e retorna 201 com status "recebido"', async () => {
    const res = await request(app).post('/pedidos').send(pedidoValido);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('remove espaços nas extremidades do cliente', async () => {
    const res = await request(app).post('/pedidos').send({ ...pedidoValido, cliente: '  Ana  ' });
    expect(res.status).toBe(201);
    expect(res.body.cliente).toBe('Ana');
  });

  test.each([
    ['cliente ausente', { cliente: undefined }],
    ['cliente vazio', { cliente: '' }],
    ['cliente só com espaços', { cliente: '   ' }],
    ['cliente não textual', { cliente: 123 }],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -10 }],
    ['valor como texto', { valor: '350' }],
    ['valor ausente', { valor: undefined }],
    ['tipo inválido', { tipo: 'voando' }],
    ['tipo ausente', { tipo: undefined }],
    ['prioridade inválida', { prioridade: 'urgentissima' }],
    ['prioridade ausente', { prioridade: undefined }],
  ])('retorna 400 para %s', async (_nome, alteracao) => {
    const res = await request(app).post('/pedidos').send({ ...pedidoValido, ...alteracao });
    expect(res.status).toBe(400);
    expect(res.body.erro).toEqual(expect.any(String));
  });

  test('retorna 400 para JSON malformado', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{ cliente: ');
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando não há corpo', async () => {
    const res = await request(app).post('/pedidos');
    expect(res.status).toBe(400);
  });
});

describe('GET /pedidos', () => {
  test('retorna lista vazia com 200', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('retorna os pedidos cadastrados', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    await request(app).post('/pedidos').send({ ...pedidoValido, cliente: 'Maria' });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /pedidos/:id', () => {
  test('retorna pedido existente com 200', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test.each(['999', 'abc', '0', '-1', '1.5'])('retorna 404 para id "%s"', async (id) => {
    const res = await request(app).get(`/pedidos/${id}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  beforeEach(async () => {
    await request(app).post('/pedidos').send(pedidoValido);
  });

  test('atualiza status com transição válida (200)', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_preparacao');
  });

  test('percorre o fluxo completo até "entregue"', async () => {
    for (const status of ['em_preparacao', 'enviado', 'entregue']) {
      const res = await request(app).patch('/pedidos/1/status').send({ status });
      expect(res.status).toBe(200);
    }
    const final = await request(app).get('/pedidos/1');
    expect(final.body.status).toBe('entregue');
  });

  test('retorna 404 para id inexistente', async () => {
    const res = await request(app).patch('/pedidos/999/status').send({ status: 'cancelado' });
    expect(res.status).toBe(404);
  });

  test.each([
    ['status inexistente', { status: 'voando' }],
    ['status ausente', {}],
    ['status não textual', { status: 5 }],
    ['transição inválida (recebido -> entregue)', { status: 'entregue' }],
    ['mesmo status (recebido -> recebido)', { status: 'recebido' }],
  ])('retorna 400 para %s', async (_nome, corpo) => {
    const res = await request(app).patch('/pedidos/1/status').send(corpo);
    expect(res.status).toBe(400);
    expect(res.body.erro).toEqual(expect.any(String));
  });

  test('pedido cancelado não pode mais mudar de status', async () => {
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(400);
  });
});

describe('Tratamento de erros', () => {
  test('rota inexistente retorna 404', async () => {
    const res = await request(app).get('/qualquer-coisa');
    expect(res.status).toBe(404);
  });

  test('erro inesperado retorna 500 sem vazar detalhes', async () => {
    const spyService = jest.spyOn(service, 'listarPedidos').mockImplementation(() => {
      throw new Error('falha interna secreta');
    });
    const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/pedidos');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secreta');

    spyService.mockRestore();
    spyConsole.mockRestore();
  });
});
