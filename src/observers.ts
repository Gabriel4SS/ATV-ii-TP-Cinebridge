import type { EventoSistema, Observador } from './types.js';

export abstract class AssuntoObservavel {
  private readonly observadores: Observador[] = [];

  adicionarObservador(observador: Observador): void {
    this.observadores.push(observador);
  }

  removerObservador(observador: Observador): void {
    const indice = this.observadores.indexOf(observador);
    if (indice >= 0) {
      this.observadores.splice(indice, 1);
    }
  }

  protected disparar(evento: EventoSistema): void {
    for (const observador of this.observadores) {
      observador.notificar(evento);
    }
  }
}

export class NotificacaoAssunto extends AssuntoObservavel {
  notificar(evento: EventoSistema): void {
    this.disparar(evento);
  }
}

export class NotificadorEmail implements Observador {
  private ultimaMensagem = '';

  notificar(evento: EventoSistema): void {
    this.ultimaMensagem = `email: ${evento.mensagem}`;
  }

  getUltimaMensagem(): string {
    return this.ultimaMensagem;
  }
}

export class NotificacaoInterno implements Observador {
  private ultimaMensagem = '';

  notificar(evento: EventoSistema): void {
    this.ultimaMensagem = `mensagem: ${evento.mensagem}`;
  }

  getUltimaMensagem(): string {
    return this.ultimaMensagem;
  }
}

export class AuditoriaRecomendacao implements Observador {
  private ultimaMensagem = '';

  notificar(evento: EventoSistema): void {
    this.ultimaMensagem = `auditoria: ${evento.tipo} | ${evento.mensagem}`;
  }

  getUltimaMensagem(): string {
    return this.ultimaMensagem;
  }
}
