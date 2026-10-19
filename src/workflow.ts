import type { EstrategiaRecomendacao, Projeto, Profissional, Recomendacao } from './types.js';

export interface Convite {
  id: string;
  projetoId: string;
  profissionalId: string;
  papel: Recomendacao['papel'];
  mensagem: string;
  produtorId: string;
  status: 'pendente' | 'aceito' | 'rejeitado';
}

export interface RespostaConvite {
  conviteId: string;
  profissionalId: string;
  aceito: boolean;
  mensagem: string;
  data: string;
}

export const gerarConvites = (
  projeto: Projeto,
  recomendacoes: Recomendacao[],
  produtorId: string,
): Convite[] =>
  recomendacoes.map((recomendacao, index) => ({
    id: `convite-${projeto.id}-${recomendacao.profissionalId}-${index}`,
    projetoId: projeto.id,
    profissionalId: recomendacao.profissionalId,
    papel: recomendacao.papel,
    mensagem: `Produtor ${produtorId} convidou para o papel ${recomendacao.papel}.`,
    produtorId,
    status: 'pendente',
  }));

export const responderConvite = (
  convite: Convite,
  resposta: 'aceito' | 'rejeitado',
): RespostaConvite => {
  const aceito = resposta === 'aceito';
  convite.status = resposta;

  return {
    conviteId: convite.id,
    profissionalId: convite.profissionalId,
    aceito,
    mensagem: `Convite ${aceito ? 'aceito' : 'rejeitado'} para o papel ${convite.papel}.`,
    data: new Date().toISOString(),
  };
};

export const substituirProfissional = (
  equipeAtual: Recomendacao[],
  papel: Recomendacao['papel'],
  profissionalAnteriorId: string,
  profissionais: Profissional[],
  estrategia: EstrategiaRecomendacao,
): Recomendacao[] => {
  const novaEquipe = equipeAtual.filter((item) => !(item.papel === papel && item.profissionalId === profissionalAnteriorId));
  const candidatos = profissionais.filter(
    (profissional) => profissional.especialidades.includes(papel) && profissional.id !== profissionalAnteriorId,
  );

  const melhores = estrategia.recomendarPorPapel(
    {
      id: 'tmp-projeto',
      genero: 'drama',
      duracaoEstimada: 90,
      orcamentoTotal: 100000,
      dataEntrega: '2026-12-15',
      papeisObrigatorios: [{ papel, nivelObrigatorio: 3 }],
    },
    candidatos,
    papel,
  );

  const melhor = melhores[0] ?? (candidatos[0]
    ? {
        profissionalId: candidatos[0].id,
        papel,
        score: 0.5,
        justificativa: `Substituição automática para ${papel}.`,
      }
    : undefined);

  if (!melhor) {
    return novaEquipe;
  }

  return [
    ...novaEquipe,
    {
      profissionalId: melhor.profissionalId,
      papel,
      score: melhor.score,
      justificativa: melhor.justificativa,
    },
  ];
};

export const reavaliarEquipe = (
  projeto: Projeto,
  equipeAtual: Recomendacao[],
  profissionais: Profissional[],
  estrategia: EstrategiaRecomendacao,
): Recomendacao[] => {
  const recomendacoes: Recomendacao[] = [];

  for (const papel of projeto.papeisObrigatorios) {
    const equipeDoPapel = equipeAtual.filter((item) => item.papel === papel.papel);
    const candidatos = profissionais.filter((profissional) => profissional.especialidades.includes(papel.papel));
    const sugestoes = estrategia.recomendarPorPapel(projeto, candidatos, papel.papel);

    if (sugestoes.length > 0) {
      recomendacoes.push(...sugestoes.slice(0, 2));
      continue;
    }

    if (equipeDoPapel.length > 0) {
      recomendacoes.push(...equipeDoPapel);
    }
  }

  return recomendacoes;
};
