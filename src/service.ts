import { NotificacaoAssunto } from './observers.js';
import { EquipeOrquestrador } from './orchestration.js';
import { CossenoStrategy, FiltragemColaborativaStrategy, RegraNegocioStrategy } from './strategies.js';
import type { EstrategiaRecomendacao, Projeto, Profissional, Recomendacao } from './types.js';

export class CinebridgeService {
  constructor(
    private readonly estrategia: EstrategiaRecomendacao,
    private readonly orquestrador: EquipeOrquestrador,
    private readonly notificacoes: NotificacaoAssunto,
  ) {}

  recomendar(projeto: Projeto, profissionais: Profissional[]): Recomendacao[] {
    const recom = this.orquestrador.montarEquipe(projeto, profissionais, this.estrategia);

    this.notificacoes.notificar({
      tipo: 'recomendacao-gerada',
      mensagem: `Equipe recomendada para ${projeto.id}`,
      payload: { projetoId: projeto.id, quantidade: recom.length },
    });

    return recom;
  }
}

export const createDefaultProject = (): Projeto => ({
  id: 'proj-001',
  genero: 'drama',
  duracaoEstimada: 90,
  orcamentoTotal: 120000,
  dataEntrega: '2026-12-15',
  papeisObrigatorios: [
    { papel: 'diretor', nivelObrigatorio: 4 },
    { papel: 'diretorDeFotografia', nivelObrigatorio: 4 },
    { papel: 'sonoplasta', nivelObrigatorio: 3 },
    { papel: 'editor', nivelObrigatorio: 3 },
    { papel: 'roteirista', nivelObrigatorio: 4 },
    { papel: 'especialistaEmEfeitosVisuais', nivelObrigatorio: 3 },
  ],
});

export const createDefaultProfessionals = (): Profissional[] => [
  {
    id: 'p1',
    nome: 'Ana Almeida',
    especialidades: ['diretor', 'roteirista'],
    competencias: [
      { nome: 'diretor', nivel: 5 },
      { nome: 'roteirista', nivel: 4 },
    ],
    valorMedio: 8000,
    disponibilidadeTempo: 6,
    avaliacoes: [5, 4, 5, 5],
  },
  {
    id: 'p2',
    nome: 'Bruno Costa',
    especialidades: ['diretorDeFotografia', 'editor'],
    competencias: [
      { nome: 'diretorDeFotografia', nivel: 5 },
      { nome: 'editor', nivel: 4 },
    ],
    valorMedio: 6750,
    disponibilidadeTempo: 4,
    avaliacoes: [4, 5, 4, 5],
  },
  {
    id: 'p3',
    nome: 'Carla Mendes',
    especialidades: ['sonoplasta', 'especialistaEmEfeitosVisuais'],
    competencias: [
      { nome: 'sonoplasta', nivel: 4 },
      { nome: 'especialistaEmEfeitosVisuais', nivel: 5 },
    ],
    valorMedio: 6000,
    disponibilidadeTempo: 3,
    avaliacoes: [5, 5, 4, 5],
  },
  {
    id: 'p4',
    nome: 'Daniel Rocha',
    especialidades: ['diretor'],
    competencias: [
      { nome: 'diretor', nivel: 4 },
    ],
    valorMedio: 9000,
    disponibilidadeTempo: 5,
    avaliacoes: [4, 5, 4, 4],
  },
];

export const getDefaultStrategy = (strategy: string): EstrategiaRecomendacao => {
  const map: Record<string, EstrategiaRecomendacao> = {
    cosseno: new CossenoStrategy(),
    'filtragem-colaborativa': new FiltragemColaborativaStrategy(),
    'regras-de-negocio': new RegraNegocioStrategy(),
  };

  return map[strategy] ?? new CossenoStrategy();
};
