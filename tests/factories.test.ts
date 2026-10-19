import { describe, expect, it } from 'vitest';

import { createProjectFactory } from '../src/factories.js';
import { createDefaultProfessionals } from '../src/service.js';
import { ProjetoAnimacao, ProjetoDocumentario, ProjetoPublicitario } from '../src/prototypes.js';

const factories = [
  { type: 'documentario', prototype: ProjetoDocumentario, strategy: 'filtragem-colaborativa', notifier: 'NotificadorEmail' },
  { type: 'animacao', prototype: ProjetoAnimacao, strategy: 'cosseno', notifier: 'NotificacaoInterno' },
  { type: 'publicitario', prototype: ProjetoPublicitario, strategy: 'regras-de-negocio', notifier: 'AuditoriaRecomendacao' },
] as const;

describe('Prototype e Abstract Factory', () => {
  it.each(factories)('cria a família consistente para $type', ({ type, prototype, strategy, notifier }) => {
    const factory = createProjectFactory(type);
    const project = factory.criarProjeto({ id: 'teste-fabrica' });
    const validation = factory.criarValidador().visitarProjeto(project, createDefaultProfessionals());

    expect(project).toBeInstanceOf(prototype);
    expect(project.id).toBe('teste-fabrica');
    expect(project.tipoProjeto).toBe(type);
    expect(validation.ok).toBe(true);
    expect(factory.criarRecomendador().nome).toBe(strategy);
    expect(factory.criarNotificador().constructor.name).toBe(notifier);
  });

  it('clona o projeto profundamente sem compartilhar papéis obrigatórios', () => {
    const original = createProjectFactory('documentario').criarProjeto();
    const clone = original.clonar();

    clone.id = 'projeto-clonado';
    clone.papeisObrigatorios[0].nivelObrigatorio = 1;
    clone.papeisObrigatorios.pop();

    expect(clone).toBeInstanceOf(ProjetoDocumentario);
    expect(original.id).not.toBe(clone.id);
    expect(original.papeisObrigatorios[0].nivelObrigatorio).not.toBe(1);
    expect(clone.papeisObrigatorios).not.toBe(original.papeisObrigatorios);
    expect(clone.papeisObrigatorios[0]).not.toBe(original.papeisObrigatorios[0]);
  });

  it('rejeita validar projeto criado por outra família', () => {
    const projetoAnimacao = createProjectFactory('animacao').criarProjeto();
    const validacao = createProjectFactory('documentario')
      .criarValidador()
      .visitarProjeto(projetoAnimacao, createDefaultProfessionals());

    expect(validacao.ok).toBe(false);
    expect(validacao.erros.some((erro) => erro.includes('não pode validar'))).toBe(true);
  });

  it('valida se os profissionais atendem ao nível exigido pelo projeto', () => {
    const projeto = createProjectFactory('documentario').criarProjeto({
      papeisObrigatorios: [{ papel: 'diretor', nivelObrigatorio: 5 }],
    });
    const profissionais = createDefaultProfessionals().filter((profissional) => profissional.id === 'p4');
    const validacao = createProjectFactory('documentario')
      .criarValidador()
      .visitarProjeto(projeto, profissionais);

    expect(validacao.ok).toBe(false);
    expect(validacao.erros.some((erro) => erro.includes('nível'))).toBe(true);
  });
});
