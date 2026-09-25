import type { Projeto, Profissional, Visitante } from './types.js';

export class ValidacaoVisitor implements Visitante<{ ok: boolean; erros: string[] }> {
  visitarProjeto(projeto: Projeto, profissionais: Profissional[]): { ok: boolean; erros: string[] } {
    const erros: string[] = [];

    if (projeto.papeisObrigatorios.length === 0) {
      erros.push('O projeto precisa de papéis obrigatórios.');
    }

    for (const papel of projeto.papeisObrigatorios) {
      const temCandidato = profissionais.some((profissional) => profissional.especialidades.includes(papel.papel));
      if (!temCandidato) {
        erros.push(`Nenhum profissional disponível para o papel ${papel.papel}.`);
      }
    }

    return {
      ok: erros.length === 0,
      erros,
    };
  }
}

export class CompatibilidadeVisitor implements Visitante<number> {
  visitarProjeto(projeto: Projeto, profissionais: Profissional[]): number {
    const total = profissionais.reduce((acumulador, profissional) => {
      const notas = profissional.avaliacoes.length > 0
        ? profissional.avaliacoes.reduce((soma, valor) => soma + valor, 0) / profissional.avaliacoes.length
        : 0;
      return acumulador + notas;
    }, 0);

    return total / Math.max(profissionais.length, 1);
  }
}

export class RelatorioVisitor implements Visitante<string> {
  visitarProjeto(projeto: Projeto, profissionais: Profissional[]): string {
    const validacao = new ValidacaoVisitor().visitarProjeto(projeto, profissionais);
    const compatibilidade = new CompatibilidadeVisitor().visitarProjeto(projeto, profissionais);

    return `Projeto ${projeto.id}: ${validacao.ok ? 'válido' : 'com pendências'} | compatibilidade ${compatibilidade.toFixed(2)}`;
  }
}
