export class HttpError extends Error {
  constructor(status, codigo, mensagem, detalhes) { super(mensagem); this.status = status; this.codigo = codigo; this.detalhes = detalhes; }
}
export const erro400 = (m, d) => new HttpError(400, 'DADOS_INVALIDOS', m, d);
export const erro401 = (m = 'Faça login para continuar.') => new HttpError(401, 'NAO_AUTORIZADO', m);
export const erro404 = (m = 'Registro não encontrado.') => new HttpError(404, 'NAO_ENCONTRADO', m);
export const erro409 = (m, d) => new HttpError(409, 'REGRA_DE_NEGOCIO', m, d);

export function exigir(obj, campos) {
  const faltando = campos.filter((c) => obj?.[c] === undefined || obj[c] === null || obj[c] === '');
  if (faltando.length) throw erro400('Campos obrigatórios: ' + faltando.join(', '), { campos: faltando });
}
export function numero(v, nome, { min = null, inteiro = false } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw erro400(`${nome} deve ser um número.`);
  if (inteiro && !Number.isInteger(n)) throw erro400(`${nome} deve ser um número inteiro.`);
  if (min !== null && n < min) throw erro400(`${nome} deve ser maior ou igual a ${min}.`);
  return n;
}
// Atualiza só os campos enviados no corpo da requisição.
export function camposEnviados(body, permitidos) {
  const out = {};
  for (const c of permitidos) if (body?.[c] !== undefined) out[c] = typeof body[c] === 'boolean' ? (body[c] ? 1 : 0) : body[c];
  return out;
}
