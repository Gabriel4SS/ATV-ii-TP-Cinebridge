import type {
  EstrategiaRecomendacao,
  Papel,
  Projeto,
  Profissional,
  Recomendacao,
} from './types.js';

const getCompetenciaNivel = (profissional: Profissional, nome: string): number => {
  const competencia = profissional.competencias.find((item) => item.nome === nome);
  return competencia?.nivel ?? 0;
};

const getNivelObrigatorio = (projeto: Projeto, papel: Papel): number =>
  projeto.papeisObrigatorios.find((item) => item.papel === papel)?.nivelObrigatorio ?? 0;

const cosineSimilarity = (left: number[], right: number[]): number => {
  const product = left.reduce((total, value, index) => total + value * right[index], 0);
  const leftMagnitude = Math.sqrt(left.reduce((total, value) => total + value ** 2, 0));
  const rightMagnitude = Math.sqrt(right.reduce((total, value) => total + value ** 2, 0));

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return product / (leftMagnitude * rightMagnitude);
};

export class CossenoStrategy implements EstrategiaRecomendacao {
  readonly nome = 'cosseno';

  recomendarPorPapel(projeto: Projeto, profissionais: Profissional[], papel: Papel): Recomendacao[] {
    return profissionais
      .filter((profissional) => profissional.especialidades.includes(papel))
      .map((profissional) => {
        const nivel = getCompetenciaNivel(profissional, papel);
        const scoreBase = profissional.avaliacoes.length > 0
          ? profissional.avaliacoes.reduce((total, valor) => total + valor, 0) / profissional.avaliacoes.length
          : 0;
        const nivelObrigatorio = getNivelObrigatorio(projeto, papel);

        const score = Number(cosineSimilarity(
          [nivel / 5, scoreBase / 5],
          [nivelObrigatorio / 5, 1],
        ).toFixed(3));

        return {
          profissionalId: profissional.id,
          papel,
          score,
          justificativa: `${profissional.nome} tem especialidade em ${papel} com média de avaliação ${scoreBase.toFixed(1)} e nível de competência ${nivel}.`,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

export class FiltragemColaborativaStrategy implements EstrategiaRecomendacao {
  readonly nome = 'filtragem-colaborativa';

  recomendarPorPapel(projeto: Projeto, profissionais: Profissional[], papel: Papel): Recomendacao[] {
    return profissionais
      .filter((profissional) => profissional.especialidades.includes(papel))
      .map((profissional) => ({
        profissionalId: profissional.id,
        papel,
        score: Number((
          (profissional.avaliacoes.reduce((total, valor) => total + valor, 0) / Math.max(profissional.avaliacoes.length, 1) / 5) * 0.7
          + Math.min(profissional.historicoProjetos / 20, 1) * 0.3
        ).toFixed(3)),
        justificativa: `${profissional.nome} foi avaliado em projetos anteriores com foco em ${papel}.`,
      }))
      .sort((a, b) => b.score - a.score);
  }
}

export class RegraNegocioStrategy implements EstrategiaRecomendacao {
  readonly nome = 'regras-de-negocio';

  recomendarPorPapel(projeto: Projeto, profissionais: Profissional[], papel: Papel): Recomendacao[] {
    return profissionais
      .filter((profissional) => {
        const nivel = getCompetenciaNivel(profissional, papel);
        return profissional.especialidades.includes(papel) && nivel >= getNivelObrigatorio(projeto, papel);
      })
      .map((profissional) => {
        const score = 1;

        return {
          profissionalId: profissional.id,
          papel,
          score,
          justificativa: `${profissional.nome} atende ao nível exigido para ${papel}.`,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
