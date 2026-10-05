import { Modal } from './Modal';
import { Botao } from './Botao';

export function Confirmar({ aberto, titulo, mensagem, textoConfirmar = 'Confirmar', perigo, carregando, onConfirmar, onCancelar }: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  perigo?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      onFechar={onCancelar}
      titulo={titulo}
      largura="max-w-md"
      rodape={
        <>
          <Botao variante="secundario" onClick={onCancelar}>
            Voltar
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} carregando={carregando} onClick={onConfirmar}>
            {textoConfirmar}
          </Botao>
        </>
      }
    >
      <p className="text-sm text-texto">{mensagem}</p>
    </Modal>
  );
}
