import type { EstrategiaRecomendacao, Projeto, Profissional, Recomendacao } from './types.js';

export abstract class EquipeOrquestrador {
  public montarEquipe(
    projeto: Projeto,
    profissionais: Profissional[],
    estrategia: EstrategiaRecomendacao,
  ): Recomendacao[] {
    const projetoNormalizado = this.normalizarProjeto(projeto);
    const candidatosValidos = this.validarRestricoes(projetoNormalizado, profissionais);
    const candidatosSelecionados = this.selecionarCandidatos(projetoNormalizado, candidatosValidos);
    const recomendacoes = this.analisarRecomendacoes(projetoNormalizado, candidatosSelecionados, estrategia);

    return this.posProcessar(recomendacoes, projetoNormalizado, candidatosSelecionados);
  }

  protected normalizarProjeto(projeto: Projeto): Projeto {
    return { ...projeto, papeisObrigatorios: [...projeto.papeisObrigatorios] };
  }

  protected validarRestricoes(projeto: Projeto, profissionais: Profissional[]): Profissional[] {
    return profissionais.filter((profissional) => {
      const temDisponibilidade = profissional.disponibilidadeTempo > 0;
      const atendeNivel = projeto.papeisObrigatorios.some((papel) =>
        profissional.especialidades.includes(papel.papel)
        && profissional.competencias.some((competencia) =>
          competencia.nome === papel.papel && competencia.nivel >= papel.nivelObrigatorio,
        ),
      );

      return temDisponibilidade && atendeNivel;
    });
  }

  protected selecionarCandidatos(projeto: Projeto, profissionais: Profissional[]): Profissional[] {
    return profissionais
      .filter((profissional) => profissional.especialidades.some((papel) => projeto.papeisObrigatorios.some((item) => item.papel === papel)))
      .slice(0, 8);
  }

  protected analisarRecomendacoes(
    projeto: Projeto,
    profissionais: Profissional[],
    estrategia: EstrategiaRecomendacao,
  ): Recomendacao[] {
    const recomendacoes: Recomendacao[] = [];

    for (const papel of projeto.papeisObrigatorios) {
      const itens = estrategia.recomendarPorPapel(projeto, profissionais, papel.papel);
      recomendacoes.push(...itens.slice(0, 2));
    }

    return recomendacoes;
  }

  protected posProcessar(
    recomendacoes: Recomendacao[],
    projeto: Projeto,
    profissionais: Profissional[],
  ): Recomendacao[] {
    const valores = new Map(profissionais.map((profissional) => [profissional.id, profissional.valorMedio]));
    const idsSelecionados = new Set<string>();
    let custoTotal = 0;

    return recomendacoes
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .filter((item) => {
        const valor = valores.get(item.profissionalId) ?? 0;
        const custoAdicional = idsSelecionados.has(item.profissionalId) ? 0 : valor;

        if (custoTotal + custoAdicional > projeto.orcamentoTotal) {
          return false;
        }

        idsSelecionados.add(item.profissionalId);
        custoTotal += custoAdicional;
        return true;
      })
      .slice(0, projeto.papeisObrigatorios.length * 2);
  }
}

export class OrquestradorPadrao extends EquipeOrquestrador {}
