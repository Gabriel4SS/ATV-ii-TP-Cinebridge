import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';

import {
  AuditoriaRecomendacao,
  CompatibilidadeVisitor,
  CossenoStrategy,
  CinebridgeService,
  EquipeOrquestrador,
  EstrategiaRecomendacao,
  FiltragemColaborativaStrategy,
  NotificacaoInterno,
  NotificadorEmail,
  NotificacaoAssunto,
  OrquestradorPadrao,
  Recomendacao,
  RegraNegocioStrategy,
  ValidacaoVisitor,
  buildApp,
  createDefaultProject,
  createDefaultProfessionals,
  createProjectFactory,
  gerarConvites,
  getDefaultStrategy,
  responderConvite,
  reavaliarEquipe,
  startServer,
  substituirProfissional,
} from '../app.js';

describe('Cinebridge core architecture', () => {
  it('deve ranquear profissionais por similaridade de competência', () => {
    const project = createDefaultProject();
    const professionals = createDefaultProfessionals();

    const strategy = new CossenoStrategy();
    const recommendations = strategy.recomendarPorPapel(project, professionals, 'diretor');

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].papel).toBe('diretor');
    expect(recommendations[0].score).toBeGreaterThan(0);
  });

  it('deve selecionar cada estratégia pelo nome configurado', () => {
    expect(getDefaultStrategy('cosseno')).toBeInstanceOf(CossenoStrategy);
    expect(getDefaultStrategy('filtragem-colaborativa')).toBeInstanceOf(FiltragemColaborativaStrategy);
    expect(getDefaultStrategy('regras-de-negocio')).toBeInstanceOf(RegraNegocioStrategy);
  });

  it('deve rejeitar profissionais abaixo do nível obrigatório na montagem', () => {
    const project = createDefaultProject();
    project.papeisObrigatorios = [{ papel: 'diretor', nivelObrigatorio: 5 }];
    const professionals = createDefaultProfessionals().filter((professional) => professional.id === 'p4');

    const result = new OrquestradorPadrao(createProjectFactory('documentario')).montarEquipe(
      project,
      professionals,
      new CossenoStrategy(),
    );

    expect(result).toHaveLength(0);
  });

  it('não deve recomendar alguém abaixo do nível para um papel específico', () => {
    const project = createDefaultProject();
    project.papeisObrigatorios = [
      { papel: 'diretor', nivelObrigatorio: 4 },
      { papel: 'roteirista', nivelObrigatorio: 5 },
    ];

    const result = new OrquestradorPadrao(createProjectFactory('documentario')).montarEquipe(
      project,
      createDefaultProfessionals(),
      new CossenoStrategy(),
    );

    expect(result.some((item) => item.profissionalId === 'p1' && item.papel === 'roteirista')).toBe(false);
  });

  it('deve manter o custo total da equipe dentro do orçamento do projeto', () => {
    const project = createDefaultProject();
    project.orcamentoTotal = 10000;
    project.papeisObrigatorios = [{ papel: 'diretor', nivelObrigatorio: 4 }];
    const professionals = createDefaultProfessionals().filter((professional) =>
      professional.especialidades.includes('diretor'),
    );

    const result = new OrquestradorPadrao(createProjectFactory('documentario')).montarEquipe(
      project,
      professionals,
      new CossenoStrategy(),
    );
    const total = Array.from(new Set(result.map((item) => item.profissionalId)))
      .reduce((sum, professionalId) => sum + professionals.find((professional) => professional.id === professionalId)!.valorMedio, 0);

    expect(total).toBeLessThanOrEqual(project.orcamentoTotal);
  });

  it('deve montar uma equipe com o orquestrador padrão', () => {
    const project = createDefaultProject();
    const professionals = createDefaultProfessionals();
    const result = new OrquestradorPadrao(createProjectFactory('documentario')).montarEquipe(
      project,
      professionals,
      new CossenoStrategy(),
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => project.papeisObrigatorios.some((role) => role.papel === item.papel))).toBe(true);
  });

  it('deve manter o fluxo principal do template method', () => {
    const project = createDefaultProject();
    const professionals = createDefaultProfessionals();

    class TestOrquestrador extends EquipeOrquestrador {
      constructor() {
        super(createProjectFactory('documentario'));
      }

      protected normalizarProjeto(projeto: typeof project) {
        return { ...projeto, papeisObrigatorios: [...projeto.papeisObrigatorios] };
      }

      protected validarRestricoes(projeto: typeof project, candidatos: typeof professionals) {
        return candidatos.filter((profissional) => profissional.disponibilidadeTempo > 0);
      }

      protected selecionarCandidatos(projeto: typeof project, candidatos: typeof professionals) {
        return candidatos.slice(0, 2);
      }

      protected analisarRecomendacoes(
        projeto: typeof project,
        candidatos: typeof professionals,
        estrategia: EstrategiaRecomendacao = new CossenoStrategy(),
      ): Recomendacao[] {
        return candidatos.map((profissional) => ({
          profissionalId: profissional.id,
          papel: 'diretor',
          score: 0.9,
          justificativa: `${profissional.nome} atende ao papel principal`,
        } satisfies Recomendacao));
      }
    }

    const result = new TestOrquestrador().montarEquipe(project, professionals, new CossenoStrategy());

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.papel === 'diretor')).toBe(true);
  });

  it('deve notificar todos os observadores sobre eventos', () => {
    const subject = new NotificacaoAssunto();
    const notificadorEmail = new NotificadorEmail();
    const notificacaoInterno = new NotificacaoInterno();
    const auditoriaRecomendacao = new AuditoriaRecomendacao();

    subject.adicionarObservador(notificadorEmail);
    subject.adicionarObservador(notificacaoInterno);
    subject.adicionarObservador(auditoriaRecomendacao);

    subject.notificar({
      tipo: 'recomendacao-gerada',
      mensagem: 'Nova equipe recomendada',
      payload: { projetoId: 'p1' },
    });

    expect(notificadorEmail.getUltimaMensagem()).toContain('Nova equipe recomendada');
    expect(notificacaoInterno.getUltimaMensagem()).toContain('Nova equipe recomendada');
    expect(auditoriaRecomendacao.getUltimaMensagem()).toContain('Nova equipe recomendada');
  });

  it('deve parar de notificar um observador removido', () => {
    const subject = new NotificacaoAssunto();
    const observer = new NotificadorEmail();

    subject.adicionarObservador(observer);
    subject.removerObservador(observer);
    subject.notificar({ tipo: 'teste', mensagem: 'não deve chegar', payload: {} });

    expect(observer.getUltimaMensagem()).toBe('');
  });

  it('deve integrar o serviço, o orquestrador e os observers', () => {
    const subject = new NotificacaoAssunto();
    const notificadorEmail = new NotificadorEmail();
    subject.adicionarObservador(notificadorEmail);
    const service = new CinebridgeService(
      new CossenoStrategy(),
      new OrquestradorPadrao(createProjectFactory('documentario')),
      subject,
    );

    const recommendations = service.recomendar(createDefaultProject(), createDefaultProfessionals());

    expect(recommendations.length).toBeGreaterThan(0);
    expect(notificadorEmail.getUltimaMensagem()).toContain('Equipe recomendada para proj-001');
  });

  it('deve validar consistência e calcular compatibilidade da equipe', () => {
    const project = createDefaultProject();
    const professionals = createDefaultProfessionals();

    const validacao = new ValidacaoVisitor().visitarProjeto(project, professionals);
    const compatibilidade = new CompatibilidadeVisitor().visitarProjeto(project, professionals);

    expect(validacao.ok).toBe(true);
    expect(compatibilidade).toBeGreaterThan(0);
  });

  it('deve apontar papel obrigatório sem candidato', () => {
    const project = createDefaultProject();
    project.papeisObrigatorios = [{ papel: 'diretor', nivelObrigatorio: 4 }];

    const validacao = new ValidacaoVisitor().visitarProjeto(project, []);

    expect(validacao.ok).toBe(false);
    expect(validacao.erros[0]).toContain('diretor');
  });

  it('deve gerar convites e responder a convite do profissional', () => {
    const project = createDefaultProject();
    const professionals = createDefaultProfessionals();
    const recomendacoes = new CossenoStrategy().recomendarPorPapel(project, professionals, 'diretor');

    const convites = gerarConvites(project, recomendacoes, 'produtor-01');
    const resposta = responderConvite(convites[0], 'aceito');

    expect(convites.length).toBeGreaterThan(0);
    expect(resposta.aceito).toBe(true);
    expect(resposta.mensagem).toContain('aceito');
    expect(convites[0].status).toBe('aceito');
  });

  it('deve registrar rejeição de convite', () => {
    const project = createDefaultProject();
    const professional = createDefaultProfessionals()[0];
    const convite = gerarConvites(project, [{
      profissionalId: professional.id,
      papel: 'diretor',
      score: 0.8,
      justificativa: 'compatível',
    }], 'produtor-01')[0];

    const resposta = responderConvite(convite, 'rejeitado');

    expect(resposta.aceito).toBe(false);
    expect(convite.status).toBe('rejeitado');
  });

  it('deve substituir um profissional e reavaliar a equipe', () => {
    const project = createDefaultProject();
    const professionals = createDefaultProfessionals();
    const equipeAtual = [
      { profissionalId: 'p1', papel: 'diretor', score: 0.9, justificativa: 'diretor atual' },
      { profissionalId: 'p2', papel: 'diretorDeFotografia', score: 0.8, justificativa: 'foto atual' },
    ] as Recomendacao[];

    const substituida = substituirProfissional(equipeAtual, 'diretor', 'p1', professionals, new CossenoStrategy());
    const reavaliada = reavaliarEquipe(project, substituida, professionals, new CossenoStrategy());

    expect(substituida.some((item) => item.profissionalId !== 'p1' && item.papel === 'diretor')).toBe(true);
    expect(reavaliada.length).toBeGreaterThan(0);
  });
});

