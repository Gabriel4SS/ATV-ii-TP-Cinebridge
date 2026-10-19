import {
  AuditoriaRecomendacao,
  NotificacaoInterno,
  NotificadorEmail,
} from './observers.js';
import {
  CossenoStrategy,
  FiltragemColaborativaStrategy,
  RegraNegocioStrategy,
} from './strategies.js';
import { ValidacaoVisitor } from './visitors.js';
import {
  ProjetoAnimacao,
  ProjetoDocumentario,
  ProjetoPrototype,
  ProjetoPublicitario,
} from './prototypes.js';
import type {
  EstrategiaRecomendacao,
  Observador,
  Projeto,
  Profissional,
  TipoProjeto,
  Visitante,
} from './types.js';

export interface ResultadoValidacao {
  ok: boolean;
  erros: string[];
}

export interface NotificadorProjeto extends Observador {
  getUltimaMensagem(): string;
}

export interface FabricaProjeto {
  criarProjeto(dados?: Partial<Projeto>): ProjetoPrototype;
  criarValidador(): Visitante<ResultadoValidacao>;
  criarRecomendador(): EstrategiaRecomendacao;
  criarNotificador(): NotificadorProjeto;
}

abstract class CriadorProjeto {
  protected abstract criarPrototipo(): ProjetoPrototype;

  criarProjeto(dados: Partial<Projeto> = {}): ProjetoPrototype {
    const projeto = this.criarPrototipo().clonar();
    return Object.assign(projeto, structuredClone(dados));
  }
}

abstract class ValidadorTipoProjeto implements Visitante<ResultadoValidacao> {
  protected abstract readonly tipoEsperado: TipoProjeto;
  private readonly validadorBase = new ValidacaoVisitor();

  visitarProjeto(projeto: Projeto, profissionais: Profissional[]): ResultadoValidacao {
    const resultado = this.validadorBase.visitarProjeto(projeto, profissionais);
    const erros = [...resultado.erros];

    if (projeto.tipoProjeto && projeto.tipoProjeto !== this.tipoEsperado) {
      erros.push(`A fábrica ${this.tipoEsperado} não pode validar projeto do tipo ${projeto.tipoProjeto ?? 'não informado'}.`);
    }

    return { ok: erros.length === 0, erros };
  }
}

class ValidadorDocumentario extends ValidadorTipoProjeto {
  protected readonly tipoEsperado = 'documentario';
}

class ValidadorAnimacao extends ValidadorTipoProjeto {
  protected readonly tipoEsperado = 'animacao';
}

class ValidadorPublicitario extends ValidadorTipoProjeto {
  protected readonly tipoEsperado = 'publicitario';
}

export class FabricaDocumentario extends CriadorProjeto implements FabricaProjeto {
  private readonly prototipo = new ProjetoDocumentario();

  protected criarPrototipo(): ProjetoPrototype {
    return this.prototipo;
  }

  criarValidador(): Visitante<ResultadoValidacao> {
    return new ValidadorDocumentario();
  }

  criarRecomendador(): EstrategiaRecomendacao {
    return new FiltragemColaborativaStrategy();
  }

  criarNotificador(): NotificadorProjeto {
    return new NotificadorEmail();
  }
}

export class FabricaAnimacao extends CriadorProjeto implements FabricaProjeto {
  private readonly prototipo = new ProjetoAnimacao();

  protected criarPrototipo(): ProjetoPrototype {
    return this.prototipo;
  }

  criarValidador(): Visitante<ResultadoValidacao> {
    return new ValidadorAnimacao();
  }

  criarRecomendador(): EstrategiaRecomendacao {
    return new CossenoStrategy();
  }

  criarNotificador(): NotificadorProjeto {
    return new NotificacaoInterno();
  }
}

export class FabricaPublicitario extends CriadorProjeto implements FabricaProjeto {
  private readonly prototipo = new ProjetoPublicitario();

  protected criarPrototipo(): ProjetoPrototype {
    return this.prototipo;
  }

  criarValidador(): Visitante<ResultadoValidacao> {
    return new ValidadorPublicitario();
  }

  criarRecomendador(): EstrategiaRecomendacao {
    return new RegraNegocioStrategy();
  }

  criarNotificador(): NotificadorProjeto {
    return new AuditoriaRecomendacao();
  }
}

const projectFactoryCreators: Record<TipoProjeto, () => FabricaProjeto> = {
  documentario: () => new FabricaDocumentario(),
  animacao: () => new FabricaAnimacao(),
  publicitario: () => new FabricaPublicitario(),
};

export const createProjectFactory = (tipo: TipoProjeto): FabricaProjeto =>
  projectFactoryCreators[tipo]();

export const resolveTipoProjeto = (value: unknown): TipoProjeto | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'documentario') {
    return 'documentario';
  }
  if (normalized === 'animacao') {
    return 'animacao';
  }
  if (normalized === 'publicitario' || normalized === 'publicidade') {
    return 'publicitario';
  }

  return undefined;
};
