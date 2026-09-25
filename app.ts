import Fastify, { type FastifyInstance } from 'fastify';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AuditoriaRecomendacao,
  NotificacaoInterno,
  NotificadorEmail,
  NotificacaoAssunto,
} from './src/observers.js';
import { OrquestradorPadrao } from './src/orchestration.js';
import {
  CinebridgeService,
  createDefaultProfessionals,
  createDefaultProject,
  getDefaultStrategy,
} from './src/service.js';
import {
  CossenoStrategy,
  FiltragemColaborativaStrategy,
  RegraNegocioStrategy,
} from './src/strategies.js';
import { CompatibilidadeVisitor, RelatorioVisitor, ValidacaoVisitor } from './src/visitors.js';
import { gerarConvites, reavaliarEquipe, responderConvite } from './src/workflow.js';

export type {
  Competencia,
  EventoSistema,
  EstrategiaRecomendacao,
  Observador,
  Papel,
  PapelObrigatorio,
  Profissional,
  Projeto,
  Recomendacao,
  Visitante,
} from './src/types.js';

export {
  AuditoriaRecomendacao,
  NotificacaoInterno,
  NotificadorEmail,
  NotificacaoAssunto,
};

export {
  CossenoStrategy,
  FiltragemColaborativaStrategy,
  RegraNegocioStrategy,
};

export { EquipeOrquestrador, OrquestradorPadrao } from './src/orchestration.js';
export { CompatibilidadeVisitor, RelatorioVisitor, ValidacaoVisitor };
export { CinebridgeService, createDefaultProfessionals, createDefaultProject, getDefaultStrategy };
export { gerarConvites, reavaliarEquipe, responderConvite, substituirProfissional } from './src/workflow.js';

