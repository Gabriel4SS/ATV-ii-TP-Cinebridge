# Cinebridge

Microsserviço de recomendação e orquestração de equipes audiovisuais, desenvolvido com Node.js, TypeScript e Fastify. A ATV1 implementa Strategy, Template Method, Observer e Visitor. A ATV2 acrescenta Prototype, Factory Method e Abstract Factory para criar famílias de projetos por tipo de produção.

## Evolução da ATV1 para a ATV2

### Ponto de partida: ATV1

Na ATV1, o microsserviço já recebia os dados de um projeto e de profissionais, aplicava uma estratégia de recomendação e usava o orquestrador para filtrar candidatos, gerar recomendações e respeitar o orçamento total. A criação do projeto, entretanto, era centralizada em um modelo comum e em dados padrão. Não havia uma família de objetos diferente para documentários, animações e publicidade.

Os quatro padrões comportamentais já entregues continuam na ATV2:

- **Strategy** troca o algoritmo de recomendação;
- **Template Method** mantém a sequência de montagem da equipe;
- **Observer** recebe eventos e produz notificações/auditoria demonstrativas;
- **Visitor** executa validações e relatórios sem colocar essas operações no modelo de projeto.

### O problema que a ATV2 resolve

Quando cada tipo de produção tem papéis e componentes diferentes, criar tudo diretamente na rota ou espalhar condições como `if tipoProjeto === ...` pelo serviço torna a evolução mais trabalhosa. A ATV2 agrupa os dados e colaboradores relacionados a cada tipo numa fábrica. Assim, o endpoint escolhe uma família e passa seus produtos ao mesmo fluxo de orquestração.

### Os três padrões criacionais

#### Prototype: copiar um projeto configurado

`ProjetoPrototype`, em `src/prototypes.ts`, define `clonar()`. O método cria uma nova instância preservando a classe concreta e faz uma cópia profunda dos dados do projeto, inclusive cada objeto de `papeisObrigatorios`.

As classes `ProjetoDocumentario`, `ProjetoAnimacao` e `ProjetoPublicitario` definem os dados iniciais e os papéis padrão de cada família. A fábrica clona esse protótipo e então aplica os campos personalizados recebidos. Alterar os papéis do novo projeto não altera o protótipo nem outros projetos criados anteriormente.

#### Factory Method: decidir qual protótipo criar

`CriadorProjeto`, em `src/factories.ts`, declara o método abstrato `criarPrototipo()`. Cada fábrica concreta fornece o protótipo de sua família. O método `criarProjeto()` pertence ao criador e executa o mesmo processo para todos: clona o protótipo e aplica os dados personalizados.

Isso separa a operação comum de criação da decisão sobre qual classe concreta de projeto usar.

#### Abstract Factory: criar produtos que combinam

`FabricaProjeto` define quatro operações:

1. `criarProjeto()`;
2. `criarValidador()`;
3. `criarRecomendador()`;
4. `criarNotificador()`.

As fábricas `FabricaDocumentario`, `FabricaAnimacao` e `FabricaPublicitario` implementam esse contrato. Cada uma fornece uma combinação coerente de projeto, validador, estratégia e notifier. Por exemplo, a fábrica de animação fornece `ProjetoAnimacao`, validador de animação, estratégia de cosseno e `NotificacaoInterno`.

O mapa `projectFactoryCreators` registra as fábricas disponíveis. A função `createProjectFactory()` busca a fábrica pelo `TipoProjeto`; o orquestrador não precisa conhecer as classes concretas.

### ATV1 e ATV2 lado a lado

| Parte | ATV1 | ATV2 |
|---|---|---|
| Modelo de projeto | Modelo único e dados padrão. | Três classes concretas com papéis e valores iniciais próprios, clonadas como protótipos. |
| Criação | Serviço construía/fornecia dados de demonstração. | Factory Method cria a instância a partir do protótipo; Abstract Factory seleciona toda a família de colaboradores. |
| Orquestrador | A `Strategy` tinha de ser enviada via JSON explicitamente ao método de montagem da equipe. | Recebe `FabricaProjeto`, usa o validador e obtém dela a `Strategy` padrão, quando nenhuma foi escolhida na requisição. O fluxo principal continua compartilhado. |
| Personalização | O projeto era um objeto comum. | O produtor pode substituir campos do protótipo, como identificador, orçamento, gênero, prazo e papéis obrigatórios. |
| Notificações | `Observers` eram ligados ao fluxo geral. | A fábrica fornece o `notifier` padrão para a família; nesta atividade, ele registra a última mensagem em memória, sem envio real. |
| Orçamento | Limite aplicado à equipe recomendada. | A mesma regra permanece: soma de `valorMedio` por profissional distinto contra o orçamento total, sem percentual por pessoa. |
| Verificação | Testes dos padrões comportamentais e fluxo principal. | Também testa clone independente, produtos das três fábricas, tipo incompatível, payload HTTP e seleção da família. |

