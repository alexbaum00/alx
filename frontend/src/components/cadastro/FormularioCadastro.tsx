import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Botao } from '@/components/ui/Botao';
import { Confirmar } from '@/components/ui/Confirmar';
import { Campo, CampoDinheiro, CampoQuantidade, Input, Select, Textarea, lerNumero } from '@/components/ui/Campos';
import { Seletor } from '@/components/ui/Seletor';
import { useAviso } from '@/components/ui/Toast';
import type { CampoDef, ConfigCadastro, Relacao, Valores } from './tipos';

function valorInicial(c: CampoDef, item: Valores | null): unknown {
  if (c.tipo === 'relacao') return item ? (c.relacaoInicial?.(item) ?? null) : (c.padrao ?? null);
  const v = item?.[c.nome];
  if (c.tipo === 'dinheiro') return (v as number | undefined) ?? (c.padrao as number) ?? 0;
  if (c.tipo === 'booleano') return (v as boolean | undefined) ?? (c.padrao as boolean) ?? true;
  if (c.tipo === 'data') return v ? new Date(v as string).toLocaleDateString('sv-SE') : String(c.padrao ?? new Date().toLocaleDateString('sv-SE'));
  if (c.tipo === 'numero') return v != null ? String(v).replace('.', ',') : String(c.padrao ?? '');
  return v != null ? String(v) : String(c.padrao ?? '');
}

function paraApi(c: CampoDef, v: unknown): unknown {
  switch (c.tipo) {
    case 'relacao':
      return (v as Relacao | null)?.id ?? null;
    case 'dinheiro':
    case 'booleano':
      return v;
    case 'inteiro':
      return v === '' ? null : Number.parseInt(String(v), 10);
    case 'numero':
      return v === '' ? 0 : lerNumero(String(v));
    case 'data':
      return v || undefined;
    default:
      return String(v ?? '').trim();
  }
}

const larguras = { inteira: 'sm:col-span-6', metade: 'sm:col-span-3', terco: 'sm:col-span-2' };

export function FormularioCadastro({ config, item, onFechar, onSalvo }: {
  config: ConfigCadastro;
  item: Valores | null; // null = novo
  onFechar: () => void;
  onSalvo?: (salvo: Valores) => void;
}) {
  const editando = item != null;
  const campos = useMemo(() => config.campos.filter((c) => !(editando && c.somenteNaCriacao)), [config.campos, editando]);
  const [valores, setValores] = useState<Valores>(() => Object.fromEntries(campos.map((c) => [c.nome, valorInicial(c, item)])));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const qc = useQueryClient();
  const avisar = useAviso();
  const artigo = config.feminino ? 'a' : 'o';

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: [config.chave] });
    qc.invalidateQueries({ queryKey: ['seletor'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    for (const chave of config.invalidar ?? []) qc.invalidateQueries({ queryKey: [chave] });
  };

  const salvar = useMutation({
    mutationFn: () => {
      const corpo = Object.fromEntries(campos.map((c) => [c.nome, paraApi(c, valores[c.nome])]));
      return api<Valores>(editando ? `/${config.chave}/${item.id}` : `/${config.chave}`, {
        method: editando ? 'PUT' : 'POST',
        body: JSON.stringify(corpo),
      });
    },
    onSuccess: (salvo) => {
      invalidar();
      avisar(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${editando ? 'atualizad' : 'cadastrad'}${artigo}.`);
      onSalvo?.(salvo);
      onFechar();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.campos) setErros(Object.fromEntries(e.campos.map((c) => [c.campo, c.mensagem])));
      avisar(e.message, 'erro');
    },
  });

  const excluir = useMutation({
    mutationFn: () => api(`/${config.chave}/${item!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidar();
      avisar(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} excluíd${artigo}.`);
      onFechar();
    },
    onError: (e) => {
      setConfirmarExclusao(false);
      avisar(e.message, 'erro');
    },
  });

  const mudar = (nome: string, v: unknown) => {
    setValores((atual) => ({ ...atual, [nome]: v }));
    setErros(({ [nome]: _, ...resto }) => resto);
  };

  return (
    <>
      <Modal
        aberto
        onFechar={onFechar}
        titulo={editando ? `Editar ${config.singular}` : `Nov${artigo} ${config.singular}`}
        rodape={
          <>
            {editando && (
              <Botao variante="perigo" icone={<Trash2 className="size-4" />} onClick={() => setConfirmarExclusao(true)} className="mr-auto">
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" form="form-cadastro" carregando={salvar.isPending}>
              Salvar
            </Botao>
          </>
        }
      >
        <form
          id="form-cadastro"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-6"
        >
          {campos.map((c) => (
            <Campo
              key={c.nome}
              htmlFor={`campo-${c.nome}`}
              rotulo={c.rotulo}
              obrigatorio={c.obrigatorio}
              erro={erros[c.nome]}
              ajuda={c.ajuda}
              className={larguras[c.largura ?? 'inteira']}
            >
              <EntradaCampo campo={c} valor={valores[c.nome]} onChange={(v) => mudar(c.nome, v)} />
            </Campo>
          ))}
        </form>
      </Modal>
      <Confirmar
        aberto={confirmarExclusao}
        titulo={`Excluir ${config.singular}?`}
        mensagem="Esta ação não pode ser desfeita."
        textoConfirmar="Excluir"
        perigo
        carregando={excluir.isPending}
        onConfirmar={() => excluir.mutate()}
        onCancelar={() => setConfirmarExclusao(false)}
      />
    </>
  );
}

function EntradaCampo({ campo: c, valor, onChange }: { campo: CampoDef; valor: unknown; onChange: (v: unknown) => void }) {
  const id = `campo-${c.nome}`;
  const texto = String(valor ?? '');
  switch (c.tipo) {
    case 'textarea':
      return <Textarea id={id} value={texto} placeholder={c.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'dinheiro':
      return <CampoDinheiro id={id} valor={valor as number} onChange={onChange} />;
    case 'numero':
      return <CampoQuantidade id={id} valor={texto} onChange={onChange} />;
    case 'data':
      return <Input id={id} type="date" value={texto} onChange={(e) => onChange(e.target.value)} />;
    case 'inteiro':
      return <Input id={id} inputMode="numeric" value={texto} placeholder={c.placeholder} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />;
    case 'booleano':
      return (
        <label className="flex h-10 items-center gap-2 text-sm text-texto">
          <input id={id} type="checkbox" checked={Boolean(valor)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-orange-500" />
          {c.placeholder ?? 'Sim'}
        </label>
      );
    case 'opcoes':
      return (
        <Select id={id} value={texto} onChange={(e) => onChange(e.target.value)}>
          {c.opcoes!.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Select>
      );
    case 'relacao':
      return (
        <Seletor<Relacao>
          id={id}
          chave={c.nome}
          buscar={c.buscar!}
          valor={valor as Relacao | null}
          onChange={onChange}
          rotuloItem={(r) => r.rotulo}
          detalheItem={(r) => r.detalhe}
          placeholder={c.placeholder}
        />
      );
    default:
      return (
        <Input
          id={id}
          type={c.tipo === 'email' ? 'email' : 'text'}
          inputMode={c.tipo === 'telefone' ? 'tel' : undefined}
          maxLength={c.tipo === 'uf' ? 2 : undefined}
          value={texto}
          placeholder={c.placeholder}
          onChange={(e) => onChange(c.tipo === 'uf' || c.tipo === 'placa' ? e.target.value.toUpperCase() : e.target.value)}
          className={c.tipo === 'placa' ? 'font-mono tracking-wider' : ''}
        />
      );
  }
}