export const startServer = async (
  app: FastifyInstance,
  requestedPort = 3000,
  host = '0.0.0.0',
): Promise<number> => {
  let port = requestedPort;

  while (true) {
    try {
      await app.listen({ port, host });
      return port;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') {
        throw error;
      }

      port += 1;
    }
  }
};

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({ ok: true }));

  app.get('/observer', async () => {
    const projeto = createDefaultProject();
    const profissionais = createDefaultProfessionals();
    const recomendacoes = new OrquestradorPadrao().montarEquipe(
      projeto,
      profissionais,
      getDefaultStrategy('cosseno'),
    );
    const convites = gerarConvites(projeto, recomendacoes, 'produtor-01');
    const conviteRejeitado = convites[0];
    const conviteAceito = convites[1];
    const profissionalRejeitou = profissionais.find((item) => item.id === conviteRejeitado?.profissionalId);
    const profissionalAceitou = profissionais.find((item) => item.id === conviteAceito?.profissionalId);
    const respostaRejeicao = conviteRejeitado
      ? responderConvite(conviteRejeitado, 'rejeitado')
      : undefined;
    const respostaAceite = conviteAceito
      ? responderConvite(conviteAceito, 'aceito')
      : undefined;
    const assunto = new NotificacaoAssunto();
    const notificadorEmail = new NotificadorEmail();
    const notificacaoInterno = new NotificacaoInterno();
    const auditoriaRecomendacao = new AuditoriaRecomendacao();

    assunto.adicionarObservador(notificadorEmail);
    assunto.adicionarObservador(notificacaoInterno);
    assunto.adicionarObservador(auditoriaRecomendacao);
    assunto.notificar(respostaRejeicao
      ? {
          tipo: 'convite-rejeitado',
          mensagem: `Convite rejeitado por ${profissionalRejeitou?.nome ?? 'profissional desconhecido'} para o papel ${conviteRejeitado.papel}.`,
          payload: {
            origem: '/observer',
            conviteId: conviteRejeitado.id,
            profissionalId: conviteRejeitado.profissionalId,
          },
        }
      : {
          tipo: 'demonstracao-observer',
          mensagem: 'Nenhum convite foi gerado para rejeição.',
          payload: { origem: '/observer' },
        });
    const emailRejeicao = notificadorEmail.getUltimaMensagem();

    if (respostaAceite) {
      assunto.notificar({
        tipo: 'convite-aceito',
        mensagem: `Convite aceito por ${profissionalAceitou?.nome ?? 'profissional desconhecido'} para o papel ${conviteAceito.papel}.`,
        payload: {
          origem: '/observer',
          conviteId: conviteAceito.id,
          profissionalId: conviteAceito.profissionalId,
        },
      });
    }
    const emailAceite = notificadorEmail.getUltimaMensagem();

    return {
      padrao: 'Observer',
      evento: respostaAceite ? 'convite-aceito' : 'convite-rejeitado',
      profissionalRejeitou: profissionalRejeitou?.nome ?? null,
      profissionalAceitou: profissionalAceitou?.nome ?? null,
      conviteRejeitado: conviteRejeitado ?? null,
      conviteAceito: conviteAceito ?? null,
      respostaConviteRejeitado: respostaRejeicao ?? null,
      respostaConviteAceito: respostaAceite ?? null,
      observadores: {
        notificadoremail: notificadorEmail.getUltimaMensagem(),
        notificacaointerno: notificacaoInterno.getUltimaMensagem(),
        auditoriarecomendacao: auditoriaRecomendacao.getUltimaMensagem(),
      },
      emails: {
        rejeicao: emailRejeicao,
        aceite: emailAceite,
      },
    };
  });

  app.get('/orquestrador', async () => {
    const projeto = createDefaultProject();
    const profissionais = createDefaultProfessionals();
    const recomendacoes = new OrquestradorPadrao().montarEquipe(
      projeto,
      profissionais,
      getDefaultStrategy('cosseno'),
    );
    const ids = new Set(recomendacoes.map((item) => item.profissionalId));
    const custoTotal = [...ids].reduce((total, id) => {
      const profissional = profissionais.find((item) => item.id === id);
      return total + (profissional?.valorMedio ?? 0);
    }, 0);

    return {
      padrao: 'Template Method',
      orquestrador: 'OrquestradorPadrao',
      projetoId: projeto.id,
      recomendacoes,
      custoTotal,
      orcamentoTotal: projeto.orcamentoTotal,
    };
  });

  app.get('/strategy', async (request) => {
    const query = request.query as { estrategia?: string };
    const estrategia = query.estrategia ?? 'cosseno';
    const projeto = createDefaultProject();
    const profissionais = createDefaultProfessionals();
    const recomendacoes = getDefaultStrategy(estrategia).recomendarPorPapel(
      projeto,
      profissionais,
      'diretor',
    );

    return {
      padrao: 'Strategy',
      estrategia: getDefaultStrategy(estrategia).nome,
      papel: 'diretor',
      recomendacoes,
    };
  });

  app.get('/visitor', async () => {
    const projeto = createDefaultProject();
    const profissionais = createDefaultProfessionals();

    return {
      padrao: 'Visitor',
      validacao: new ValidacaoVisitor().visitarProjeto(projeto, profissionais),
      compatibilidade: new CompatibilidadeVisitor().visitarProjeto(projeto, profissionais),
      relatorio: new RelatorioVisitor().visitarProjeto(projeto, profissionais),
    };
  });

  app.get('/timePerfeito',async()=>{                                                                                                                       return("O time perfeito é quando o Narume está em todas as funções, afinal o pai amassa em edição de fotos e videos, e acredito me dar bem na parte de roteiro e direção")})

  app.get('/workflow', async () => {
    const projeto = createDefaultProject();
    const profissionais = createDefaultProfessionals();
    const recomendacoes = new OrquestradorPadrao().montarEquipe(
      projeto,
      profissionais,
      getDefaultStrategy('cosseno'),
    );
    const convites = gerarConvites(projeto, recomendacoes, 'produtor-01');
    const equipeReavaliada = reavaliarEquipe(
      projeto,
      recomendacoes,
      profissionais,
      getDefaultStrategy('cosseno'),
    );

    return {
      fluxo: 'convites-e-reavaliacao',
      convites,
      equipeReavaliada,
    };
  });

  app.post('/recomendacao', async (request, reply) => {
    const body = request.body as {
      projeto?: import('./src/types.js').Projeto;
      profissionais?: import('./src/types.js').Profissional[];
      estrategia?: 'cosseno' | 'filtragem-colaborativa' | 'regras-de-negocio';
    };

    const projeto = body.projeto ?? createDefaultProject();
    const profissionais = body.profissionais ?? createDefaultProfessionals();
    const estrategia = body.estrategia ?? 'cosseno';

    const notificacoes = new NotificacaoAssunto();
    notificacoes.adicionarObservador(new NotificadorEmail());
    notificacoes.adicionarObservador(new NotificacaoInterno());
    notificacoes.adicionarObservador(new AuditoriaRecomendacao());

    const service = new CinebridgeService(
      getDefaultStrategy(estrategia),
      new OrquestradorPadrao(),
      notificacoes,
    );

    const recomendacoes = service.recomendar(projeto, profissionais);
    const relatorio = new RelatorioVisitor().visitarProjeto(projeto, profissionais);

    return reply.code(200).send({
      projetoId: projeto.id,
      estrategia,
      recomendacoes,
      relatorio,
    });
  });

  return app;
};

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    const activePort = await startServer(app, port, host);
    console.log(`Cinebridge disponível em http://localhost:${activePort}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}