### Arquivos principais da ATV2

- `src/types.ts` — `TipoProjeto` e contratos de projeto e profissional usados pela API.
- `src/prototypes.ts` — protótipo base, clonagem profunda e projetos concretos.
- `src/factories.ts` — Factory Method, Abstract Factory, validadores e registro de fábricas.
- `src/orchestration.ts` — recebe a fábrica e mantém o Template Method sem conhecer tipos concretos.
- `app.ts` — identifica a família na requisição e conecta os produtos ao serviço.
- `tests/factories.test.ts` — testes unitários dos protótipos e famílias.
- `tests/app.test.ts` — testes HTTP e de integração, além dos testes mantidos da ATV1.

Adicionar outro tipo exige criar seu protótipo, validador, estratégia e notifier, implementar uma nova fábrica e registrá-la. O `EquipeOrquestrador` não precisa ser alterado. Os dados desta versão permanecem em memória; persistência e integração real de e-mail ou filas não fazem parte da ATV2.
## Requisitos e execução

- Node.js 20 ou superior e npm.
- Compatível com Windows e Linux onde essas versões do Node.js estejam disponíveis.

Na raiz do projeto:

```bash
npm install
npm run dev
```

O servidor será iniciado e você poderá acessa-lo em   `http://localhost:3000`;

## Testes

Os testes unitários e de integração são executados com:
```bash
npm test -- --run
npm run build
```
## Rotas 

- `GET /health` — verifica se a API está ativa.
- `GET /observer` — demonstra notificações de convite aceito e rejeitado.
- `GET /orquestrador` — mostra recomendações e custo da equipe.
- `GET /strategy?estrategia=cosseno` — demonstra uma estratégia.
- `GET /visitor` — mostra validação, compatibilidade e relatório.
- `GET /workflow` — demonstra convites e reavaliação.
- 
## Endpoint de recomendação

```http
POST /recomendacao
Content-Type: application/json
```

O campo `tipoProjeto` seleciona a Abstract Factory. Valores aceitos: `documentario`, `animacao` e `publicitario`. É recomendado enviá-lo explicitamente. Se omitido, o sistema tenta reconhecê-lo por `projeto.tipoProjeto` ou pelo campo `projeto.genero`; sem correspondência, usa documentário. Um tipo explícito desconhecido retorna HTTP 400.

### Campos do projeto

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador do projeto. |
| `tipoProjeto` | string | Família: `documentario`, `animacao` ou `publicitario`. |
| `genero` | string | Gênero ou formato da produção. |
| `duracaoEstimada` | number | Duração estimada em minutos. |
| `orcamentoTotal` | number | Limite financeiro para o custo total da equipe. |
| `dataEntrega` | string | Data de entrega, preferencialmente `AAAA-MM-DD`. |
| `papeisObrigatorios` | array | Papéis e nível mínimo exigido para cada um. |

Cada item de `papeisObrigatorios` tem `papel` e `nivelObrigatorio`. Papéis aceitos: `diretor`, `diretorDeFotografia`, `sonoplasta`, `editor`, `roteirista` e `especialistaEmEfeitosVisuais`.

### Campos de cada profissional

| Campo | Tipo | Descrição |
|---|---|---|
| `id`, `nome` | string | Identificador e nome. |
| `especialidades` | array de papéis | Funções que o profissional pode desempenhar. |
| `competencias` | array | Itens `{ "nome": "diretor", "nivel": 4 }`. |
| `valorMedio` | number | Valor médio do profissional, contabilizado no orçamento total da equipe. |
| `disponibilidadeTempo` | number | Disponibilidade; deve ser maior que zero. |
| `avaliacoes` | array de numbers | Notas históricas, normalmente de 0 a 5. |

O sistema soma `valorMedio` dos profissionais distintos selecionados e só mantém recomendações enquanto o custo total não ultrapassar `projeto.orcamentoTotal`. Não existe limite percentual individual; a restrição é sobre o orçamento total do elenco.

### Exemplo completo: documentário

```json
{
  "tipoProjeto": "documentario",
  "projeto": {
    "id": "doc-001",
    "genero": "documentário",
    "duracaoEstimada": 50,
    "orcamentoTotal": 80000,
    "dataEntrega": "2027-10-30",
    "papeisObrigatorios": [
      { "papel": "diretor", "nivelObrigatorio": 4 },
      { "papel": "diretorDeFotografia", "nivelObrigatorio": 3 },
      { "papel": "sonoplasta", "nivelObrigatorio": 3 },
      { "papel": "editor", "nivelObrigatorio": 3 }
    ]
  },
  "profissionais": [
    {
      "id": "prof-01",
      "nome": "Marina Costa",
      "especialidades": ["diretor", "editor"],
      "competencias": [
        { "nome": "diretor", "nivel": 5 },
        { "nome": "editor", "nivel": 4 }
      ],
      "valorMedio": 12000,
      "disponibilidadeTempo": 4,
      "avaliacoes": [5, 4, 5]
    },
    {
      "id": "prof-02",
      "nome": "Rafael Nunes",
      "especialidades": ["diretorDeFotografia", "sonoplasta"],
      "competencias": [
        { "nome": "diretorDeFotografia", "nivel": 4 },
        { "nome": "sonoplasta", "nivel": 4 }
      ],
      "valorMedio": 10000,
      "disponibilidadeTempo": 3,
      "avaliacoes": [4, 5, 4]
    },
    {
      "id": "prof-03",
      "nome": "Carla Mendes",
      "especialidades": ["especialistaEmEfeitosVisuais"],
      "competencias": [
        { "nome": "especialistaEmEfeitosVisuais", "nivel": 5 }
      ],
      "valorMedio": 9000,
      "disponibilidadeTempo": 4,
      "avaliacoes": [5, 5, 4]
    }
  ]
}
```

