import type { Projeto, TipoProjeto } from './types.js';

export abstract class ProjetoPrototype implements Projeto {
  id!: string;
  tipoProjeto!: TipoProjeto;
  genero!: string;
  duracaoEstimada!: number;
  orcamentoTotal!: number;
  dataEntrega!: string;
  papeisObrigatorios!: Projeto['papeisObrigatorios'];

  protected constructor(dados: Projeto) {
    Object.assign(this, structuredClone(dados));
  }

  clonar(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), structuredClone(this));
  }
}

const projetoInicial = (
  tipoProjeto: TipoProjeto,
  genero: string,
  papeisObrigatorios: Projeto['papeisObrigatorios'],
): Projeto => ({
  id: `${tipoProjeto}-001`,
  tipoProjeto,
  genero,
  duracaoEstimada: 90,
  orcamentoTotal: 120000,
  dataEntrega: '2027-12-15',
  papeisObrigatorios,
});

export class ProjetoDocumentario extends ProjetoPrototype {
  constructor() {
    super(projetoInicial('documentario', 'documentário', [
      { papel: 'diretor', nivelObrigatorio: 4 },
      { papel: 'diretorDeFotografia', nivelObrigatorio: 3 },
      { papel: 'sonoplasta', nivelObrigatorio: 3 },
      { papel: 'editor', nivelObrigatorio: 3 },
    ]));
  }
}

export class ProjetoAnimacao extends ProjetoPrototype {
  constructor() {
    super(projetoInicial('animacao', 'animação', [
      { papel: 'diretor', nivelObrigatorio: 4 },
      { papel: 'editor', nivelObrigatorio: 4 },
      { papel: 'especialistaEmEfeitosVisuais', nivelObrigatorio: 4 },
      { papel: 'sonoplasta', nivelObrigatorio: 3 },
    ]));
  }
}

export class ProjetoPublicitario extends ProjetoPrototype {
  constructor() {
    super(projetoInicial('publicitario', 'publicidade', [
      { papel: 'diretor', nivelObrigatorio: 4 },
      { papel: 'diretorDeFotografia', nivelObrigatorio: 3 },
      { papel: 'editor', nivelObrigatorio: 3 },
    ]));
  }
}
