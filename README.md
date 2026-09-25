# Cinebridge

## Introdução

O Cinebridge ajuda produtores e equipes de audiovisual a encontrar profissionais adequados para um projeto. O usuário informa os dados de uma produção, e o sistema sugere profissionais considerando competências, avaliações, disponibilidade e orçamento.

## O que o sistema faz

O Cinebridge pode:

- receber informações de um projeto audiovisual;
- identificar papéis obrigatórios, como diretor, editor e roteirista;
- consultar profissionais cadastrados;
- sugerir candidatos adequados;
- gerar convites para profissionais;
- registrar aceites e rejeições;
- substituir profissionais e reavaliar a equipe;
- registrar notificações e eventos importantes.

## Como iniciar o sistema

### 1. Abrir o terminal

Abra o terminal dentro da pasta do projeto.

### 2. Instalar as dependências

Na primeira execução, digite:

```bash
npm install
```

### 3. Iniciar a aplicação

Digite:

```bash
npm run dev
```

A aplicação ficará disponível no endereço `http://localhost:3000`.

## Como verificar se está funcionando

Abra o navegador ou uma ferramenta como Postman e acesse:

```text
http://localhost:3000/health
```

Quando estiver funcionando, o sistema responderá:

```json
{
  "ok": true
}
```

## Como solicitar uma recomendação

A recomendação é solicitada pelo endereço:

```http
POST http://localhost:3000/recomendacao
```

No Postman, Insomnia ou o sowtware de teste de sua preferencia, escolha o método `POST`, selecione o tipo de corpo JSON e envie, por exemplo:

```json
{
  "estrategia": "cosseno"
}
```

Quando nenhum projeto ou profissional é informado, o sistema usa os dados de exemplo cadastrados na aplicação.

## Como visualizar os padrões de projeto

Com a aplicação ligada, estas rotas permitem visualizar cada parte do sistema diretamente no navegador:

```text
GET http://localhost:3000/observer
GET http://localhost:3000/orquestrador
GET http://localhost:3000/strategy?estrategia=cosseno
GET http://localhost:3000/visitor
GET http://localhost:3000/workflow
```

Cada endereço retorna um JSON demonstrando o resultado do padrão correspondente:

- `/observer` mostra o evento recebido pelos observadores;
- `/orquestrador` mostra a equipe recomendada e o custo total;
- `/strategy` mostra as recomendações de uma estratégia;
- `/visitor` mostra validação, compatibilidade e relatório;
- `/workflow` mostra convites e reavaliação da equipe.

Na resposta de `/observer`, há um exemplo em que o primeiro profissional recomendado rejeita o convite e o segundo aceita. Os eventos `convite-rejeitado` e `convite-aceito` são enviados aos observers, e o `NotificadorEmail` recebe as duas mensagens.

Os três resultados aparecem em:

- `notificadoremail`;
- `notificacaointerno`;
- `auditoriarecomendacao`.

A resposta também informa o profissional que rejeitou, o convite rejeitado e a resposta registrada.

Os e-mails ficam disponíveis em:

- `emails.rejeicao`;
- `emails.aceite`.

## Escolha da estratégia

O usuário pode escolher uma das estratégias disponíveis:

- `cosseno` — compara a similaridade entre as competências do projeto e do profissional;
- `filtragem-colaborativa` — considera histórico e avaliações;
- `regras-de-negocio` — aplica regras como orçamento, disponibilidade e papéis necessários.

Exemplo:

```json
{
  "estrategia": "regras-de-negocio"
}
```

## Entendendo a resposta

A resposta apresenta:

- o identificador do projeto;
- a estratégia utilizada;
- a lista de profissionais recomendados;
- o papel indicado para cada profissional;
- a pontuação ou justificativa da recomendação;
- um relatório de validação do projeto.

Uma pontuação maior representa uma recomendação mais adequada dentro da estratégia utilizada.

## Fluxo de convite

Depois de selecionar os profissionais, o produtor pode gerar convites para os papéis recomendados. Cada profissional pode:

- aceitar o convite;
- rejeitar o convite.

Quando um convite é rejeitado, o sistema pode buscar outro profissional compatível para o mesmo papel e reavaliar a equipe.

## Fluxo de substituição

Quando for necessário trocar alguém da equipe, o sistema remove o profissional anterior, procura uma alternativa válida e calcula novamente a composição da equipe.

Essa reavaliação considera novamente as informações do projeto e evita, quando possível, selecionar o mesmo profissional que foi substituído.

## Testes da aplicação

Para rodar a os teste do sistema basta digitar o seguinte comando:

```bash
npm test -- --run
```