describe('Cinebridge HTTP integration', () => {
  it('deve responder health e recomendação pela API', async () => {
    const app = await buildApp();

    const health = await app.inject({ method: 'GET', url: '/health' });
    const recommendation = await app.inject({
      method: 'POST',
      url: '/recomendacao',
      payload: { estrategia: 'regras-de-negocio' },
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ ok: true });
    expect(recommendation.statusCode).toBe(200);
    expect(recommendation.json()).toMatchObject({
      projetoId: 'proj-001',
      estrategia: 'regras-de-negocio',
    });

    await app.close();
  });

  it('deve aceitar o modelo enxuto de projeto e profissional', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/recomendacao',
      payload: {
        tipoProjeto: 'documentario',
        projeto: {
          id: 'doc-minimo',
          tipoProjeto: 'documentario',
          genero: 'documentário',
          duracaoEstimada: 20,
          orcamentoTotal: 20000,
          dataEntrega: '2027-12-31',
          papeisObrigatorios: [{ papel: 'diretor', nivelObrigatorio: 4 }],
        },
        profissionais: [{
          id: 'director-01',
          nome: 'Diretor de Exemplo',
          especialidades: ['diretor'],
          competencias: [{ nome: 'diretor', nivel: 5 }],
          valorMedio: 12000,
          disponibilidadeTempo: 1,
          avaliacoes: [4, 5, 5],
        }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().projetoId).toBe('doc-minimo');
    expect(response.json().validacao.ok).toBe(true);
    expect(response.json().recomendacoes).toHaveLength(1);

    await app.close();
  });

  it.each([
    ['documentario', 'filtragem-colaborativa', 'NotificadorEmail'],
    ['animacao', 'cosseno', 'NotificacaoInterno'],
    ['publicitario', 'regras-de-negocio', 'AuditoriaRecomendacao'],
  ] as const)('deve selecionar a família da fábrica para %s', async (tipoProjeto, estrategia, notificador) => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/recomendacao',
      payload: { tipoProjeto },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      tipoProjeto,
      estrategia,
      notificador,
      validacao: { ok: true },
    });
    expect(response.json().recomendacoes.length).toBeGreaterThan(0);
    expect(response.json().notificacaoObservada).toContain('Equipe recomendada');

    await app.close();
  });

  it('deve rejeitar tipo de projeto não suportado', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/recomendacao',
      payload: { tipoProjeto: 'videoclipe' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain('tipoProjeto');
    await app.close();
  });

  it('deve inferir fábrica pelo gênero quando tipoProjeto não é enviado', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/recomendacao',
      payload: { projeto: { ...createDefaultProject(), genero: 'animação' } },
    });

    expect(response.json()).toMatchObject({
      tipoProjeto: 'animacao',
      estrategia: 'cosseno',
      notificador: 'NotificacaoInterno',
    });
    await app.close();
  });

  it('deve expor os resultados dos padrões por rotas específicas', async () => {
    const app = await buildApp();
    const routes = ['/observer', '/orquestrador', '/strategy?estrategia=regras-de-negocio', '/visitor', '/workflow'];

    for (const route of routes) {
      const response = await app.inject({ method: 'GET', url: route });
      expect(response.statusCode).toBe(200);
    }

    expect((await app.inject({ method: 'GET', url: '/observer' })).json().padrao).toBe('Observer');
    const observerResponse = (await app.inject({ method: 'GET', url: '/observer' })).json();
    expect(observerResponse.evento).toBe('convite-aceito');
    expect(observerResponse.respostaConviteRejeitado.aceito).toBe(false);
    expect(observerResponse.respostaConviteAceito.aceito).toBe(true);
    expect(observerResponse.conviteRejeitado.status).toBe('rejeitado');
    expect(observerResponse.conviteAceito.status).toBe('aceito');
    expect(observerResponse.emails.rejeicao).toContain('Convite rejeitado');
    expect(observerResponse.emails.rejeicao).toContain(observerResponse.profissionalRejeitou);
    expect(observerResponse.emails.aceite).toContain('Convite aceito');
    expect(observerResponse.emails.aceite).toContain(observerResponse.profissionalAceitou);
    expect((await app.inject({ method: 'GET', url: '/orquestrador' })).json().padrao).toBe('Template Method');
    expect((await app.inject({ method: 'GET', url: '/visitor' })).json().padrao).toBe('Visitor');

    await app.close();
  });

  it('deve usar a próxima porta quando a solicitada estiver ocupada', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const address = blocker.address();
    if (!address || typeof address === 'string') {
      throw new Error('Não foi possível obter a porta de teste.');
    }

    const app = await buildApp();
    const activePort = await startServer(app, address.port, '127.0.0.1');

    expect(activePort).toBeGreaterThan(address.port);

    await app.close();
    await new Promise<void>((resolve, reject) => blocker.close((error) => error ? reject(error) : resolve()));
  });
});
