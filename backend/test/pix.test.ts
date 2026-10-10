import { describe, expect, it } from 'vitest';
import { chavePixValida, crc16, normalizarChavePix, payloadPix } from '../src/lib/pix.js';

describe('Pix copia e cola', () => {
  it('confere com o exemplo do manual do BR Code (Banco Central)', () => {
    const p = payloadPix({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA' });
    expect(p).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
    );
    expect(crc16(p.slice(0, -4))).toBe('1D3D');
  });

  it('inclui o valor, tira acentos e corta nome e cidade no tamanho do padrão', () => {
    const p = payloadPix({ chave: '+55 (11) 99999-8888', nome: 'ALX Serviços Automotivos Ltda ME', cidade: 'São José dos Campos', valorCentavos: 12345, identificador: 'VENDA-42' });
    expect(p).toContain('0114+5511999998888');
    expect(p).toContain('5406123.45');
    expect(p).toContain('5924ALX Servicos Automotivos6015');
    expect(p).toContain('6015Sao Jose dos Ca62');
    expect(p).toContain('62110507VENDA42');
    expect(crc16(p.slice(0, -4))).toBe(p.slice(-4));
  });

  it('normaliza e valida chaves', () => {
    expect(normalizarChavePix('123.456.789-09')).toBe('12345678909');
    expect(normalizarChavePix('12.345.678/0001-90')).toBe('12345678000190');
    expect(normalizarChavePix(' Oficina@Email.com ')).toBe('oficina@email.com');
    expect(chavePixValida('+5511999998888')).toBe(true);
    expect(chavePixValida('11999998888')).toBe(true); // 11 dígitos = CPF
    expect(chavePixValida('minha chave')).toBe(false);
  });
});
