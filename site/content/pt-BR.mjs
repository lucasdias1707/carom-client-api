/* Português (BR). Segue o glossário do app: requisição, cabeçalho, ambiente, workspace. */
export default {
  locale: 'pt-BR',
  htmlLang: 'pt-BR',

  meta: {
    home: {
      title: 'Carom — um cliente HTTP rápido, feito para o teclado, no desktop',
      description:
        'Componha, organize e envie requisições HTTP. Variáveis com escopo por pasta e ambiente, dados de teste gerados, scripts, e requisições que saem direto da sua máquina — sem CORS, sem conta na nuvem.',
    },
    guide: {
      title: 'Guia — como usar o Carom, atalhos e variáveis',
      description:
        'Como usar o Carom: requisições, variáveis e ambientes, dados gerados, scripts, importar do Postman, compartilhar um workspace numa pasta e todos os atalhos de teclado.',
    },
  },

  ui: {
    nav: {
      label: 'Principal',
      skip: 'Ir para o conteúdo',
      features: 'Recursos',
      tour: 'Tour',
      download: 'Baixar',
      guide: 'Guia',
      home: 'Visão geral',
      language: 'Idioma',
      theme: 'Alternar entre escuro e claro',
    },
    footer: {
      tagline: 'Um cliente HTTP para o desktop.',
      label: 'Rodapé',
      releases: 'Versões',
      issues: 'Relatar um problema',
      license: 'Licença',
    },
  },

  home: {
    hero: {
      eyebrow: 'Cliente HTTP para desktop',
      title: 'Envie requisições.',
      accent: 'Sem quebrar o ritmo.',
      lead: 'O Carom é um cliente desktop para compor, organizar e enviar requisições HTTP. **Pensado para o teclado**, com variáveis com escopo por pasta e ambiente, e respostas fáceis de ler.',
      download: 'Baixar o Carom',
      guide: 'Ler o guia',
      note: 'macOS, Windows e Linux · se atualiza sozinho onde o sistema permite',
      shotAlt:
        'A janela do Carom: a árvore do workspace à esquerda, uma requisição GET com seus cabeçalhos no meio e a resposta JSON formatada à direita.',
    },

    pillars: {
      title: 'Tudo o que uma requisição precisa, e nada além',
      lead: 'As peças que você usa o dia todo, à mão e coerentes entre si.',
      items: [
        {
          icon: 'keyboard',
          title: 'Feito para o teclado',
          text: 'Busque tudo com [[Mod+K]], vá a uma requisição com [[Mod+P]], envie com [[Mod+Enter]]. Todo atalho pode ser remapeado.',
        },
        {
          icon: 'layers',
          title: 'Variáveis com escopo',
          text: 'Escreva `{{baseUrl}}` uma vez. Uma pasta pode sobrepor o ambiente ativo, que pode sobrepor o base — e ao passar o mouse você vê qual venceu.',
        },
        {
          icon: 'sparkles',
          title: 'Dados de teste gerados',
          text: '67 geradores como `{{$randomFullName}}` e `{{$randomEmail}}`, com os nomes do Postman. Cada ocorrência recebe seu próprio valor, no idioma que você escolher.',
        },
        {
          icon: 'code',
          title: 'Scripts',
          text: 'Scripts de pré-requisição e pós-resposta numa requisição ou numa pasta inteira. Guarde um token de uma resposta e use na próxima requisição.',
        },
        {
          icon: 'swap',
          title: 'Traga o que você já tem',
          text: 'Importe do Postman, Insomnia, OpenAPI, HAR ou de um comando curl. Exporte para Carom ou OpenAPI 3.1, ou copie qualquer requisição como curl.',
        },
        {
          icon: 'palette',
          title: 'Com a sua cara',
          text: 'Cinco paletas prontas e as suas próprias cores, escuro ou claro, em English, Português ou Español.',
        },
      ],
    },

    tour: {
      title: 'Um olhar de perto',
      lead: 'Capturas reais do app, enviando requisições para uma API inventada.',
      caption: 'As capturas mostram um workspace montado para a demonstração. A interface é a real; a API e os dados são inventados.',
      items: [
        {
          shot: 'environments',
          icon: 'layers',
          kicker: 'Ambientes',
          title: 'Troque de contexto sem sair da requisição',
          text: 'Aperte [[Mod+E]] e uma gaveta desliza ao lado do seu trabalho. Staging, produção, a sua máquina — cada um com sua cor, para você saber sempre para onde a requisição está indo.',
          bullets: [
            'Edite os valores ali mesmo e veja o efeito na hora',
            'Variáveis da pasta e do ambiente ativo lado a lado',
            'Selecione um texto em qualquer campo, clique com o botão direito e transforme em variável',
          ],
          alt: 'A gaveta de ambientes aberta ao lado da requisição, listando Base, Staging e Produção com suas variáveis.',
        },
        {
          shot: 'palette',
          icon: 'keyboard',
          kicker: 'Paleta de comandos',
          title: 'Encontre qualquer coisa, execute qualquer coisa',
          text: 'Uma paleta para requisições, workspaces e comandos. Digite algumas letras do nome, ou vá direto a uma lista: [[Mod+P]] para requisições, [[Mod+R]] para workspaces, [[Mod+Shift+P]] para comandos.',
          bullets: [
            'Cada resultado mostra o atalho que ele também tem',
            'As abas abertas também são pesquisáveis, com [[Mod+Shift+E]]',
            'Troque de workspace sem encostar no mouse',
          ],
          alt: 'A paleta de comandos aberta sobre a área de trabalho, filtrando requisições enquanto você digita.',
        },
        {
          shot: 'generated',
          icon: 'sparkles',
          kicker: 'Dados gerados',
          title: 'Dados falsos com cara de usuário de verdade',
          text: 'Coloque `{{$randomFullName}}` num corpo e uma pessoa nova é inventada a cada envio. Passe o mouse numa variável para ver o que ela é, pedir outro exemplo ou defini-la.',
          bullets: [
            'Nomes, cidades, ruas e telefones seguem o idioma da interface',
            'Fixe o idioma dos dados gerados separadamente nas Configurações',
            'Um erro de digitação continua vermelho, e você percebe antes do servidor',
          ],
          alt: 'Um corpo JSON com variáveis geradas, um popover explicando uma delas e a resposta mostrando os valores que foram enviados.',
        },
        {
          shot: 'light',
          icon: 'palette',
          kicker: 'Temas',
          title: 'Escuro quando você quer, claro quando precisa',
          text: 'Escolha uma paleta, ajuste as cores, mude o tamanho do texto. As cores da sintaxe JSON também são suas.',
          bullets: ['Carom, Midnight, Ember, Forest e Paper', 'Mude qualquer cor e guarde como sua própria paleta', 'Fontes para a interface e para o código, com tamanho'],
          alt: 'O mesmo workspace no tema claro.',
        },
      ],
    },

    native: {
      title: 'As requisições saem da sua máquina',
      lead: 'O app desktop envia as requisições de forma nativa, como o curl — não por um navegador, e não pelo servidor de ninguém.',
      points: [
        { title: 'Sem CORS', text: 'O navegador decide quais APIs uma página pode chamar. Um cliente nativo não tem essa regra, então a API que você está construindo responde como responderia a qualquer cliente.' },
        { title: 'localhost e a sua rede', text: 'Alcance `localhost`, endereços da sua rede e serviços internos diretamente — o que um cliente na web nunca enxerga.' },
        { title: 'Sem conta, sem sincronização', text: 'Nada para entrar. Seus workspaces ficam na sua máquina, e vão para uma pasta de sua escolha quando você quiser compartilhá-los.' },
      ],
    },

    formats: {
      title: 'Chegue como está, saia como quiser',
      lead: 'Mudar para o Carom não deveria significar recomeçar, e sair não deveria significar reescrever.',
      importTitle: 'Importar',
      importItems: ['Carom', 'Coleções e ambientes do Postman', 'Insomnia (v4 e v5)', 'OpenAPI / Swagger', 'HAR', 'Comandos curl'],
      exportTitle: 'Exportar',
      exportItems: ['Workspace, pasta ou requisição do Carom', 'OpenAPI 3.1', 'curl (copiar)'],
      note: 'Escolha o que trazer e para onde vai — ambientes inclusive. As variáveis geradas mantêm os nomes do Postman, então coleções que as usavam continuam funcionando.',
    },

    shared: {
      title: 'Compartilhe um workspace pelo git, sem conflitos',
      text: 'No desktop, um workspace pode viver numa pasta do seu projeto. A pasta é o registro: abra o workspace e ele a lê, mude algo e ela é atualizada.',
      points: [
        '**Uma requisição por arquivo**: duas pessoas que adicionam requisições diferentes mexem em arquivos diferentes, e o git junta tudo sozinho.',
        'Os **nomes** das variáveis viajam com o projeto; os **valores** só onde você mandar, e tudo o que parece credencial começa desligado.',
        'Respostas, edições não salvas e versões salvas ficam na sua máquina.',
        'Se a pasta mudar por baixo do app — um `git pull`, por exemplo — ele para e avisa, em vez de sobrescrever.',
      ],
    },

    privacy: {
      title: 'Seu, e continua sendo',
      text: 'O Carom roda no seu computador. Foi feito para que o que você envia e o que recebe fique entre você e a API.',
      points: [
        'Sem conta, e sem análise de uso nem telemetria no app.',
        'A única requisição que o Carom faz por conta própria é consultar o GitHub por uma versão nova — e dá para desligar nas Configurações.',
        'Os scripts não rodam em sandbox. Eles alcançam o que o app alcança, então trate scripts de uma coleção importada como código de quem os escreveu.',
      ],
    },

    download: {
      title: 'Baixar o Carom',
      lead: 'Escolha o seu sistema. Os botões levam à última versão; se o navegador bloquear o link direto, a página de Versões tem todos os arquivos.',
      note: 'Procurando outra coisa?',
      releases: 'Todos os instaladores estão na página de Versões.',
      platforms: {
        mac: { name: 'macOS', detail: 'Apple Silicon (M1 em diante) ou Intel. Arraste o Carom para **Aplicativos** e veja a nota de primeiro uso abaixo.' },
        win: { name: 'Windows', detail: 'O instalador `.exe` é o mais simples. Há também um `.msi` para instalações gerenciadas.' },
        linux: { name: 'Linux', detail: '`.deb` para Debian e Ubuntu, `.rpm` para Fedora e RHEL, `.AppImage` para o resto.' },
      },
      firstRun: {
        title: 'Na primeira vez que abrir',
        lead: 'O Carom ainda não é assinado com um certificado de desenvolvedor pago, então o macOS e o Windows pedem uma confirmação, uma única vez. Isso é esperado e não indica problema no download.',
        items: [
          {
            id: 'mac',
            title: 'macOS: “A Apple não pôde verificar se o item Carom está livre de malware”',
            text: 'Depois de arrastar o Carom para **Aplicativos**, remova o atributo de quarentena que o navegador colocou — uma linha no Terminal:',
            command: 'xattr -cr /Applications/Carom.app',
            after: 'Prefere sem Terminal? Dê duplo clique no Carom e clique em **OK**, abra **Ajustes do Sistema → Privacidade e Segurança**, role até o fim, escolha **Abrir Mesmo Assim** e confirme. É só uma vez.',
          },
          {
            id: 'win',
            title: 'Windows: “O Windows protegeu seu PC”',
            text: 'O SmartScreen mostra isso para instaladores sem certificado de assinatura de código. Escolha **Mais informações → Executar assim mesmo**.',
          },
          {
            id: 'linux',
            title: 'Linux: AppImage e dependências',
            text: 'O `.deb` e o `.rpm` instalam pelo gerenciador de pacotes. O AppImage precisa ser marcado como executável antes:',
            command: 'chmod +x Carom_*_amd64.AppImage\n./Carom_*_amd64.AppImage',
            after: 'Bibliotecas de sistema necessárias: `libwebkit2gtk-4.1-0` e `libgtk-3-0` (os pacotes já declaram; o AppImage não).',
          },
        ],
      },
      updates: {
        title: 'Atualizações',
        text: 'As versões para macOS, Windows e AppImage se atualizam sozinhas de dentro do app. O `.deb` e o `.rpm` pertencem ao gerenciador de pacotes, então o Carom leva você à página da versão.',
      },
    },

    faq: {
      title: 'Perguntas',
      items: [
        { q: 'O Carom é gratuito?', a: 'Sim, é gratuito para usar, por enquanto. O código é público para qualquer pessoa ler e auditar, mas o Carom não é open source: ler o código não dá direito de copiar, modificar ou redistribuir. Os termos podem mudar em versões futuras; uma versão que você já tem mantém os termos com que foi lançada. Leia a [licença](https://github.com/lucasdias1707/carom-client-api/blob/main/LICENSE).' },
        { q: 'Existe versão web?', a: 'Existe uma versão para navegador, mas um navegador não faz o que um cliente precisa: o CORS limita quais APIs ele chama e uma página nunca alcança `localhost` nem a sua rede. O app desktop é a forma recomendada de usar o Carom.' },
        { q: 'Funciona com coleções do Postman?', a: 'Sim. Importe coleções e ambientes do Postman escolhendo o que trazer e para onde. Scripts escritos com `pm.*` continuam rodando, e os nomes das variáveis geradas são os do Postman.' },
        { q: 'Dá para exportar para o Postman?', a: 'Não diretamente. Você pode exportar no formato do próprio Carom ou em OpenAPI 3.1, e copiar qualquer requisição como curl.' },
        { q: 'Onde ficam os meus dados?', a: 'Na sua máquina. Um workspace também pode ficar numa pasta que você escolher — dentro de um repositório git, por exemplo — para compartilhar com um time.' },
        { q: 'Ele coleta alguma coisa?', a: 'Sem análise de uso nem telemetria. A única coisa que faz sozinho é consultar o GitHub por uma versão nova, o que dá para desligar nas Configurações.' },
        { q: 'Em quais idiomas ele fala?', a: 'English, Português (BR) e Español. Na primeira vez ele segue o idioma do sistema, e você troca nas Configurações.' },
        { q: 'Por que o sistema me avisa quando abro?', a: 'O Carom não é assinado com um certificado de desenvolvedor pago. O aviso é o sistema dizendo que não pode garantir quem publica; os passos acima resolvem de uma vez.' },
      ],
    },

    final: {
      title: 'Pronto para enviar a sua primeira requisição?',
      text: 'Baixe, e o guia leva você de um workspace vazio a um compartilhado.',
    },
  },

  guide: {
    eyebrow: 'Guia',
    title: 'Como usar o Carom',
    lead: 'Da primeira requisição às variáveis, scripts, compartilhamento e todos os atalhos de teclado. Curto, e na ordem em que você vai precisar.',
    tocTitle: 'Nesta página',
    osLabel: 'Mostrar teclas para',
    noteLabels: { tip: 'Dica', warn: 'Cuidado', info: 'Bom saber' },
    shortcutsHead: ['Ação', 'Atalho'],
    generatorsFilter: 'Filtrar variáveis geradas',
    generatorsNone: 'Nada corresponde a isso.',

    sections: [
      {
        id: 'start',
        title: 'Sua primeira requisição',
        lead: 'Dez segundos entre abrir o app e ter uma resposta.',
        blocks: [
          {
            ol: [
              'Aperte [[Mod+N]] para uma nova requisição — ou use o **+** na faixa de abas.',
              'Escolha o método e digite a URL. `{{baseUrl}}/pokemon/pikachu` funciona depois que você definir `baseUrl` (veja [Variáveis](#variables)).',
              'Aperte [[Mod+Enter]] — ou **Enter** com o cursor no campo da URL — para enviar.',
              'A resposta aparece à direita: status, tempo, tamanho e o corpo formatado.',
            ],
          },
          { note: 'As edições ficam como rascunho até você apertar [[Mod+S]]. A barra da URL mostra o que não foi salvo e permite descartar. Cada salvamento também guarda uma versão — as últimas 20 — que você restaura na aba Versões.', kind: 'tip' },
        ],
      },
      {
        id: 'organise',
        title: 'Workspaces, pastas e abas',
        blocks: [
          { p: 'Um **workspace** reúne pastas, requisições e ambientes. Alterne entre eles com [[Mod+R]] ou pelo menu no topo da barra lateral.' },
          {
            ul: [
              'As **pastas** agrupam requisições, podem ser aninhadas e podem ter suas próprias variáveis, autenticação e scripts, que valem para tudo dentro delas.',
              '**Arraste e solte** para reordenar ou mover uma requisição para uma pasta. Arrastar fica desligado enquanto há um filtro ativo, para nada cair no lugar errado.',
              '**Filtre** a árvore na caixa acima dela, ou vá direto a uma requisição com [[Mod+P]].',
              'Clique com o botão direito numa **aba** para localizá-la na árvore, fechá-la, fechar as outras ou fechar todas. [[Mod+W]] fecha a aba ativa; [[Mod+Shift+E]] busca entre as abertas.',
              '[[Mod+B]] esconde e mostra a barra lateral.',
            ],
          },
        ],
      },
      {
        id: 'request',
        title: 'Montando uma requisição',
        blocks: [
          { p: 'Cada requisição tem um conjunto de abas abaixo da barra da URL:' },
          {
            table: {
              head: ['Aba', 'Para que serve'],
              rows: [
                ['Parâmetros', 'Parâmetros de consulta. Editar uma linha reescreve a URL, e editar a URL atualiza as linhas.'],
                ['Corpo', 'Nenhum, JSON, texto, XML, formulário, multipart ou GraphQL. JSON e XML têm formatador.'],
                ['Cabeçalhos', 'Um `Content-Type` compatível com o tipo do corpo é adicionado automaticamente, a menos que você defina um.'],
                ['Autenticação', 'Herdar da pasta, nenhuma, token bearer, basic ou uma chave de API em um cabeçalho ou na consulta.'],
                ['Scripts', 'Scripts de pré-requisição e pós-resposta — veja [Scripts](#scripts).'],
                ['Documentação', 'Documente os campos de uma requisição — nome, exemplo, descrição, obrigatório. Eles vão para uma exportação OpenAPI.'],
                ['Versões', 'As últimas 20 versões salvas desta requisição, cada uma restaurável.'],
              ],
            },
          },
          { p: 'Defina a autenticação uma vez numa **pasta** e toda requisição dentro dela a herda; uma requisição ainda pode escolher a sua.' },
        ],
      },
      {
        id: 'variables',
        title: 'Variáveis e ambientes',
        lead: 'Escreva `{{nome}}` em qualquer lugar — URL, cabeçalhos, corpo, autenticação — e o Carom preenche na hora de enviar.',
        blocks: [
          { h3: 'De onde vem um valor', id: 'variables-scope' },
          {
            ol: [
              'A **pasta** em que a requisição está. Com pastas aninhadas, vence a mais interna.',
              'O **ambiente ativo**, escolhido no seletor no canto superior direito.',
              'O ambiente **base**, compartilhado por todos os outros.',
            ],
          },
          { p: 'Passe o mouse numa variável para ver o valor e qual dos três a forneceu. Uma variável que não está definida em lugar nenhum aparece em vermelho.' },
          { h3: 'Definir e alterar', id: 'variables-edit' },
          {
            ul: [
              '**Passe o mouse numa variável**, na URL ou dentro de um corpo, e edite ali mesmo — ou defina, se ela ainda não existir.',
              '**Selecione qualquer texto**, clique com o botão direito e escolha **Definir** uma variável existente ou **Nova variável…**. O valor vai para o ambiente selecionado, e o que você selecionou é trocado pela referência.',
              '[[Mod+E]] abre a **gaveta de ambientes**, um editor rápido ao lado da requisição que mostra o ambiente ativo e as variáveis da pasta. **Gerenciar ambientes**, no seletor, abre o diálogo completo para adicionar, renomear, colorir, copiar entre eles e excluir ambientes.',
            ],
          },
          { note: 'Dê cores diferentes ao staging e à produção. O seletor de ambiente usa essas cores, um jeito barato de não mandar a coisa errada para o lugar errado.', kind: 'tip' },
        ],
      },
      {
        id: 'generated',
        title: 'Dados gerados',
        lead: 'Variáveis inventadas na hora de enviar. Úteis para fixtures, formulários e volumes de dados com cara de verdade.',
        blocks: [
          { p: 'Escreva uma entre chaves — `{{$randomEmail}}` — e ela vira um valor novo a cada envio. **Cada ocorrência recebe o seu próprio valor**, então dois `{{$randomFullName}}` no mesmo corpo são duas pessoas diferentes. É isso que separa um gerador de uma variável.' },
          {
            ul: [
              'Os nomes são os do Postman, então uma coleção que os usava continua funcionando.',
              'Nomes, cidades, ruas e telefones seguem o **idioma da interface**. Identificadores, números e datas não têm idioma e nunca mudam.',
              'Para fixar o idioma de forma independente — uma API que valida endereços em inglês, lida por quem trabalha em português — defina **Dados gerados** em **Configurações → Geral**.',
              'Uma variável que você define com o mesmo nome vence o gerador.',
              'Um gerador com erro de digitação continua vermelho, que é o caso que vale notar.',
            ],
          },
          { generators: true },
          { note: 'No app, a mesma lista abre pela paleta de comandos ou pela tela de ambientes; clique numa linha para copiar pronto para colar.', kind: 'info' },
        ],
      },
      {
        id: 'scripts',
        title: 'Scripts',
        lead: 'JavaScript que roda antes de uma requisição ser enviada ou depois que a resposta chega.',
        blocks: [
          { p: 'Coloque um script numa **requisição** ou numa **pasta**. Os scripts de uma pasta envolvem cada requisição dentro dela: os de pré-requisição rodam da pasta mais externa para dentro, os de pós-resposta da mais interna para fora.' },
          {
            table: {
              head: ['Chamada', 'O que faz'],
              rows: [
                ['`carom.get(nome)`', 'Lê uma variável, inclusive as definidas antes na mesma sequência.'],
                ['`carom.set(nome, valor)`', 'Grava uma variável no ambiente ativo quando o script termina.'],
                ['`carom.header(chave, valor)`', 'Adiciona um cabeçalho à requisição enviada (só na pré-requisição).'],
                ['`carom.json()`', 'O corpo da resposta lido como JSON, ou `null` (pós-resposta).'],
                ['`carom.request` · `carom.response`', 'A requisição que está sendo enviada e a resposta que voltou.'],
                ['`console.log(…)`', 'Escrito na aba Console da resposta.'],
              ],
            },
          },
          { code: '// Script de pós-resposta: guarda o token para a próxima requisição\nconst body = carom.json();\nif (body && body.token) carom.set("token", body.token);' },
          { p: 'O objeto `pm` do Postman também funciona, `pm.test` inclusive, então scripts de uma coleção importada rodam sem alteração.' },
          { note: 'Os scripts não rodam em sandbox. Eles executam com tudo o que o app alcança, a rede inclusive. Trate um script que veio numa coleção importada como código de quem o escreveu.', kind: 'warn' },
        ],
      },
      {
        id: 'response',
        title: 'Lendo uma resposta',
        blocks: [
          {
            ul: [
              '**Formatado** recolhe e expande o JSON; **Bruto** é exatamente o que voltou; **Prévia** renderiza HTML.',
              '**Destacar no corpo** encontra um texto e marca todas as ocorrências.',
              '**Cabeçalhos**, **Cookies** e **Console** (saída dos scripts e resultados de `pm.test`) têm abas próprias.',
              '**Histórico** guarda as últimas 15 respostas de cada requisição. Clique numa para vê-la de novo.',
              'Copie a resposta, ou salve em arquivo, pelos botões acima do corpo.',
              'Quando chega uma resposta de uma requisição em outra aba, um aviso conta para você.',
            ],
          },
          { p: 'Para passar uma requisição a alguém como comando, use **Copiar como curl** ao lado da barra da URL. Ele sai com as suas variáveis já preenchidas — e com os valores gerados, se o corpo tiver. **Copiar URL** entrega a URL resolvida.' },
        ],
      },
      {
        id: 'import-export',
        title: 'Importar e exportar',
        blocks: [
          { h3: 'Importar', id: 'import' },
          { p: 'Use **Importar** no fim da barra lateral. O Carom lê exportações do Carom, coleções e ambientes do **Postman**, **Insomnia** v4 e v5, **OpenAPI / Swagger**, arquivos **HAR** e comandos **curl** colados. No Postman você escolhe o que trazer e para onde vai, ambientes inclusive. O que não vem junto — uma requisição gRPC do Insomnia, por exemplo — aparece listado antes de você confirmar.' },
          { h3: 'Exportar', id: 'export' },
          { p: 'Use **Exportar** para um workspace, uma pasta (com suas subpastas e requisições) ou uma única requisição, no formato do Carom ou em **OpenAPI 3.1**. Escolha o recorte — ambientes inclusive — e onde salvar.' },
          { note: 'Não há exportação para o Postman. O formato do Carom e o OpenAPI 3.1 são as saídas, além de copiar uma requisição como curl.', kind: 'info' },
        ],
      },
      {
        id: 'share',
        title: 'Compartilhando um workspace com o time',
        lead: 'Só no app desktop.',
        blocks: [
          { p: 'No menu do workspace escolha **Guardar este workspace numa pasta** e indique uma pasta do seu projeto. Uma pasta vazia recebe o workspace como ele está; uma pasta que já tem um substitui o workspace pelo que está nela.' },
          {
            ul: [
              'Uma requisição por arquivo: duas pessoas que adicionam requisições diferentes mudam arquivos diferentes, e o git junta sem perguntar.',
              'Pastas, requisições e ambientes vão para a pasta. Respostas, edições não salvas e versões salvas ficam na sua máquina.',
              'Os **nomes** das variáveis sempre viajam. Os **valores** só viajam onde você mandar — a tela seguinte pergunta, e tudo o que parece credencial começa desligado.',
              'As mudanças são gravadas um instante depois que você para de digitar, e só nos arquivos que mudaram.',
              'Se a pasta mudar por baixo — depois de um `git pull` com o app aberto — o Carom para de gravar e avisa. Recarregue do disco e siga em frente.',
            ],
          },
        ],
      },
      {
        id: 'shortcuts',
        title: 'Atalhos de teclado',
        lead: 'Os padrões. Todos podem ser alterados em **Configurações → Geral → Atalhos de teclado**.',
        blocks: [
          { shortcuts: true },
          { h3: 'Nos editores de código', id: 'editor-keys' },
          {
            table: {
              head: ['Tecla', 'O que faz'],
              rows: [
                ['[[Tab]] · [[Shift+Tab]]', 'Aumenta e diminui o recuo em dois espaços.'],
                ['Digitar `{` `[` ou `"`', 'Adiciona o de fechamento e deixa o cursor no meio. No XML, `<` também fecha.'],
                ['Selecionar e digitar um de abertura', 'Envolve a seleção em vez de substituí-la.'],
                ['Digitar um de fechamento', 'Passa por cima de um que já está lá.'],
                ['[[Backspace]] entre um par', 'Apaga os dois.'],
                ['[[Enter]] no campo da URL', 'Envia a requisição.'],
              ],
            },
          },
        ],
      },
      {
        id: 'customise',
        title: 'Temas, cores e idioma',
        blocks: [
          {
            ul: [
              '**Configurações → Geral**: o idioma da interface (English, Português, Español — segue o sistema até você escolher), o idioma dos dados gerados, layout dos painéis, tempo limite, redirecionamentos, se o app desktop pede respostas comprimidas aos servidores e **Atalhos de teclado**.',
              '**Configurações → Tema**: escuro ou claro, cinco paletas prontas (Carom, Midnight, Ember, Forest, Paper) e fontes com tamanho. Mude qualquer cor de uma paleta pronta e ela vira uma cópia sua; **Me surpreenda** sorteia uma nova.',
              'No desktop, **Configurações → Geral → Atualizações** verifica se há versão nova e deixa você escolher se o Carom verifica sozinho ao iniciar.',
            ],
          },
        ],
      },
      {
        id: 'help',
        title: 'Quando algo não está certo',
        blocks: [
          {
            table: {
              head: ['Sintoma', 'Por quê, e o que fazer'],
              rows: [
                ['O macOS diz que não consegue verificar o Carom', 'Esperado: o app não é assinado com certificado pago. Rode `xattr -cr /Applications/Carom.app` uma vez, ou use **Abrir Mesmo Assim** em Ajustes do Sistema → Privacidade e Segurança.'],
                ['O Windows diz que protegeu seu PC', 'É o SmartScreen, pelo mesmo motivo. **Mais informações → Executar assim mesmo**.'],
                ['Uma requisição falha na versão web mas não no app', 'O navegador impõe o CORS e não alcança `localhost`. O app desktop não tem nenhum dos dois limites.'],
                ['Uma variável aparece em vermelho', 'Ela não está definida na pasta, no ambiente ativo nem no base. Passe o mouse para defini-la, ou confira o seletor de ambiente.'],
                ['Instalei pelo `.deb` ou `.rpm` e não há botão de atualização', 'Esses pertencem ao seu gerenciador de pacotes. O Carom leva à página da versão.'],
                ['A pasta guardada diz que mudou no disco', 'Algo — em geral um `git pull` — a alterou. Recarregue do disco; o que você editou desde então é o que merece conferência.'],
              ],
            },
          },
          { p: 'Achou outra coisa? [Abra uma issue](https://github.com/lucasdias1707/carom-client-api/issues) contando o que fez, o que esperava e o que aconteceu.' },
        ],
      },
    ],
  },
};
