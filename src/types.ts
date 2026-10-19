export type Papel =
  | 'diretor'
  | 'diretorDeFotografia'
  | 'sonoplasta'
  | 'editor'
  | 'roteirista'
  | 'especialistaEmEfeitosVisuais';

export type TipoProjeto = 'documentario' | 'animacao' | 'publicitario';

export interface Competencia {
  nome: Papel;
  nivel: number;
}

export interface PapelObrigatorio {
  papel: Papel;
  nivelObrigatorio: number;
}

export interface Projeto {
  id: string;
  tipoProjeto?: TipoProjeto;
  genero: string;
  duracaoEstimada: number;
  orcamentoTotal: number;
  dataEntrega: string;
  papeisObrigatorios: PapelObrigatorio[];
}

export interface Profissional {
  id: string;
  nome: string;
  especialidades: Papel[];
  competencias: Competencia[];
  valorMedio: number;
  disponibilidadeTempo: number;
  avaliacoes: number[];
}

export interface Recomendacao {
  profissionalId: string;
  papel: Papel;
  score: number;
  justificativa: string;
}

export interface EventoSistema {
  tipo: string;
  mensagem: string;
  payload: Record<string, unknown>;
}

export interface EstrategiaRecomendacao {
  readonly nome: string;
  recomendarPorPapel(
    projeto: Projeto,
    profissionais: Profissional[],
    papel: Papel,
  ): Recomendacao[];
}

export interface Observador {
  notificar(evento: EventoSistema): void;
}

export interface Visitante<T> {
  visitarProjeto(projeto: Projeto, profissionais: Profissional[]): T;
}
