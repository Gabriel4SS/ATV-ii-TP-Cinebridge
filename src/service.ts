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
  localizacao: 'São Paulo',
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
    localizacao: 'São Paulo',
    historicoProjetos: 12,
    avaliacoes: [5, 4, 5, 5],
    foraDoOrcamento: false,
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
    localizacao: 'Rio de Janeiro',
    historicoProjetos: 9,
    avaliacoes: [4, 5, 4, 5],
    foraDoOrcamento: false,
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
    localizacao: 'Belo Horizonte',
    historicoProjetos: 8,
    avaliacoes: [5, 5, 4, 5],
    foraDoOrcamento: false,
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
    localizacao: 'Curitiba',
    historicoProjetos: 11,
    avaliacoes: [4, 5, 4, 4],
    foraDoOrcamento: false,
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