O exemplo inclui profissionais para cobrir os papéis do documentário. A fábrica também pode preencher dados do projeto omitidos a partir do protótipo da família.

### Exemplo de projeto de animação

Envie este objeto no campo `projeto`. Se `profissionais` for omitido, a API usa os profissionais de demonstração, que cobrem os papéis padrão da animação.

```json
{
  "tipoProjeto": "animacao",
  "projeto": {
    "id": "ani-001",
    "genero": "animação",
    "duracaoEstimada": 80,
    "orcamentoTotal": 150000,
    "dataEntrega": "2027-12-15",
    "papeisObrigatorios": [
      { "papel": "diretor", "nivelObrigatorio": 4 },
      { "papel": "editor", "nivelObrigatorio": 4 },
      { "papel": "especialistaEmEfeitosVisuais", "nivelObrigatorio": 4 },
      { "papel": "sonoplasta", "nivelObrigatorio": 3 }
    ]
  }
}
```

Se enviar profissionais próprios, use o formato do exemplo completo. A família padrão de animação usa cosseno e o notifier interno.

### Exemplo de projeto publicitário

```json
{
  "tipoProjeto": "publicitario",
  "projeto": {
    "id": "pub-001",
    "genero": "publicidade",
    "duracaoEstimada": 1,
    "orcamentoTotal": 30000,
    "dataEntrega": "2027-05-20",
    "papeisObrigatorios": [
      { "papel": "diretor", "nivelObrigatorio": 4 },
      { "papel": "diretorDeFotografia", "nivelObrigatorio": 3 },
      { "papel": "editor", "nivelObrigatorio": 3 }
    ]
  }
}
```

Se `profissionais` for omitido, a API usa os profissionais de demonstração. Se enviar profissionais próprios, use o formato do exemplo completo. A família publicitária usa regras de negócio e o notifier de auditoria.

Sem projeto ou profissionais no corpo, a API usa o protótipo e os profissionais de demonstração. O protótipo é clonado profundamente, incluindo os objetos de `papeisObrigatorios`.

### Produtos selecionados por fábrica

| Tipo | Protótipo de projeto | Recomendador padrão | Notificador |
|---|---|---|---|
| `documentario` | `ProjetoDocumentario` | Filtragem colaborativa | `NotificadorEmail` |
| `animacao` | `ProjetoAnimacao` | Similaridade por cosseno | `NotificacaoInterno` |
| `publicitario` | `ProjetoPublicitario` | Regras de negócio | `AuditoriaRecomendacao` |

Os notifiers demonstram o Observer e guardam a última mensagem em memória; não enviam e-mails reais nem publicam em um broker nesta atividade.

Os papéis iniciais por protótipo são: documentário (`diretor`, `diretorDeFotografia`, `sonoplasta`, `editor`); animação (`diretor`, `editor`, `especialistaEmEfeitosVisuais`, `sonoplasta`); publicitário (`diretor`, `diretorDeFotografia`, `editor`). Os níveis podem ser alterados no `papeisObrigatorios` enviado pelo produtor.

O campo `estrategia` pode ser enviado para substituir o recomendador padrão da família: `cosseno`, `filtragem-colaborativa` ou `regras-de-negocio`.

### Como adicionar um novo tipo de projeto

Para adicionar, por exemplo, um tipo `videoclipe`, sem alterar o orquestrador:

1. Adicione `videoclipe` a `TipoProjeto` em `src/types.ts`.
2. Crie uma classe de projeto em `src/prototypes.ts`, com seus papéis e dados padrão, herdando de `ProjetoPrototype`.
3. Crie uma fábrica em `src/factories.ts` que forneça o protótipo, validador, recomendador e notificador do tipo.
4. Registre a fábrica no mapa `projectFactoryCreators`.
5. Adicione testes de clonagem, produtos da fábrica e requisição HTTP para o novo tipo.

O `EquipeOrquestrador` continuará usando o contrato `FabricaProjeto`; somente o novo conjunto de produtos e seu registro precisam ser adicionados.




