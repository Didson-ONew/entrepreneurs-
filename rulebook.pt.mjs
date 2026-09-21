/* ============================================================================
   ENTREPRENEURS - o manual, em portugues do Brasil.

   Traducao de rulebook.data.mjs, secao por secao, com a MESMA ESTRUTURA: os
   mesmos ids, os mesmos blocos na mesma ordem, as mesmas tabelas com as mesmas
   dimensoes. Isso nao e estilo, e o que permite checar as duas versoes uma
   contra a outra: check_rulebook_pt.mjs compara forma e numeros e falha se
   alguem mexer em um lado so.

   O ingles continua sendo a fonte das REGRAS. Quando uma regra muda, muda la,
   e esta traducao e refeita - nunca o contrario.

   Nomes proprios impressos nos componentes (cartas de Projeto, fichas de
   Megacorporacao) ficam em ingles de proposito: e o que esta na mesa.
   ========================================================================== */

export const EDITION_PT = "Manual v19";

export const RULEBOOK_PT = [
  {
    "id": "overview",
    "title": "O jogo em um minuto",
    "blocks": [
      {
        "p": "Você é um fundador construindo a economia de uma cidade. Você compra terrenos, ergue empresas neles e vende o que elas produzem aos distritos ao redor. Vence o jogador com mais Pontos de Empreendedorismo (EP) no fim do Ano 3."
      },
      {
        "ul": [
          "2 a 6 jogadores.",
          "3 anos de 4 trimestres - no máximo 12 rodadas. Uma segunda Megacorporação encerra antes.",
          "O tabuleiro tem 16 distritos de 4 lotes cada.",
          "Os quadrados coloridos dentro de um distrito são a demanda dele: o que ele vai comprar."
        ]
      },
      {
        "h": "A única ideia por trás de tudo"
      },
      {
        "p": "Toda empresa paga uma conta de fornecedores a cada trimestre, e esse dinheiro não desaparece - ele vai para os setores impressos como fornecedores no Projeto dela. Ou seja, o setor em que ninguém está construindo recolhe em silêncio o dinheiro de todos os outros, e o preço dele sobe enquanto os setores lotados afundam rumo a $2. Ler essa pressão é o jogo."
      },
      {
        "note": "A economia é um circuito fechado de propósito. O banco paga pelo que os ícones de demanda levam e $1 por unidade reciclada, e empresta $20 por disco, e são essas todas as torneiras que existem - então uma mesa em que todos constroem a mesma coisa de fato empobrece a si mesma. Toda partida de teste que pareceu sem graça era uma mesa que ainda não tinha percebido isso."
      }
    ]
  },
  {
    "id": "setup",
    "title": "Preparação",
    "blocks": [
      {
        "p": "O tabuleiro é montado do zero a cada partida: os quatro distritos centrais são um Centro Financeiro, uma Área Industrial, um Centro Cívico e um Marco, embaralhados entre as quatro células do meio, e doze dos dezesseis distritos de subúrbio são sorteados ao acaso para o anel ao redor deles. Não há duas partidas com o mesmo mapa."
      },
      {
        "h": "Assentos, capital e mão inicial"
      },
      {
        "p": "Os assentos são sorteados - você não é automaticamente o primeiro. Seu dinheiro inicial e seu número de Projetos seguem o assento que você tirou, não o jogador que você é: assentos posteriores recebem menos dinheiro, mas mais cartas. A tabela se lê como dinheiro / Projetos."
      },
      {
        "table": {
          "head": [
            "Jogadores",
            "Assento 1",
            "Assento 2",
            "Assento 3",
            "Assento 4",
            "Assento 5",
            "Assento 6"
          ],
          "rows": [
            [
              "6",
              "$25 / 1",
              "$22 / 2",
              "$22 / 2",
              "$19 / 3",
              "$19 / 3",
              "$16 / 4"
            ],
            [
              "5",
              "$25 / 1",
              "$22 / 2",
              "$22 / 2",
              "$19 / 3",
              "$16 / 4",
              "-"
            ],
            [
              "4",
              "$25 / 1",
              "$22 / 2",
              "$22 / 2",
              "$19 / 3",
              "-",
              "-"
            ],
            [
              "3",
              "$25 / 1",
              "$22 / 2",
              "$19 / 3",
              "-",
              "-",
              "-"
            ],
            [
              "2",
              "$20 / 2",
              "$20 / 2",
              "-",
              "-",
              "-",
              "-"
            ]
          ]
        }
      },
      {
        "h": "O draft"
      },
      {
        "p": "Cada baralho de setor é embaralhado inteiro, então qualquer nível pode estar no topo - um nível 3 pode estar lá já na primeira escolha. A carta do topo de cada baralho fica pública a partida inteira."
      },
      {
        "p": "Os Projetos iniciais são draftados na ordem inversa dos assentos - o ÚLTIMO assento escolhe primeiro. Na sua escolha, você pega a carta do topo, virada para cima, de qualquer baralho de setor. Preste atenção no que os outros estão pegando: toda carta draftada é uma empresa que provavelmente será construída, o que empurra o preço daquele setor para baixo e o preço dos fornecedores dele para cima antes mesmo de você ter começado."
      },
      {
        "note": "Embaralhar os baralhos inteiros é o que coloca uma empresa grande ao alcance logo cedo, para um jogador disposto a pegar o empréstimo ou a vender pesado para bancá-la. Também significa que o draft não pode ser planejado de antemão: o que está no topo é sorte; o que você faz a respeito não é."
      },
      {
        "h": "O resto"
      },
      {
        "ul": [
          "Doze discos para cada jogador. Nada mais marca o que é seu.",
          "Fichas de Megacorporação: existem dezesseis, em quatro patamares de quatro. Duas são sorteadas de cada patamar em jogo - três com cinco jogadores, todas as quatro com seis. Os patamares 4 e 3 estão sempre em jogo; o patamar 2 entra com três jogadores, e o patamar 1 só com quatro.",
          "As personas são distribuídas a todos por padrão - uma para cada, sorteadas entre seis. Deixe-as de fora na primeira partida, se preferir."
        ]
      },
      {
        "note": "O draft em ordem inversa é o único mecanismo de recuperação do jogo, e é pequeno de propósito. O assento 4 em uma partida de quatro jogadores abre com $19 e três cartas contra os $25 e uma carta do assento 1 - o bastante para pesar nos dois primeiros trimestres, não o bastante para decidir uma partida. Uma carta a mais custa exatamente $3, e assentos com o mesmo número de cartas ficam com o mesmo dinheiro. Não era assim que a tabela se lia antes: ela pagava $25/1, $25/2, $20/2, $20/3, o que dava ao terceiro assento as cartas do segundo assento por $5 a menos E o dinheiro do quarto assento com uma carta a menos - estritamente a pior cadeira da mesa, sem nada oferecido em troca. Medido ao longo de 500 partidas de quatro jogadores, isso mal importou (os assentos ficaram em 20.8 / 28.6 / 23.8 / 26.8 por cento, e trocar o dinheiro do segundo e do terceiro assento não trocou os resultados deles, então os $5 nunca foram o que os movia). Está corrigido porque o jogador consegue VER isso, não porque estivesse lhe custando partidas."
      }
    ]
  },
  {
    "id": "discs",
    "title": "Seus doze discos",
    "blocks": [
      {
        "p": "Seus discos são toda a sua presença no mundo. Você tem doze, e cada um deles está comprometido em algum lugar:"
      },
      {
        "ul": [
          "um disco em cada lote de terreno que você possui,",
          "um disco em cada empresa ativa que você opera,",
          "um disco no banco para cada empréstimo que você não quitou."
        ]
      },
      {
        "p": "Se você não tem nenhum disco livre, não pode comprar terreno, fundar uma empresa, assumir uma estrutura em dificuldade nem pegar um empréstimo - por mais dinheiro que esteja segurando. Você libera um disco vendendo um lote, vendendo uma empresa ou quitando um empréstimo."
      },
      {
        "p": "À parte disso, você tem cinco espaços de empresa. Toda empresa ativa ocupa um, e toda sede de Megacorporação que você tenha formado também - uma sede não opera mais, mas continua de pé no tabuleiro e continua segurando seu disco."
      },
      {
        "note": "O limite de discos é o freio de verdade do jogo, não o dinheiro. O dinheiro chega em enxurradas assim que seus fundos começam a pagar, e sem um teto rígido de presença o líder simplesmente compraria o mapa. Doze discos também fazem de vender terreno uma decisão de verdade, e não uma perda pura. Eram dez até a contagem ser medida: dez recusavam cerca de um quarto das tentativas de crescer de toda empresa horizontal por falta de disco, o que explica a maior parte do motivo de Manufatura, Serviços Públicos e Tecnologia passarem partidas inteiras no nível 1. Doze levam isso a 18%. Quinze foi testado e comprou, na maior parte, espalhamento de terrenos."
      }
    ]
  },
  {
    "id": "quarter",
    "title": "Um trimestre, passo a passo",
    "blocks": [
      {
        "p": "Todos os doze trimestres seguem as mesmas cinco fases. Planejamento e Ação são onde você age; as fases seguintes se resolvem ao seu redor e só param quando há uma escolha a fazer - onde entregar, o que vender incompleto, onde vai o Centro Logístico, se quita ou não um empréstimo."
      },
      {
        "table": {
          "head": [
            "Fase",
            "O que acontece"
          ],
          "rows": [
            [
              "1. Planejamento",
              "Todos colocam seus trabalhadores nas trilhas de ação."
            ],
            [
              "2. Ação",
              "As trilhas se resolvem e cada trabalhador executa suas ações."
            ],
            [
              "3. Produção",
              "Toda empresa ativa paga sua conta de fornecedores aos fundos dos setores e seu aluguel do terreno aos proprietários dos lotes em que está."
            ],
            [
              "4. Receita",
              "Você entrega produção aos ícones de demanda em troca de dinheiro; depois, os fundos dos setores são repartidos."
            ],
            [
              "5. Encerramento",
              "Um novo Centro Logístico abre. No fim de cada ano, os dois prêmios de terras são pagos."
            ]
          ]
        }
      }
    ]
  },
  {
    "id": "planning",
    "title": "Planejamento: colocando trabalhadores",
    "blocks": [
      {
        "p": "Você tem dois trabalhadores (três para cada um em uma partida de dois jogadores). Os jogadores colocam um trabalhador por vez, na ordem de turno, dando voltas até que todos tenham colocado todos os seus."
      },
      {
        "h": "As quatro trilhas"
      },
      {
        "table": {
          "head": [
            "Trilha",
            "Espaços",
            "O que faz"
          ],
          "rows": [
            [
              "Captar Recursos",
              "4 / 5 / 6",
              "Transforme bens em dinheiro - EMPRÉSTIMO ou VENDER."
            ],
            [
              "M&A",
              "4 / 5 / 6",
              "Amplie sua presença - FUNDAR ou COMPRAR."
            ],
            [
              "P&D",
              "4 / 5 / 6",
              "Melhore o que você tem - PESQUISAR ou EXPANDIR."
            ],
            [
              "Reunião do Conselho",
              "2",
              "ABRIR CAPITAL ou REPOSICIONAR. Consome todos os seus trabalhadores."
            ]
          ]
        }
      },
      {
        "p": "As três trilhas de trabalho têm quatro espaços com dois, três ou quatro jogadores. Um quinto jogador abre um quinto espaço em cada uma delas, e um sexto jogador, um sexto. A Reunião do Conselho fica em dois assentos, não importa quantos estejam jogando - ela deve mesmo ser escassa."
      },
      {
        "p": "O segundo assento da Reunião do Conselho fica selado sob a ficha de IPO até que alguém o reivindique abrindo capital."
      },
      {
        "h": "Último a entrar, primeiro a sair - a regra que pega todo mundo"
      },
      {
        "p": "Os trabalhadores preenchem uma trilha da esquerda para a direita, mas a trilha se resolve da DIREITA PARA A ESQUERDA. Quem colocou por ÚLTIMO em uma trilha age PRIMEIRO nela."
      },
      {
        "p": "Comprometer-se cedo é pago em ações: seu trabalhador executa uma ação, mais uma extra para cada trabalhador que pousar depois dele na mesma trilha. Um trabalhador sozinho em uma trilha que depois lota por completo executa tantas ações quantos forem os espaços da trilha - mas todos os que pousaram depois dele terão agido primeiro, e podem ter levado exatamente o que ele estava esperando."
      },
      {
        "p": "As trilhas em si se resolvem em uma ordem fixa: Captar Recursos, depois M&A, depois P&D, depois Reunião do Conselho."
      },
      {
        "h": "Reunião do Conselho"
      },
      {
        "p": "Ir à Reunião do Conselho custa TODOS os seus trabalhadores do trimestre e compra uma única ação. É um sacrifício de verdade, e é para ser mesmo."
      },
      {
        "note": "A colocação de trabalhadores no esquema primeiro a entrar, último a sair é a espinha dorsal do jogo. É o único mecanismo que faz a ordem de turno importar continuamente, e não uma vez por rodada, e é por isso que Reposicionar vale dois trabalhadores para um jogador sentado no fim da ordem."
      }
    ]
  },
  {
    "id": "actions",
    "title": "As ações",
    "blocks": [
      {
        "h": "Captar Recursos"
      },
      {
        "ul": [
          "EMPRÉSTIMO - pegue $20 do banco e empenhe um disco. Você pode comprar o disco de volta em um fim de ano; se nunca fizer isso, ele custa 5 EP no fim do jogo.",
          "VENDER - um Projeto da sua mão ($4 / $8 / $12 conforme o nível), uma empresa (metade do custo inicial, ou o custo cheio se ela tiver sido expandida - o prédio vai para o banco como Ativo em Dificuldade), ou um lote pelo seu valor atual."
        ]
      },
      {
        "h": "M&A"
      },
      {
        "ul": [
          "FUNDAR - construa um Projeto da sua mão em lotes vazios, pagando o custo inicial dele. Na primeira vez que você construir em um setor, você embolsa 3 EP imediatamente.",
          "COMPRAR - pegue qualquer lote sem dono pelo valor atual, ou assuma um Ativo em Dificuldade. Há duas formas de assumir um: RETOMAR como está, por exatamente o que o banco pagou por ele, mantendo seu Projeto e seu nível e sem precisar de carta nenhuma, ou REFORMAR com uma carta da sua mão por metade do custo inicial dessa carta. Qualquer estrutura em dificuldade é alvo válido, inclusive uma que você mesmo vendeu."
        ]
      },
      {
        "p": "Retomar custa o que o banco pagou, então esse preço se lê pela forma como o prédio foi parar lá. Uma empresa vendida por Captar Recursos rendeu metade do custo inicial, ou o custo inicial cheio se tinha sido expandida - e é isso que custa retomá-la. Uma empresa tomada pelo banco em uma insolvência rendeu metade do que uma venda planejada teria pago, e é proporcionalmente barata de retomar. Uma empresa absorvida por uma Megacorporação nunca foi paga, então seu preço é o que ela teria rendido se o dono a tivesse vendido."
      },
      {
        "note": "Isto foi uma máquina de imprimir dinheiro durante uma versão. Vender uma empresa expandida embolsava o custo inicial CHEIO e comprá-la de volta na sequência custava só METADE, então um jogador podia vender e retomar o mesmo prédio todo trimestre e simplesmente ser pago por isso, com o tabuleiro inalterado no fim. Cobrar de volta exatamente o que foi entregue faz a ida e volta fechar em zero: a única coisa que isso custa agora são as duas ações, que é como deve ser - desfazer uma decisão deve ser possível e não deve ser de graça."
      },
      {
        "p": "Você pode construir em lotes de outro jogador. Ele recebe o aluguel todo trimestre, mas a empresa é sua."
      },
      {
        "p": "Uma reforma tem que caber na carcaça que já está de pé. A carta precisa ter o mesmo nível da estrutura em dificuldade e, do nível 2 para cima, também o mesmo tipo de crescimento: uma estrutura horizontal de nível 2 ou 3 se espalha por vários lotes e não pode ser reconstruída como vertical, nem o contrário. No nível 1 os dois tipos ocupam um único lote, então uma carcaça de nível 1 aceita qualquer Projeto de nível 1."
      },
      {
        "p": "Reformar move os marcadores de preço exatamente como fundar - o setor em que você constrói DESCE $1 e cada fornecedor citado na nova carta SOBE $1 - porque uma reforma coloca uma empresa genuinamente nova na cidade. Retomar uma carcaça como está não move nada. O prédio não mudou, e tampouco mudou o que a cidade consegue fornecer ou precisa comprar."
      },
      {
        "note": "Essa diferença é a razão inteira de manter as duas como jogadas separadas, em vez de uma única ação de \"assumir\". Retomar é o jeito barato e discreto de desfazer uma venda; reformar é o jeito caro, que muda o que a cidade produz, e fazer isso deve custar alguma coisa ao mercado."
      },
      {
        "h": "P&D"
      },
      {
        "ul": [
          "PESQUISAR - compre a carta do topo, virada para cima, de qualquer baralho de setor. O limite de mão é de cinco cartas.",
          "EXPANDIR - pague de novo o custo inicial de uma empresa. A produção e o OPEX dela dobram, e o nível dela sobe um."
        ]
      },
      {
        "p": "Uma empresa horizontal (Serviços Públicos, Manufatura, Tecnologia) cresce para os lados: expandir exige um lote adjacente que esteja vazio e tenha dono - você ou qualquer outro jogador, caso em que você paga aluguel a ele, exatamente como ao construir. Uma empresa vertical (Varejo, Hotelaria, Saúde) empilha no lote que já ocupa. Cada empresa pode ser expandida uma vez."
      },
      {
        "p": "Adjacente significa compartilhar um lado - acima, abaixo, à esquerda ou à direita - estejam os dois lotes no mesmo distrito ou do outro lado da fronteira, no distrito seguinte. Lotes que se tocam apenas por um canto não são adjacentes, então uma empresa nunca pode ocupar os dois. A mesma regra decide onde uma empresa de vários lotes pode ser construída em primeiro lugar: seus lotes precisam formar uma única forma conectada."
      },
      {
        "h": "Reunião do Conselho"
      },
      {
        "ul": [
          "ABRIR CAPITAL - faça a fusão de empresas para reivindicar uma ficha de Megacorporação. Você só pode usar esta ação se de fato tiver a combinação exata que uma das fichas disponíveis pede.",
          "REPOSICIONAR - vá para o primeiro lugar na ordem de turno e coloque seus trabalhadores juntos no início do planejamento do próximo trimestre (dois dos seus três em uma mesa de dois jogadores)."
        ]
      },
      {
        "p": "A ficha de IPO não é uma ação que você possa usar. Ela é o prêmio por ser o primeiro: quem formar a primeira Megacorporação da partida também a leva. Ela é um SEXTO espaço de empresa - então ser o primeiro a fazer uma fusão não estreita o quanto você pode operar - e é o que abre o segundo assento da Reunião do Conselho pelo resto da partida. Até lá, só um jogador pode ocupar este assento a cada trimestre, e um jogador que não consegue formar uma Megacorporação só tem Reposicionar disponível."
      }
    ]
  },
  {
    "id": "land",
    "title": "Terrenos e prédios",
    "blocks": [
      {
        "h": "Quanto custa um lote"
      },
      {
        "p": "O valor de um lote é o preço de via impresso nele mais $1 por lote ocupado que o toque - cantos inclusive, dentro de um distrito - mais $1 se ele tocar um Centro Logístico. Os preços de via vão de 1 na borda externa a 6 bem no centro da cidade. Você paga esse valor para comprar e o recebe ao vender - então terreno perto da ação de fato se valoriza conforme a cidade se preenche."
      },
      {
        "h": "Área ocupada"
      },
      {
        "p": "Uma empresa vertical sempre ocupa exatamente um lote, seja qual for o nível dela. Uma empresa horizontal ocupa um lote por nível, e esses lotes precisam formar um grupo conectado de terreno vazio e com dono - não precisa ser seu, embora o dono vá receber o aluguel. Um Projeto horizontal de nível 3, portanto, exige três lotes vazios conectados para sequer poder ser construído."
      },
      {
        "p": "Um lote pode sustentar mais de um nível, e o aluguel acompanha os níveis, não os lotes: $2 por nível erguido sobre um lote, pagos ao proprietário daquele lote. Quando uma persona permite que uma empresa cresça no sentido contrário - Tecnologia empilhando em vez de se espalhar, Hotelaria se espalhando em vez de empilhar - você escolhe em qual lote da área ocupada o novo nível vai. Empilhe em terreno seu e o aluguel desses níveis volta para você."
      },
      {
        "note": "O aluguel era $3 por nível e agora é $2. O aluguel e a conta de fornecedores são cobrados separadamente, mas juntos ainda somam exatamente o que o Projeto cobra, então a taxa decide uma DIVISÃO, e não um custo: a $3 os proprietários dos lotes ficavam com 57 centavos de cada dólar de OPEX e os fundos dos setores com 43; a $2 é 38 e 62. Medido: o jogador que lidera na metade da partida passa a vencer 36% dos jogos de quatro jogadores em vez de 41%, e 28% dos jogos de seis jogadores em vez de 31%, sem mudança na pontuação vencedora nem no equilíbrio entre os setores. O JOGO DE DOIS JOGADORES É A EXCEÇÃO e vai para o outro lado, de 60% para 67%: com apenas dois assentos, não há mais ninguém entre quem espalhar o alívio. $2 é um ótimo medido, e não uma direção a seguir - a $1 o líder da metade vence 47% dos jogos de quatro jogadores e 38% dos de seis, pior do que $3 jamais foi, então o ganho não continua se descermos mais. Veja audit_rent_one.js, audit_rent_scaled.js e audit_rent_flow.js."
      },
      {
        "h": "Vender o terreno debaixo de um prédio"
      },
      {
        "p": "Uma empresa só produz enquanto todo lote em que ela se apoia tiver ALGUÉM como dono - não necessariamente você. Vender um desses lotes não destrói o prédio, mas ele para de produzir até que alguém compre aquele terreno, e quem comprar passa a receber o aluguel dele daí em diante. As contas dele continuam sendo cobradas enquanto ele fica parado."
      },
      {
        "note": "Essa regra existe para que um jogador desesperado tenha mais uma coisa para vender sem perder a empresa na hora, e para que valha a pena ficar de olho no terreno em dificuldade de um adversário. Você só pode vender o seu próprio terreno - mas, se um rival construiu em um lote seu, vendê-lo realmente interrompe o prédio dele até que o terreno seja comprado de novo, então terreno sob a empresa de outra pessoa é alavancagem."
      }
    ]
  },
  {
    "id": "prices",
    "title": "Preços, oferta e demanda",
    "blocks": [
      {
        "p": "Cada setor tem um único preço de mercado pelo qual todo mundo vende. Ele começa no seu preço base e se move conforme a cidade é construída."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Preço base",
            "Crescimento"
          ],
          "rows": [
            [
              "Serviços Públicos (UT)",
              "$4",
              "Horizontal"
            ],
            [
              "Varejo (RE)",
              "$4",
              "Vertical"
            ],
            [
              "Hotelaria (HO)",
              "$5",
              "Vertical"
            ],
            [
              "Manufatura (MA)",
              "$5",
              "Horizontal"
            ],
            [
              "Saúde (HC)",
              "$6",
              "Vertical"
            ],
            [
              "Tecnologia (TE)",
              "$6",
              "Horizontal"
            ]
          ]
        }
      },
      {
        "h": "Como o preço se move"
      },
      {
        "p": "Cada setor tem um marcador em uma trilha de preços que vai de $2 a $12. Cada evento vale um dólar inteiro: uma empresa construída faz o próprio setor dela DESCER $1, e cada fornecedor que essa empresa passa a pagar SOBE $1. O marcador cai sobre um número todas as vezes."
      },
      {
        "p": "Fundar uma empresa move DOIS marcadores, e ambos um dólar inteiro. Todo setor impresso como FORNECEDOR no Projeto dela SOBE $1, porque a nova empresa vai comprar dele. O setor da própria empresa DESCE $1, porque agora há mais daquele bem à venda. Um setor que é construído com a mesma frequência com que é necessário fica exatamente onde está."
      },
      {
        "p": "Não há nada para lembrar entre um evento e outro e nada escondido: uma empresa construída, um dólar a menos no setor dela; um fornecedor citado, um dólar a mais nesse fornecedor. A taxa é a mesma nos dois sentidos, e o marcador sempre cai sobre um número impresso."
      },
      {
        "p": "O marcador para nas extremidades. Em $12 ele não sobe mais, e em $2 ele não desce mais, mas se move para o outro lado no instante em que algo o empurra - um marcador parado em $12 sai de $12 assim que uma empresa é construída ali."
      },
      {
        "note": "As extremidades serem barreiras rígidas é a razão de isto ser um marcador em uma trilha, e não uma contagem corrente. Contar oferta e demanda separadamente permitia que um setor que 'deveria' estar em $14 ficasse em $10 carregando um excesso invisível, de modo que quatro empresas precisavam ser construídas antes que o preço se movesse um centavo. Um marcador não consegue esconder nada: o que você vê na trilha é o estado inteiro."
      },
      {
        "p": "Um setor lotado pode afundar até $2. Isso ainda é o dobro do $1 que você recebe por reciclar mercadorias que não conseguiu vender, então vender sempre é melhor do que sucatear - o que não era verdade quando a trilha terminava na taxa de reciclagem. Um setor negligenciado do qual metade da mesa depende sobe rápido, e $12 é genuinamente alcançável."
      },
      {
        "note": "O dólar inteiro por evento já tinha sido testado e abandonado uma vez, e vale saber por que ele funciona agora. Sozinho, ele inflava a cidade: a pontuação vencedora com seis assentos foi de 111 para 173, o dinheiro guardado por assento mais que dobrou, e a vantagem do vencedor sobre o segundo colocado praticamente dobrou. Mas o diagnóstico estava errado. O problema nunca foi o passo - era pontuar uma economia dobrada a uma taxa definida para a economia antiga. O passo está de volta, desta vez com cada preço base $2 mais alto, a trilha indo de $2..$12 para que as bases elevadas tenham para onde ir, e o dinheiro convertendo a $50 por EP em vez de $20. Medido ao longo de 2250 partidas: o faturamento sobe 83% e a pontuação vencedora fica a menos de 2% de onde estava. Passos de meio dólar compravam uma pontuação estável deixando o mercado quieto demais para ser lido - agora todo setor é negociado abaixo do próprio preço base com frequência suficiente para importar, a Tecnologia em 17% das partidas contra 3%, e as duas pontas da trilha são alcançáveis sem que nenhuma delas seja um muro. Veja audit_full_dollar_step.js, audit_price_floor.js e audit_base_plus_two.js."
      },
      {
        "h": "Quanto cada empresa custa e produz"
      },
      {
        "p": "Custo inicial / OPEX / Produção, por nível."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Nível 1",
            "Nível 2",
            "Nível 3"
          ],
          "rows": [
            [
              "Serviços Públicos (UT)",
              "15 / 4 / 4",
              "20 / 7 / 8",
              "30 / 10 / 16"
            ],
            [
              "Varejo (RE)",
              "10 / 5 / 4",
              "15 / 9 / 8",
              "25 / 14 / 16"
            ],
            [
              "Hotelaria (HO)",
              "10 / 6 / 3",
              "15 / 10 / 6",
              "25 / 16 / 12"
            ],
            [
              "Manufatura (MA)",
              "20 / 4 / 3",
              "35 / 7 / 6",
              "60 / 10 / 12"
            ],
            [
              "Saúde (HC)",
              "20 / 5 / 2",
              "35 / 9 / 4",
              "60 / 14 / 8"
            ],
            [
              "Tecnologia (TE)",
              "15 / 6 / 2",
              "25 / 10 / 4",
              "40 / 16 / 8"
            ]
          ]
        }
      },
      {
        "h": "Quem paga a quem"
      },
      {
        "p": "Toda empresa paga uma conta de fornecedores - o OPEX impresso dela menos $2 por nível de aluguel do terreno - a empresas de outros setores: seus fornecedores, impressos no Projeto dela. A cadeia fecha um ciclo, então nenhum setor é um beco sem saída. Cartas de nível 1 têm um fornecedor, as de nível 2 têm dois, e as de nível 3 têm os três."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Fornecedor 1",
            "Fornecedor 2",
            "Fornecedor 3"
          ],
          "rows": [
            [
              "Serviços Públicos",
              "HO",
              "TE",
              "HC"
            ],
            [
              "Varejo",
              "TE",
              "HO",
              "MA"
            ],
            [
              "Hotelaria",
              "MA",
              "HC",
              "RE"
            ],
            [
              "Manufatura",
              "HC",
              "RE",
              "UT"
            ],
            [
              "Saúde",
              "RE",
              "UT",
              "TE"
            ],
            [
              "Tecnologia",
              "UT",
              "MA",
              "HO"
            ]
          ]
        }
      },
      {
        "p": "Os três não são igualmente comuns: entre os dez Projetos de um setor, o primeiro fornecedor aparece com mais frequência e o terceiro com menos. Leia o Projeto à sua frente, e não a tabela."
      },
      {
        "note": "A simetria - uma construção eleva cada fornecedor um passo e derruba o próprio setor um passo - é o que impede uma disparada. Ela faz com que ser o segundo a construir em um setor seja muito melhor do que ser o quinto, mas também faz com que abastecer um setor lotado pague mais a cada vez que alguém entra nele."
      }
    ]
  },
  {
    "id": "production",
    "title": "Produção: pagar as contas",
    "blocks": [
      {
        "p": "Toda empresa ativa paga duas contas a cada trimestre, automaticamente, venda ela alguma coisa depois ou não:"
      },
      {
        "ul": [
          "Sua CONTA DE FORNECEDORES vai para os fundos dos setores dos fornecedores impressos em seu Projeto, dividida na proporção dos valores de dependência.",
          "Seu ALUGUEL DO TERRENO - $2 por nível instalado em um lote - vai para quem for dono daquele lote. Uma empresa vertical empilha todos os seus níveis em um único lote, então todo o aluguel dela vai para um só proprietário do lote; uma horizontal coloca um nível em cada lote que ocupa, então cada proprietário do lote recebe $2. Você não paga nada por ocupar terreno próprio."
        ]
      },
      {
        "note": "Isso antes era um pagamento só, dividido em dois: a empresa pagava todo o seu OPEX, o proprietário do lote tirava $2 por nível dali, e só o restante chegava aos fundos - ou seja, em terreno próprio você solenemente pagava a si mesmo e pegava o dinheiro de volta. O dinheiro é o mesmo. Duas contas, cada uma indo para um lugar, é simplesmente o que uma mesa consegue fazer sem calculadora. As sedes de Megacorporação sempre foram cobradas assim, então é o resto do tabuleiro se equiparando a elas. Uma coisa mudou de fato: uma empresa instalada em terreno de ninguém antes era cobrada por um aluguel que não chegava a proprietário nenhum e sumia. Não há proprietário do lote, então agora ela não paga aluguel."
      },
      {
        "h": "Se você não puder pagar"
      },
      {
        "p": "Antes de o OPEX ser cobrado, todo jogador cujo dinheiro não cobrir a conta inteira ganha uma janela de emergência para escolher o que vender. Essa é uma venda forçada e tudo nela sai pela METADE do que uma venda planejada via Captar Recursos renderia: Projetos a $2 / $4 / $6 conforme o nível, lotes por metade do valor, uma empresa por metade do que teria rendido numa venda voluntária. O que você continua controlando é quais bens vão embora, não o preço."
      },
      {
        "p": "Se você fechar a janela com a conta ainda descoberta, o banco vende por você por essas mesmas taxas pela metade - Projetos primeiro, depois seus lotes mais baratos, depois suas empresas mais fracas - e, se ainda assim não bastar quando a conta de uma empresa vencer, essa empresa entra em INSOLVÊNCIA: todo o resto que você tiver sai pela metade, e a empresa que causou isso vai para o banco como Ativo em Dificuldade."
      },
      {
        "note": "Vender a preço cheio sob pressão tornava a janela de emergência estritamente melhor do que se planejar - dava para ignorar o OPEX, esperar ser forçado e não perder nada. É a redução pela metade que faz a trilha Captar Recursos valer um trabalhador."
      },
      {
        "note": "A liquidação forçada paga exatamente metade de uma venda voluntária, em todos os casos. Ficar sem dinheiro deve doer o bastante para que os jogadores mantenham uma reserva, sem virar uma espiral da morte - um evento de insolvência costuma custar a um jogador um trimestre, não a partida."
      }
    ]
  },
  {
    "id": "revenue",
    "title": "Receita: vender o que você produz",
    "blocks": [
      {
        "p": "Cada empresa produz um número de unidades impresso em seu Projeto, dobrado se ela tiver sido expandida. Esse número é tudo o que ela tem: toda habilidade abaixo é um caminho para essas unidades, nunca uma fonte de mais unidades. Você as entrega a ícones de demanda que sua empresa consegue alcançar, e cada unidade que um ícone recebe é paga pelo preço de mercado atual do seu setor."
      },
      {
        "p": "Os ícones de demanda são por ordem de chegada; os negócios para os quais uma empresa de Hotelaria vende, não - então em geral vale pegar primeiro os ícones disputados e mandar o que sobrar para os vizinhos. Tudo o que ainda assim você não conseguir colocar é reciclado por $1 a unidade."
      },
      {
        "p": "A entrega segue a ordem de turno. Todo ícone é por ordem de chegada, então estar no início da ordem vale dinheiro de verdade num distrito disputado - e é a principal coisa que REPOSICIONAR compra para você."
      },
      {
        "h": "Quais ícones você pode usar"
      },
      {
        "p": "Todo distrito mostra uma grade de demanda 4x4. Cada linha é um setor; as quatro colunas são os níveis 1 a 4. Você pode entregar a um ícone se o setor da linha for o seu e a coluna não for maior que o nível da sua empresa - então uma empresa maior alcança mais fundo no mesmo distrito, e os ícones mais fundos são mais famintos."
      },
      {
        "ul": [
          "As linhas 3 e 4 de todo distrito ficam fechadas até o Trimestre 5.",
          "No fim do Trimestre 8, toda a grade de demanda é limpa e todos os ícones reabrem para o Ano 3.",
          "UM ÍCONE RECEBE A PRÓPRIA COLUNA EM MERCADORIAS: o ícone de nível 1 recebe uma unidade, o de nível 2 duas, o de nível 3 três, o de nível 4 quatro. Uma empresa de nível 3 que alcança as colunas 1, 2 e 3 vende, portanto, 1 + 2 + 3 = 6 unidades em uma única linha limpa do seu setor.",
          "Cada ícone pode receber uma venda só, de quem chegar primeiro - e é preenchido por inteiro, não importa quantas unidades tenha exigido, embora você só receba pelas unidades que de fato tinha.",
          "Tudo o que você não conseguir vender é reciclado por $1 a unidade."
        ]
      },
      {
        "h": "Até onde uma empresa alcança"
      },
      {
        "p": "Uma empresa sempre pode vender no distrito ou nos distritos onde estão seus próprios lotes. Além disso:"
      },
      {
        "ul": [
          "Centros Logísticos ficam em lotes. Se qualquer lote da área ocupada pela sua empresa for ortogonalmente vizinho de um centro - até quatro lotes podem ser, já que os cantos não contam - sua empresa entra na rede logística e alcança todos os distritos em que haja algum centro do tabuleiro. Uma sede de Megacorporação conta como centro para isso, então construir ao lado do monumento alheio também coloca você na rede.",
          "Serviços Públicos e Varejo nunca podem usar centros, de jeito nenhum.",
          "Saúde já está na rede logística por natureza - alcança todo distrito com centro sem precisar encostar em nenhum."
        ]
      },
      {
        "h": "Habilidades dos setores"
      },
      {
        "table": {
          "head": [
            "Setor",
            "Habilidade"
          ],
          "rows": [
            [
              "Serviços Públicos",
              "Lê a demanda em um bloco de distritos tão largo quanto o seu nível, posicionado em qualquer lugar que ainda cubra a própria área ocupada. Nunca usa centros."
            ],
            [
              "Varejo",
              "Vende em um distrito extra à sua escolha por nível. Nunca usa centros."
            ],
            [
              "Hotelaria",
              "Pode vender aos negócios e centros ao seu redor em vez de vender a ícones de demanda - uma unidade a preço de mercado para cada negócio ou centro dentro do seu nível em lotes, sem precisar de ícone. Essas unidades saem da produção dela como quaisquer outras."
            ],
            [
              "Manufatura",
              "Pode direcionar até o seu nível em unidades para as linhas de OUTROS setores no próprio distrito. Essas unidades saem da produção dela - a venda cruzada é um lugar para mandar mercadorias, não mercadorias a mais."
            ],
            [
              "Saúde",
              "Alcança todo distrito na rede logística sem encostar em um centro."
            ],
            [
              "Tecnologia",
              "Todo ícone que ela preenche recebe o dobro da sua coluna em unidades - 2, 4, 6 ou 8 - e paga por todas elas."
            ]
          ]
        }
      },
      {
        "h": "B2B: os fundos pagam"
      },
      {
        "p": "Cada fundo é dividido igualmente entre as empresas daquele setor - uma parte igual para cada uma, do tamanho que essas empresas forem. Quem é pago é o setor, não o prédio. Uma sede de Megacorporação conta aqui: ela não produz nada, mas o setor paga a parte dela mesmo assim."
      },
      {
        "p": "O que não dividir certinho fica no fundo e passa adiante. Um fundo de $10 dividido entre três empresas de Saúde paga $3 a cada uma e leva $1 para o trimestre seguinte."
      },
      {
        "p": "Um fundo sem nenhuma empresa daquele tipo para pagar passa adiante por inteiro, crescendo trimestre a trimestre. Um setor que ninguém atende é muitas vezes a coisa mais lucrativa do tabuleiro."
      },
      {
        "note": "O dobrador da Tecnologia e o bônus de vizinhança da Hotelaria são as duas habilidades que escalam com o tabuleiro, e não com a carta, e são o motivo de esses dois setores parecerem fracos no papel e jogarem forte. Serviços Públicos era originalmente 'distância menor que o nível a partir de qualquer distrito de origem', o que discretamente deixava uma empresa de Serviços Públicos de nível 3 enxergar a cidade inteira; agora ela lê um bloco N x N honesto."
      }
    ]
  },
  {
    "id": "closing",
    "title": "Encerramento e o fim de ano",
    "blocks": [
      {
        "p": "Todo trimestre termina com a construção de um novo Centro Logístico em um lote vazio que não pertence a ninguém. O primeiro jogador na ordem de turno escolhe qual. Aquele lote fica ocupado para sempre - nada mais pode ser construído ali - e o centro acrescenta o próprio distrito à rede logística."
      },
      {
        "h": "No fim dos Trimestres 4, 8 e 12"
      },
      {
        "ul": [
          "O Magnata Imobiliário e O Onipresente são concedidos - 5 EP cada um ao líder isolado com 2-3 jogadores, 10 EP cada um com 4 ou mais. Eles também são pagos no trimestre final se a partida for encerrada antes do Q12.",
          "Você pode recomprar discos de empréstimo: $30 no fim do Ano 1, $35 no Ano 2, $40 no Ano 3."
        ]
      },
      {
        "p": "As empresas não esperam o fim de ano. Uma empresa pontua no instante em que fica pronta - veja abaixo - então, quando um ano termina, os EP dela já estão embolsados. O que um fim de ano decide é quem está com a cidade na mão."
      },
      {
        "h": "As empresas pontuam ao ficarem prontas"
      },
      {
        "p": "No instante em que uma empresa é construída, ela pontua 2 EP por nível, direto para o seu bolso. No instante em que é expandida, pontua de novo pelo novo nível, de novo direto para o seu bolso. É uma pontuação por construção e uma por expansão - do mesmo jeito que entrar em um setor paga você no momento em que você constrói ali, não em alguma contagem posterior."
      },
      {
        "p": "Então uma empresa de nível 2 construída e depois expandida paga 4 EP no dia em que abre e mais 6 no dia em que cresce."
      },
      {
        "p": "Não há nada retido nem nada para controlar nas cartas: todo EP que você ganhou está embolsado, e a classificação é a pontuação. Você nunca perde EP que já pontuou - nem quando uma empresa é vendida, nem quando ela entra em dificuldade, nem quando é fundida em uma Megacorporação. Uma carcaça em dificuldade que seja retomada pontua os níveis dela de novo para o novo dono, então uma empresa pode pontuar duas vezes na vida."
      },
      {
        "note": "Dois EP por nível, pagos na conclusão, é a mudança que fez a construção parecer o ponto do jogo, e não um jeito de financiar os prêmios de terras. A 1 EP por nível, pago um ou dois trimestres depois, uma empresa tinha de sobreviver para valer alguma coisa e ainda assim perdia para o dinheiro; agora o ato de construir é a recompensa, e o risco de um evento de insolvência tardio não devora mais isso."
      },
      {
        "note": "Os EP antes ficavam na carta da empresa até serem liberados - na expansão, na venda, na fusão ou no fim da partida. Isso nunca mudou uma única pontuação final, porque a classificação sempre contava as cartas também e nada conseguia tirar uma carta da mesa sem antes liberar seus EP, então tudo o que isso comprava era uma segunda pilha para manter em ordem e uma pergunta - 'isso já foi liberado?' - sem nada dependendo da resposta. Agora os EP vão direto para onde sempre iam parar."
      }
    ]
  },
  {
    "id": "megacorp",
    "title": "Abrir capital e Megacorporações",
    "blocks": [
      {
        "p": "Abrir capital significa sempre fundir empresas para reivindicar uma ficha de Megacorporação, desde a primeiríssima vez que isso é feito. Cada ficha indica uma combinação de níveis de empresa e paga entre 8 e 22 EP; você precisa ter pelo menos aquelas empresas, e as que sobrarem da combinação continuam suas. Se suas empresas servirem para mais de uma ficha, reivindica-se a que paga mais; o que você escolhe é qual das empresas fundidas vira a sede."
      },
      {
        "p": "Quem formar a primeira Megacorporação da partida leva também a ficha de IPO: um sexto espaço de empresa pelo resto da partida, e o segundo assento da Reunião do Conselho abre para todos."
      },
      {
        "h": "O que uma fusão faz"
      },
      {
        "ul": [
          "Você escolhe uma das empresas fundidas para virar a sede da Megacorporação. Ela mantém o prédio e devolve o Projeto ao baralho do seu setor.",
          "Todas as outras vão para o banco como Ativos em Dificuldade - qualquer um pode assumi-las depois.",
          "A sede para de operar: sem Projeto, não produz nada e não paga OPEX. Ela ainda recebe sua parte igual do fundo do seu setor em todo B2B - uma sede que parou de construir não parou de receber.",
          "A cada trimestre em que estiver de pé, a sede embolsa EP igual ao PREÇO ATUAL do seu setor DIVIDIDO PELO PATAMAR DA FICHA, arredondado para baixo. Uma sede de patamar 1 em um setor a $3 embolsa 3 EP por trimestre; uma sede de patamar 4 no mesmo setor não embolsa nada até aquele setor chegar a $4. Uma sede em um setor que ninguém atende vai ganhando discretamente enquanto o preço sobe, e uma formada no Ano 1 arrecada por oito trimestres a mais do que uma formada no Ano 3.",
          "Ela não tem conta de fornecedores, mas continua ocupando o terreno, então o dono dela paga aluguel do terreno todo trimestre como qualquer outro prédio - $2 por nível instalado em um lote, ao proprietário daquele lote. Em terreno próprio, nada é devido.",
          "Uma sede é infraestrutura pública: conta como Centro Logístico. Qualquer empresa construída ortogonalmente ao lado de uma entra na rede logística por meio dela, seja de quem for. Um monumento que só arrecadasse seria um monumento ao lado do qual ninguém ia querer construir - e as empresas que se juntam em volta dele são exatamente aquelas a quem ele paga um dízimo.",
          "Venda um lote debaixo de uma sede e ela não arrecada mais nada - sem parte do fundo, sem pontos, e deixa de ser um centro. Um monumento ainda precisa do seu terreno.",
          "Ela mantém o disco e trava permanentemente um dos seus cinco espaços de empresa. Cada Megacorporação que você forma reduz o quanto você pode operar em largura.",
          "A cada trimestre em que estiver de pé, a sede paga 1 EP a cada empresa RIVAL que estiver ortogonalmente ao lado dela, e o dono daquela empresa o embolsa. Suas PRÓPRIAS empresas ao lado da sua própria sede não custam nada a você - elas são pagas e você é cobrado no mesmo instante, o que se anula. Então uma sede encravada no distrito alheio sangra a partida inteira, e onde você a coloca é uma aposta em quem vai construir do seu lado."
        ]
      },
      {
        "p": "Oito fichas ficam em jogo numa mesa de quatro jogadores, doze com cinco e todas as dezesseis com seis, então a combinação que você está montando em geral ainda está lá, mas as que pagam mais são disputadas."
      },
      {
        "h": "As fichas"
      },
      {
        "table": {
          "head": [
            "Megacorporação",
            "Exige",
            "Empresas",
            "Valor"
          ],
          "rows": [
            [
              "Local Syndicate",
              "3 x L1",
              "3",
              "8 EP"
            ],
            [
              "Founders’ Pact",
              "2 x L1 + 1 x L2",
              "3",
              "9 EP"
            ],
            [
              "Continental Holdings",
              "4 x L1",
              "4",
              "10 EP"
            ],
            [
              "Twin Ventures",
              "1 x L1 + 2 x L2",
              "3",
              "10 EP"
            ],
            [
              "Silent Merger",
              "3 x L2",
              "3",
              "11 EP"
            ],
            [
              "Neighborhood Holdings",
              "3 x L1 + 1 x L2",
              "4",
              "12 EP"
            ],
            [
              "Regional Consolidated",
              "2 x L2 + 1 x L3",
              "3",
              "13 EP"
            ],
            [
              "Crosstown Alliance",
              "2 x L1 + 2 x L2",
              "4",
              "13 EP"
            ],
            [
              "Metro Trust",
              "1 x L2 + 2 x L3",
              "3",
              "14 EP"
            ],
            [
              "Crossroads Deal",
              "1 x L1 + 3 x L2",
              "4",
              "14 EP"
            ],
            [
              "Skyline Consolidated",
              "3 x L3",
              "3",
              "15 EP"
            ],
            [
              "Apex Group",
              "2 x L2 + 2 x L3",
              "4",
              "16 EP"
            ],
            [
              "Titan Industries",
              "2 x L3 + 1 x L4",
              "3",
              "17 EP"
            ],
            [
              "Colossus Group",
              "4 x L3",
              "4",
              "19 EP"
            ],
            [
              "Empire Holdings",
              "1 x L2 + 2 x L3 + 1 x L4",
              "4",
              "20 EP"
            ],
            [
              "Omnicorp",
              "3 x L3 + 1 x L4",
              "4",
              "22 EP"
            ]
          ]
        }
      },
      {
        "p": "Uma empresa de nível 4 é uma que foi expandida a partir do nível 3, então as fichas mais ricas exigem empresas que você já pagou para crescer."
      },
      {
        "h": "Os quatro patamares"
      },
      {
        "p": "As dezesseis fichas são quatro patamares de quatro. O patamar 4 são as quatro mais baratas de montar e o patamar 1 as quatro mais difíceis, e o patamar faz duas coisas: decide quais fichas estão na caixa e divide o que a sede ganha."
      },
      {
        "table": {
          "head": [
            "Patamar",
            "Fichas",
            "Em jogo a partir de",
            "Um setor a $3 embolsa",
            "Um setor a $6 embolsa"
          ],
          "rows": [
            [
              "4",
              "Local Syndicate, Founders’ Pact, Continental Holdings, Twin Ventures",
              "2 jogadores",
              "0 EP",
              "1 EP"
            ],
            [
              "3",
              "Silent Merger, Neighborhood Holdings, Regional Consolidated, Crosstown Alliance",
              "2 jogadores",
              "1 EP",
              "2 EP"
            ],
            [
              "2",
              "Metro Trust, Crossroads Deal, Skyline Consolidated, Apex Group",
              "3 jogadores",
              "1 EP",
              "3 EP"
            ],
            [
              "1",
              "Titan Industries, Colossus Group, Empire Holdings, Omnicorp",
              "4 jogadores",
              "3 EP",
              "6 EP"
            ]
          ]
        }
      },
      {
        "p": "As fichas são sorteadas de todos os patamares que estiverem em jogo, e quantas depende da mesa: DUAS de cada patamar com dois, três ou quatro jogadores, TRÊS com cinco, e com seis jogadores toda ficha do jogo fica disponível. Então a caixa tem quatro fichas com dois jogadores, seis com três, oito com quatro, doze com cinco e todas as dezesseis com seis."
      },
      {
        "note": "O sorteio mais amplo com cinco e seis jogadores não é variedade por variedade. Uma segunda Megacorporação convoca o trimestre final, e as mesas maiores são as que têm mais motivo para querer essa porta aberta - doze trimestres com seis pessoas deliberando é uma noite longa. Com a caixa cheia em jogo, uma segunda fusão passa a ser algo que se pode procurar, em vez de uma questão de as duas fichas que você poderia usar terem sido sorteadas ou não: as partidas que terminam cedo vão de 8% com quatro jogadores para 21% com cinco e 36% com seis, e a partida média de seis jogadores acaba cerca de dois terços de trimestre mais cedo. O prazo é CONVOCADO com muito mais frequência do que morde - 82% das partidas de seis jogadores contra 25% das de quatro - porque uma segunda Megacorporação que cai no Q11 ou no Q12 nomeia um trimestre final que a partida ia jogar de qualquer jeito."
      },
      {
        "note": "Antes dos patamares, um Local Syndicate montado com três empresas de nível 1 ganhava por trimestre exatamente o mesmo que um Omnicorp montado com quatro de nível 3, e a Megacorporação havia crescido até 33% de uma pontuação vencedora - o maior bloco isolado do jogo, à frente das empresas. Dividir o EP de marca pelo patamar cortou isso pela metade, para 17%, e baixou a vantagem do vencedor sobre o último de 58.6 EP para 48.7, sem tornar a fusão em si mais rara. A regra de sorteio quase não pesa com quatro jogadores, onde oito fichas aleatórias de dezesseis já dão em média duas por patamar; ela se paga com dois, onde tirou da caixa as fichas impossíveis de reivindicar e as Megacorporações formadas subiram de 1.00 por partida para 1.26."
      },
      {
        "note": "Uma fusão deve ser uma decisão de verdade, não um bônus grátis: você está abrindo mão da produção das empresas e das expansões que ainda faltavam a elas em troca de uma quantia de uma vez agora, de uma sede que arrecada sem operar e de um dízimo para quem construir ao lado dela. Todo EP que aquelas empresas já pontuaram está embolsado e continua embolsado. É mais forte no Ano 3 e costuma ser um erro no Ano 1."
      }
    ]
  },
  {
    "id": "scoring",
    "title": "Vitória",
    "blocks": [
      {
        "p": "Pontue de forma constante em vez de perseguir um único grande lance. Amplitude paga cedo; tamanho paga tarde."
      },
      {
        "table": {
          "head": [
            "Fonte",
            "EP"
          ],
          "rows": [
            [
              "Entrar em um setor pela primeira vez",
              "+3 cada, uma vez por setor por partida, creditados imediatamente"
            ],
            [
              "Cada empresa, quando é construída - e de novo quando é expandida",
              "+2 por nível"
            ],
            [
              "Ficha de Megacorporação",
              "+8 a +22, conforme impresso"
            ],
            [
              "Sede de Megacorporação, a cada trimestre em que estiver de pé",
              "+ o preço do seu setor / o patamar da sua ficha, arredondado para baixo"
            ],
            [
              "Sede de Megacorporação, a cada trimestre",
              "+o preço do seu setor dividido pelo patamar da ficha; e ela paga 1 EP a cada empresa rival ao seu lado, que aquele dono embolsa"
            ],
            [
              "O Magnata Imobiliário - mais lotes possuídos, a cada fim de ano",
              "+5 só ao líder isolado, +10 com 4+ jogadores"
            ],
            [
              "O Onipresente - mais distritos em que você está presente, a cada fim de ano",
              "+5 só ao líder isolado, +10 com 4+ jogadores"
            ],
            [
              "Dinheiro em caixa no fim",
              "+1 a cada $50 completos"
            ],
            [
              "Cada disco de empréstimo ainda no banco",
              "-5"
            ]
          ]
        }
      },
      {
        "p": "Para O Onipresente, um distrito conta se você possui um lote nele ou se uma de suas empresas ativas está nele."
      },
      {
        "p": "O aluguel do terreno é simplesmente dinheiro. Ele é recebido conforme é gerado e pontua dentro do seu caixa no fim, como qualquer outro dólar - não há nada separado para controlar. O que vale saber é quanto da sua renda ele silenciosamente se torna: um lote com a construção de outra pessoa em cima paga você todo trimestre, e com seis jogadores metade dos lotes que um jogador possui carrega a construção de um rival."
      },
      {
        "note": "Esse número já mudou duas vezes, nas duas por causa de mudanças nas regras de preço. Era $10 até a trilha de preços entrar; a trilha deixou a economia maior, e pontuar isso na taxa antiga dobrou a linha do dinheiro, de cerca de um terço de uma pontuação vencedora para cerca de metade, de modo que não gastar rendia mais do que construir. $20 corrigiu isso. Aumentar toda base em $2 e fazer cada evento valer um dólar inteiro provocou a mesma coisa de novo, em escala maior - a arrecadação sobe 83% - e $50 corrige de novo: medida ao longo de 2250 partidas, a pontuação vencedora fica a 2% de onde estava, ao passo que deixar a taxa em $20 a teria inflado em 44%. Uma taxa que só acompanhasse o dinheiro seria $37; $50 está certo porque os bots também precificam cada decisão por meio desse número, então uma taxa mais alta também faz construir valer mais do que guardar. Veja audit_base_plus_two.js. Se as regras de preço mudarem de novo, esse número muda junto - são um único ajuste em dois lugares."
      },
      {
        "note": "O aluguel chegou a ter sua própria linha de pontuação por um tempo, enquanto o equilíbrio das terras estava sendo investigado. Ele foi reincorporado ao caixa: a separação não mudou nenhum total, e pedir que a mesa mantenha uma contagem corrente de aluguel a partida inteira para dividir um número em duas metades que voltam a somá-lo é burocracia sem decisão. A versão digital ainda mostra o fluxo, onde isso não custa nada. Terras mais aluguel somam cerca de 27% de uma pontuação vencedora com dois assentos e 14% com seis - veja audit_idle_land.js."
      },
      {
        "p": "Só o líder isolado pontua um prêmio de terras, e uma liderança compartilhada paga mal. Com dois e três jogadores: 5 EP sozinho, 2 EP para cada um se dois empatarem, 1 EP para cada um se três ou mais empatarem. Com quatro jogadores ou mais, todos os valores dobram - 10 EP sozinho, 4 para cada um num empate duplo, 2 para cada um além disso. O segundo lugar não recebe nada em nenhuma contagem."
      },
      {
        "note": "Os dois prêmios pagam os mesmos ~29 EP ao longo de uma partida, estejam duas pessoas ou seis disputando, então uma taxa calibrada para uma mesa pequena é erro de arredondamento numa mesa grande - as terras são 17% de uma pontuação vencedora com dois assentos e 3.5% com seis. A 5 EP, o jogador que detém mais terreno vence ABAIXO do que um assento indiferente levaria, em qualquer contagem: perseguir terras era uma armadilha. Dobrar o prêmio a partir de quatro jogadores recoloca essa disputa no nível do acaso ou acima dele sem achatar o jogo - as mudanças de liderança aumentam em toda mesa e as partidas lideradas do começo ao fim diminuem. A mesma mudança com dois e três faz as terras chegarem a 41% e 33% de uma pontuação vencedora e o jogo se acomoda de forma mensurável, então as mesas pequenas mantêm a taxa antiga. Pagar o vice é pior do que não pagar ninguém: metade a mais de EP, e o líder em terras vence com menos frequência."
      },
      {
        "note": "Os prêmios pagavam 10 e 5 e eram divididos entre os empatados, o que significava que quase todo mundo levava alguma coisa e manter terras nunca era de fato uma disputa - eram 21% da pontuação de um assento médio em troca de pouquíssima decisão. Pagar só ao líder, e pagar mal por um empate, derruba isso para cerca de 9% e transforma aquilo numa corrida de novo."
      },
      {
        "h": "Quando a partida termina"
      },
      {
        "p": "A partida termina no encerramento do Trimestre 12, OU no encerramento do trimestre SEGUINTE a qualquer jogador fundar sua SEGUNDA Megacorporação - o que vier primeiro. A segunda Megacorporação não encerra a partida; ela CONVOCA o trimestre final, e todos têm esse trimestre para responder. Se ela for fundada no Q11 ou depois, a partida simplesmente termina no Q12, como de costume."
      },
      {
        "p": "Quem tiver mais EP vence. Se as pontuações finais empatarem, vence o jogador que ainda mantém mais EMPRESAS ATIVAS - sedes não contam, porque uma sede parou de operar. Se isso também estiver igual, vence quem tiver mais dinheiro; e, se ainda houver empate, quem tiver menos discos de empréstimo no banco."
      },
      {
        "note": "A segunda Megacorporação é um prazo, não um atalho. Um jogador capaz de montar duas passou a partida fundindo empresas, e o resto da mesa teria, de outro modo, mais quatro trimestres vendo esse jogador disparar na frente. Na prática, com que frequência isso morde depende inteiramente da mesa: encerra a partida mais cedo em 10% das partidas de dois jogadores, 1% das de três, 8% das de quatro, 21% das de cinco e 36% das de seis. Nas mesas maiores - as que mais têm motivo para querer uma noite curta - isso faz trabalho de verdade; com três assentos, a partida essencialmente sempre vai até os doze trimestres completos. O que ele realmente faz é pôr um relógio na última fusão do líder."
      },
      {
        "note": "Os dois parâmetros foram ajustados juntos contra 300 partidas por caso. A 3 EP por nível, as empresas eram 32% da pontuação de um assento médio e todo o resto sumia atrás delas; a 1 EP, uma expansão deixava de compensar pagar o custo inicial duas vezes e as empresas expandidas caíram de 5.1 por partida para 3.1, enquanto o bônus de entrada de 5 EP inchou para 27% de uma pontuação por uma decisão que mal é uma decisão. Dois e três não deixam nada acima de um terço, e construir continua sendo a maior coisa isolada. Remedido ao longo de 150 partidas por tamanho de mesa com as regras como elas estão - o prêmio de terras escalonado por mesa e o dízimo da Megacorporação - em todos os assentos: empresas e expansões 38-43%, entrar em um setor 13-14%, prêmios de terras 20% com dois assentos, 14% com três, 18% com quatro, 14% com cinco e 12% com seis, formar uma Megacorporação 7-14%, o EP de marca 5-12%, o dízimo cerca de 1-2% para cada lado, dinheiro em caixa 11-14% e empréstimos não pagos cerca de -1%. As terras não desabam mais com o número de jogadores: eram 6% com seis assentos antes de o prêmio escalonar. Veja audit_state_of_play.js."
      },
      {
        "note": "Dois desses números merecem a atenção de um designer. O DINHEIRO EM CAIXA É CERCA DE UM TERÇO DE UMA PONTUAÇÃO VENCEDORA em qualquer tamanho de mesa - muito peso para uma regra que soa como arredondar as sobras, e isso significa que um jogador que simplesmente não gasta pontua tanto quanto um que constrói. E OS PRÊMIOS DE TERRAS ENCOLHEM CONFORME A MESA CRESCE, de 20% dos pontos do vencedor com dois assentos para 5% com seis quando o prêmio é fixo, porque um prêmio fixo é dividido entre mais pretendentes enquanto toda outra fonte escala com o quanto você faz - e é por isso que o prêmio agora dobra a partir de quatro jogadores. O dinheiro é a alavanca que resta, caso o equilíbrio volte a ser revisto."
      }
    ]
  },
  {
    "id": "personas",
    "title": "Personas",
    "blocks": [
      {
        "p": "Personas são poderes assimétricos, um ligado a cada setor. Elas são distribuídas por padrão - deixe-as de fora numa primeira partida, se preferir - e só se distribuem tantas quantos forem os jogadores, então numa mesa pequena algumas ficam de fora. A persona de cada um é pública desde o início, então você pode pesar a sua própria especialidade e a de todos os outros durante o draft."
      },
      {
        "table": {
          "head": [
            "Persona",
            "Poder"
          ],
          "rows": [
            [
              "Arquiteto de Sistemas (TE)",
              "Suas empresas de Tecnologia podem expandir verticalmente, empilhando em um único lote em vez de precisar de um vizinho livre - ou se espalhar como a Tecnologia costuma fazer. Você escolhe a cada expansão."
            ],
            [
              "Diretor de Saúde Pública (HC)",
              "Suas empresas de Saúde podem atender qualquer coluna de uma linha de Saúde, seja qual for o nível delas - mas uma unidade vendida acima do nível da sua empresa paga $1 a menos que o preço."
            ],
            [
              "Fornecedor White-Label (MA)",
              "Quando sua Manufatura faz venda cruzada na linha de outro setor, ela pode ser paga pelo preço daquele setor em vez do próprio - o que for maior."
            ],
            [
              "Incorporador de Resorts (HO)",
              "Suas empresas de Hotelaria podem expandir horizontalmente, espalhando-se por lotes para que mais empresas e centros logísticos fiquem adjacentes a elas - ou empilhar como a Hotelaria costuma fazer. Você escolhe a cada expansão."
            ],
            [
              "Especialista em Cadeia de Suprimentos (RE)",
              "No início da Produção, você pode elevar em um passo um setor que você NÃO opera; seu Varejo então alcança um distrito extra neste trimestre. Você também pode recusar."
            ],
            [
              "Concessionário (UT)",
              "No início da Produção você pode ligar sua concessão: sua produção de Serviços Públicos então vende por $1 acima do preço atual neste trimestre. A cada trimestre em que você vender com esse ágio, o preço de Serviços Públicos cai um passo no fim do trimestre."
            ]
          ]
        }
      },
      {
        "note": "Cada persona é uma inclinação, não uma jaula. Todas apontam deliberadamente para fazer mais de um setor, e o bônus de entrada aponta deliberadamente para o outro lado, então uma persona muda a sua melhor linha de jogo sem reduzi-la a uma só."
      }
    ]
  },
  {
    "id": "variants",
    "title": "Variantes de regras (opcional)",
    "blocks": [
      {
        "p": "Todas elas vêm desligadas por padrão, e uma mesa que não mexer em nenhuma joga exatamente as regras deste livro. Podem ser combinadas livremente."
      },
      {
        "p": "Todas soam como jogar do jeito antigo, porque é isso que elas são. Cinco regras que eram opcionais na v12 viraram padrão na v13, e o que continua alternável é o jogo como ele era antes."
      },
      {
        "table": {
          "head": [
            "Variante",
            "O que muda"
          ],
          "rows": [
            [
              "Pontuar no fim de ano",
              "Uma empresa espera o próximo fim de ano para receber seus EP, em vez de pontuar no momento em que é construída ou expandida. Ela continua pontuando uma vez por construção ou expansão."
            ],
            [
              "Níveis pontuam pesado",
              "Um nível de empresa vale 3 EP em vez de 2. Construir alto vira a maior coisa isolada do placar, ao custo de empurrar terras, dinheiro e os bônus de entrada para segundo plano."
            ],
            [
              "Baralhos ordenados",
              "Cada baralho de setor vai do nível 1 no topo até o nível 3 no fundo, em vez de ser embaralhado por inteiro. Nenhum nível 3 pode ser draftado, e o início de partida não guarda surpresas."
            ],
            [
              "Centros logísticos na estrada",
              "Um Centro Logístico fica sobre uma divisa e une os dois distritos de cada lado, em vez de ficar num lote e alcançar apenas o seu próprio. Nenhum lote é consumido, e todo centro logístico vale dois distritos em vez de um."
            ],
            [
              "Prêmios de terras só no fim",
              "O Magnata Imobiliário e O Onipresente são pagos uma única vez, depois do Trimestre 12, em vez de a cada fim de ano. As terras viram uma corrida de fim de partida, em vez de algo para manter a partida inteira."
            ]
          ]
        }
      },
      {
        "p": "Combinem quais delas estão ligadas antes do draft. Várias mudam quanto vale um Projeto, então escolher no meio do caminho não é um ato neutro.",
        "only": "table"
      },
      {
        "p": "As que estiverem ligadas são mostradas na sala de espera antes de a partida começar e ficam registradas junto com a partida concluída, então uma mesa com variantes nunca é confundida com uma padrão nos registros.",
        "only": "digital"
      },
      {
        "note": "Elas continuam alternáveis para que as duas versões possam ser jogadas lado a lado, não porque as antigas estejam equilibradas em relação às novas. Ligar as cinco joga a v12 quase exatamente."
      },
      {
        "note": "Centros logísticos em lotes são uma restrição de verdade: um quarto dos lotes do tabuleiro não tem nenhum vizinho ortogonal, então um centro mal colocado não conecta ninguém. É a regra funcionando como planejado - é por isso que o seletor de centros diz quantos lotes um ponto conectaria antes de você se comprometer com ele - mas é também a regra com maior chance de precisar de uma nova olhada depois de algumas mesas."
      }
    ]
  },
  {
    "id": "online",
    "title": "Jogando online",
    "only": "digital",
    "blocks": [
      {
        "p": "Crie uma sala e compartilhe o código de seis caracteres. Qualquer pessoa que o digitar entra na sua mesa."
      },
      {
        "ul": [
          "2 a 6 assentos em qualquer mistura de pessoas e bots. Os bots preenchem qualquer assento que você não queira esperar.",
          "Se a mesa estiver cheia ou a partida já tiver começado, quem chega depois entra como espectador: vê o tabuleiro inteiro e pode usar o chat e falar, mas não pode agir.",
          "O chat de texto e o chat de voz são integrados. A voz roda ponto a ponto - o servidor só faz a apresentação.",
          "Atualizar a página ou perder a conexão não faz você perder o assento. Volte ao mesmo endereço e você é recolocado direto no jogo.",
          "Se alguém sair de vez, o anfitrião pode entregar o assento dessa pessoa a um bot para que a mesa não fique parada."
        ]
      },
      {
        "p": "O servidor é a autoridade: ele roda o mesmo motor de regras e rejeita qualquer coisa que não seja a sua jogada, então ninguém consegue agir fora de turno."
      }
    ]
  },
  {
    "id": "quickref",
    "title": "Referência rápida",
    "blocks": [
      {
        "table": {
          "head": [
            "",
            ""
          ],
          "rows": [
            [
              "Duração da partida",
              "12 trimestres (3 anos de 4), ou até alguém fundar uma 2ª Megacorporação"
            ],
            [
              "Jogadores",
              "2 a 6"
            ],
            [
              "Trabalhadores",
              "2 para cada um, ou 3 para cada um em uma partida de dois jogadores"
            ],
            [
              "Discos",
              "12, cobrindo lotes em sua posse + empresas ativas + empréstimos não quitados"
            ],
            [
              "Espaços de empresa",
              "5, contando a sede da Megacorporação"
            ],
            [
              "Limite de mão",
              "5 Projetos"
            ],
            [
              "Empréstimo",
              "+$20 e um disco; recompre por $30 / $35 / $40 nos fins de ano; -5 EP se não for quitado"
            ],
            [
              "Vender um Projeto",
              "$4 / $8 / $12 conforme o nível; $2 / $4 / $6 em venda forçada"
            ],
            [
              "Vender uma empresa",
              "metade do custo inicial, ou o custo inicial cheio se ela estiver expandida; pela metade de novo em venda forçada"
            ],
            [
              "Valor do lote",
              "preço da via (1-6) + $1 por vizinho ocupado + $1 se encostar em um Centro Logístico"
            ],
            [
              "Expansão",
              "pague o custo inicial de novo; produção e OPEX dobram; nível +1"
            ],
            [
              "Aluguel",
              "$2 por nível da empresa, para os donos dos lotes que ela ocupa"
            ],
            [
              "Produção não vendida",
              "$1 por unidade"
            ],
            [
              "Fundo do setor",
              "dividido igualmente entre as empresas ativas daquele setor; a sobra fica para o trimestre seguinte"
            ],
            [
              "Reforma",
              "a carta precisa ter o mesmo nível da estrutura; do nível 2 em diante, também o mesmo tipo de expansão"
            ],
            [
              "Empate final",
              "mais empresas ativas, depois mais dinheiro, depois menos discos de empréstimo no banco"
            ],
            [
              "Linhas 3-4 da demanda",
              "fechadas até o Trimestre 5"
            ],
            [
              "Grade de demanda",
              "zerada no fim do Trimestre 8"
            ],
            [
              "Pontuação de empresas",
              "2 EP por nível, no instante em que ela é construída - e de novo quando é expandida"
            ],
            [
              "Estreia em um setor",
              "3 EP na primeira vez que você constrói em cada setor, creditados de imediato"
            ],
            [
              "Prêmios de terras",
              "5 EP para quem liderar isoladamente em lotes, e em distritos, a cada fim de ano - 10 com 4+ jogadores"
            ],
            [
              "Centro Logístico",
              "um por trimestre, em um lote vazio sem dono; alcança o próprio distrito; conecta-se ortogonalmente"
            ]
          ]
        }
      }
    ]
  },
  {
    "id": "glossary",
    "title": "As palavras do tabuleiro",
    "blocks": [
      {
        "p": "Quase todo termo deste jogo é um termo real, usado do jeito que uma empresa de verdade o usa. Isso não é enfeite. Quem aprende aqui o que significa OPEX sabe o que a palavra significa em um balanço, e quem já sabe consegue ler metade das regras no vocabulário antes de alguém explicar."
      },
      {
        "h": "As quatro trilhas de ação"
      },
      {
        "table": {
          "head": [
            "Termo",
            "Significado, e uso em jogo"
          ],
          "rows": [
            [
              "M&A",
              "Mergers and Acquisitions, ou fusões e aquisições - a área que compra, constrói e combina empresas. No jogo: onde você funda uma empresa, compra terreno ou retoma do banco um prédio em dificuldade."
            ],
            [
              "P&D",
              "Pesquisa e Desenvolvimento - gastar agora para ter capacidade depois. No jogo: compre cartas de Projeto, ou expanda uma empresa que você já tem. Nada nesta trilha paga neste trimestre."
            ],
            [
              "Captar Recursos",
              "Procurar credores ou investidores em busca de dinheiro, a troco de juros ou de uma fatia da empresa. No jogo: pegue um empréstimo de $20 contra um disco, ou venda um ativo para fazer caixa."
            ],
            [
              "Reunião do Conselho",
              "Onde quem decide são os donos, não os gestores - reestruturações, aberturas de capital, quem preside a mesa. No jogo: abra capital para formar uma Megacorporação, ou reposicione-se como primeiro na ordem de turno. Seus trabalhadores vão para cá juntos."
            ]
          ]
        }
      },
      {
        "h": "Dinheiro que entra e dinheiro que sai"
      },
      {
        "table": {
          "head": [
            "Termo",
            "Significado, e uso em jogo"
          ],
          "rows": [
            [
              "OPEX",
              "Operating expenditure, a despesa operacional - o custo recorrente de manter o que você já tem. Salários, energia, estoque: as coisas que voltam a ser cobradas no mês seguinte, tendo você vendido algo ou não. No jogo: o custo de operação impresso em cada Projeto, cobrado todo trimestre - $2 por nível vão como aluguel do terreno ao proprietário do lote, e o resto é a conta de fornecedores, paga aos setores que a carta lista."
            ],
            [
              "Custo inicial",
              "Capital expenditure, ou CAPEX - o que custa erguer a coisa em primeiro lugar, pago uma única vez. No jogo: o preço impresso no Projeto, pago de novo por inteiro para expandir."
            ],
            [
              "Aluguel do terreno",
              "O que um inquilino paga ao dono da terra por ocupá-la, venda ele muito ou nada. No jogo: $2 por nível da empresa, para quem for dono de cada lote que ela ocupa. Nada em terreno que seja seu."
            ],
            [
              "Liquidez",
              "Ter dinheiro à mão, em oposição à riqueza presa em coisas que você teria de vender. No jogo: a razão pela qual um tabuleiro cheio de prédios ainda pode fazer você perder a partida - as contas se pagam em dinheiro, não em ativos."
            ],
            [
              "Solvência",
              "Conseguir pagar as dívidas no vencimento; não conseguir é a insolvência. No jogo: quando você não cobre a conta de uma empresa, o banco vende seus ativos por você pela metade do preço e essa empresa vai para o tabuleiro em dificuldade."
            ],
            [
              "Liquidação",
              "Vender os ativos, em geral sob pressão e em geral abaixo do que valem. No jogo: a própria venda forçada - tudo sai pela metade do que uma venda planejada renderia."
            ]
          ]
        }
      },
      {
        "h": "As empresas e o que acontece com elas"
      },
      {
        "table": {
          "head": [
            "Termo",
            "Significado, e uso em jogo"
          ],
          "rows": [
            [
              "Projeto",
              "Uma especificação técnica - a coisa que você de fato construiria. No jogo: uma carta, com seu setor, nível, custo inicial, OPEX, fornecedores e produção."
            ],
            [
              "Portfólio",
              "Tudo o que um dono possui, visto em conjunto e não um item de cada vez. No jogo: as empresas que você construiu. Cinco espaços, seis se você ficar com a ficha de IPO."
            ],
            [
              "Ativo em Dificuldade",
              "Uma empresa em apuros, vendida barato por um credor que quer sair mais do que quer um preço justo. No jogo: uma empresa que o banco segura depois de uma insolvência ou de uma fusão. Qualquer um pode retomá-la pelo que o banco pagou."
            ],
            [
              "IPO",
              "Initial Public Offering, a oferta pública inicial - a primeira venda de ações de uma empresa ao público, um evento único que muda o que a empresa é. No jogo: abrir capital antes de todo mundo garante a ficha de IPO e um sexto espaço de empresa. Só o primeiro jogador a fazer isso ganha uma."
            ],
            [
              "Megacorporação",
              "Um conglomerado: várias empresas fundidas sob uma holding. No jogo: realize a fusão na combinação exata de níveis de empresa que a ficha pede. Uma delas vira a sede; as demais ficam em dificuldade."
            ],
            [
              "Sede (HQ)",
              "A matriz - ela dirige e detém, não fabrica o produto. No jogo: a empresa fundida que deixa de operar, mas segue embolsando EP a partir do preço do seu setor a cada trimestre."
            ],
            [
              "Marca",
              "O nome em si como ativo, que rende independentemente do que as fábricas fizerem. No jogo: o que a sede de uma Megacorporação embolsa a cada trimestre - o preço do seu setor dividido pelo patamar da ficha."
            ]
          ]
        }
      },
      {
        "h": "O mercado"
      },
      {
        "table": {
          "head": [
            "Termo",
            "Significado, e uso em jogo"
          ],
          "rows": [
            [
              "Cadeia de suprimentos",
              "A fila de empresas em que cada uma compra da anterior, até chegar ao cliente. No jogo: vem impressa em todo Projeto. Seu OPEX é o seu lugar na cadeia de outra pessoa."
            ],
            [
              "B2B",
              "Business to business - vender para outras empresas, e não para o público. No jogo: a etapa de Receita em que os fundos dos setores são repartidos. Esse dinheiro veio das contas dos outros jogadores, não dos distritos."
            ],
            [
              "Fundo do setor",
              "Tudo o que um setor gasta, e que as empresas dele dividem entre si. No jogo: toda empresa de um setor recebe uma parte igual, seja qual for o seu tamanho. Fornecer a um setor em que ninguém construiu é muito lucrativo."
            ],
            [
              "Demanda",
              "O que o mercado vai de fato comprar, a certo preço, agora. No jogo: os quadrados coloridos de cada distrito. Quem chega primeiro leva."
            ],
            [
              "Integração vertical",
              "Crescer passando a ser dono de mais trechos da sua própria cadeia de suprimentos - para cima, em um só lugar. No jogo: é assim que Varejo, Hotelaria e Saúde se expandem, empilhando o novo nível em um lote que a empresa já ocupa."
            ],
            [
              "Integração horizontal",
              "Crescer tomando mais terreno no mesmo estágio - para os lados, em vários lugares. No jogo: é assim que Serviços Públicos, Manufatura e Tecnologia se expandem; cada novo nível exige um lote seu vazio ao lado do prédio."
            ],
            [
              "Centro Logístico",
              "Um centro de distribuição - movimenta mercadorias em vez de fabricá-las. No jogo: abre em um lote vazio sem dono a cada trimestre e amplia o alcance das empresas ao seu lado."
            ]
          ]
        }
      },
      {
        "h": "Tempo e pontuação"
      },
      {
        "table": {
          "head": [
            "Termo",
            "Significado, e uso em jogo"
          ],
          "rows": [
            [
              "Ano fiscal",
              "Os doze meses sobre os quais uma empresa presta contas, que não precisam coincidir com o calendário. No jogo: são três, de quatro trimestres cada. As contas são acertadas no fim de cada ano."
            ],
            [
              "Trimestre",
              "Um período de três meses de prestação de contas; empresas de capital aberto divulgam resultados quatro vezes por ano. No jogo: uma rodada - planejar, agir, produzir, vender, encerrar."
            ],
            [
              "EP",
              "Não é um termo real - é a pontuação do próprio jogo. Pontos de Empreendedorismo: prédios, estreias em setores, Megacorporações, terras e o dinheiro que sobrou, tudo se converte neles."
            ]
          ]
        }
      },
      {
        "note": "O jargão é estrutural, não é tempero. Playtesters que nunca tinham jogado um jogo econômico pesado sabiam mais ou menos o que eram P&D e uma cadeia de suprimentos, e esse conhecimento fez trabalho de verdade no ensino - eles adivinharam o que as trilhas faziam antes de as trilhas serem explicadas. Vale nomear o único ponto em que o jogo se afasta do uso real: aqui OPEX é o custo de operação impresso de uma empresa, dividido na mesa entre conta de fornecedores e aluguel do terreno, e o jogo nunca cobra salários ou estoque além disso. Quem é da área financeira vai ler a palavra num sentido mais amplo do que o jogo quer dizer. A troca foi deliberada - separar os dois pagamentos é o que permitiu à mesa parar de fazer contas no meio do trimestre - mas é o termo que mais tende a exigir uma segunda frase na hora de ensinar."
      },
      {
        "note": "Integração vertical e horizontal são os verbetes que mais merecem uma segunda leitura. Elas são a distinção de verdade - Carnegie comprando as próprias minas de carvão contra uma rede abrindo mais lojas - e são também a maior questão de equilíbrio ainda em aberto do jogo. Uma empresa horizontal chega ao nível 4 em 3 por cento das partidas, e uma vertical, em 22, porque uma expansão horizontal exige um terreno seu vazio ao lado do prédio e o tabuleiro acaba ficando sem. O vocabulário é honesto; os números por trás dele ainda não estão parelhos."
      },
      {
        "note": "Duas colunas, não três. O formato óbvio é termo / significado real / significado no jogo, e funciona bem no papel - mas a terceira coluna é a que importa na mesa, e era justamente ela que ficava cortada na lateral do celular. Juntar as duas metades em uma só célula preserva o par e sobrevive a uma tela de 390px."
      }
    ]
  },
  {
    "id": "blueprints",
    "title": "Anexo: os sessenta Projetos",
    "blocks": [
      {
        "p": "Todas as cartas do jogo, por setor. CUSTO INICIAL é o que custa construir, e de novo para expandir. OPEX é o custo de operação impresso na carta: $2 por nível vão como aluguel do terreno para quem for dono do terreno, e o resto é a conta de fornecedores, dividida entre os fornecedores na proporção das partes indicadas abaixo. PRODUÇÃO é quantas unidades ela produz por trimestre, e dobra na expansão junto com o OPEX."
      },
      {
        "note": "Este anexo é gerado a partir dos próprios dados das cartas e conferido contra eles célula a célula em check_rulebook.mjs, de modo que nenhuma carta pode ser rebalanceada sem que o livro acompanhe. É a única parte do livro que ninguém deveria jamais editar à mão."
      },
      {
        "h": "Serviços Públicos (UT) - preço base $4, expande horizontalmente"
      },
      {
        "table": {
          "head": [
            "Projeto UT",
            "Nív",
            "Custo inicial / OPEX / Produção",
            "Fornecedores (parte da conta)"
          ],
          "rows": [
            [
              "Solar Field I",
              "1",
              "15 / 4 / 4",
              "HO 4"
            ],
            [
              "Hydro-Farm Initiative I",
              "1",
              "15 / 4 / 4",
              "HO 4"
            ],
            [
              "Wind Farm I",
              "1",
              "15 / 4 / 4",
              "TE 4"
            ],
            [
              "Biomass Plant I",
              "1",
              "15 / 4 / 4",
              "TE 4"
            ],
            [
              "Tidal Generator I",
              "1",
              "15 / 4 / 4",
              "HC 4"
            ],
            [
              "Fusion Conduit Hub II",
              "2",
              "20 / 7 / 8",
              "HO 4, TE 3"
            ],
            [
              "Smart Grid Node II",
              "2",
              "20 / 7 / 8",
              "HO 4, HC 3"
            ],
            [
              "Oceanic Turbine II",
              "2",
              "20 / 7 / 8",
              "TE 4, HC 3"
            ],
            [
              "Geothermal Supernode III",
              "3",
              "30 / 10 / 16",
              "HO 4, TE 3, HC 3"
            ],
            [
              "Antimatter Reactor III",
              "3",
              "30 / 10 / 16",
              "HO 4, TE 3, HC 3"
            ]
          ]
        }
      },
      {
        "h": "Varejo (RE) - preço base $4, expande verticalmente"
      },
      {
        "table": {
          "head": [
            "Projeto RE",
            "Nív",
            "Custo inicial / OPEX / Produção",
            "Fornecedores (parte da conta)"
          ],
          "rows": [
            [
              "Corner Store I",
              "1",
              "10 / 5 / 4",
              "TE 5"
            ],
            [
              "Pop-Up Kiosk I",
              "1",
              "10 / 5 / 4",
              "TE 5"
            ],
            [
              "Local Market I",
              "1",
              "10 / 5 / 4",
              "HO 5"
            ],
            [
              "Strip Mall I",
              "1",
              "10 / 5 / 4",
              "HO 5"
            ],
            [
              "Vending Network I",
              "1",
              "10 / 5 / 4",
              "MA 5"
            ],
            [
              "Supermarket II",
              "2",
              "15 / 9 / 8",
              "TE 5, HO 4"
            ],
            [
              "Department Store II",
              "2",
              "15 / 9 / 8",
              "TE 5, MA 4"
            ],
            [
              "Outlet Center II",
              "2",
              "15 / 9 / 8",
              "HO 5, MA 4"
            ],
            [
              "Mega-Mall III",
              "3",
              "25 / 14 / 16",
              "TE 6, HO 4, MA 4"
            ],
            [
              "Omni-Channel Hub III",
              "3",
              "25 / 14 / 16",
              "TE 6, HO 4, MA 4"
            ]
          ]
        }
      },
      {
        "h": "Hotelaria (HO) - preço base $5, expande verticalmente"
      },
      {
        "table": {
          "head": [
            "Projeto HO",
            "Nív",
            "Custo inicial / OPEX / Produção",
            "Fornecedores (parte da conta)"
          ],
          "rows": [
            [
              "Motel I",
              "1",
              "10 / 6 / 3",
              "MA 6"
            ],
            [
              "Bed & Breakfast I",
              "1",
              "10 / 6 / 3",
              "MA 6"
            ],
            [
              "Transit Hostel I",
              "1",
              "10 / 6 / 3",
              "HC 6"
            ],
            [
              "Roadside Inn I",
              "1",
              "10 / 6 / 3",
              "HC 6"
            ],
            [
              "Capsule Hotel I",
              "1",
              "10 / 6 / 3",
              "RE 6"
            ],
            [
              "Business Hotel II",
              "2",
              "15 / 10 / 6",
              "MA 6, HC 4"
            ],
            [
              "Resort Lodge II",
              "2",
              "15 / 10 / 6",
              "MA 6, RE 4"
            ],
            [
              "Boutique Hotel II",
              "2",
              "15 / 10 / 6",
              "HC 6, RE 4"
            ],
            [
              "Luxury Casino III",
              "3",
              "25 / 16 / 12",
              "MA 6, HC 5, RE 5"
            ],
            [
              "Orbit Resort III",
              "3",
              "25 / 16 / 12",
              "MA 6, HC 5, RE 5"
            ]
          ]
        }
      },
      {
        "h": "Manufatura (MA) - preço base $5, expande horizontalmente"
      },
      {
        "table": {
          "head": [
            "Projeto MA",
            "Nív",
            "Custo inicial / OPEX / Produção",
            "Fornecedores (parte da conta)"
          ],
          "rows": [
            [
              "Assembly Workshop I",
              "1",
              "20 / 4 / 3",
              "HC 4"
            ],
            [
              "Parts Fabricator I",
              "1",
              "20 / 4 / 3",
              "HC 4"
            ],
            [
              "Textile Mill I",
              "1",
              "20 / 4 / 3",
              "RE 4"
            ],
            [
              "Canning Facility I",
              "1",
              "20 / 4 / 3",
              "RE 4"
            ],
            [
              "Injection Molder I",
              "1",
              "20 / 4 / 3",
              "UT 4"
            ],
            [
              "Auto Plant II",
              "2",
              "35 / 7 / 6",
              "HC 4, RE 3"
            ],
            [
              "Microchip Foundry II",
              "2",
              "35 / 7 / 6",
              "HC 4, UT 3"
            ],
            [
              "Chemical Plant II",
              "2",
              "35 / 7 / 6",
              "RE 4, UT 3"
            ],
            [
              "Heavy Robotics III",
              "3",
              "60 / 10 / 12",
              "HC 4, RE 3, UT 3"
            ],
            [
              "Orbital Shipyard III",
              "3",
              "60 / 10 / 12",
              "HC 4, RE 3, UT 3"
            ]
          ]
        }
      },
      {
        "h": "Saúde (HC) - preço base $6, expande verticalmente"
      },
      {
        "table": {
          "head": [
            "Projeto HC",
            "Nív",
            "Custo inicial / OPEX / Produção",
            "Fornecedores (parte da conta)"
          ],
          "rows": [
            [
              "Urgent Care Clinic I",
              "1",
              "20 / 5 / 2",
              "RE 5"
            ],
            [
              "Pharmacy I",
              "1",
              "20 / 5 / 2",
              "RE 5"
            ],
            [
              "Dental Office I",
              "1",
              "20 / 5 / 2",
              "UT 5"
            ],
            [
              "Wellness Center I",
              "1",
              "20 / 5 / 2",
              "UT 5"
            ],
            [
              "Physical Therapy I",
              "1",
              "20 / 5 / 2",
              "TE 5"
            ],
            [
              "General Hospital II",
              "2",
              "35 / 9 / 4",
              "RE 5, UT 4"
            ],
            [
              "Trauma Center II",
              "2",
              "35 / 9 / 4",
              "RE 5, TE 4"
            ],
            [
              "Specialized Clinic II",
              "2",
              "35 / 9 / 4",
              "UT 5, TE 4"
            ],
            [
              "Biotech Campus III",
              "3",
              "60 / 14 / 8",
              "RE 6, UT 4, TE 4"
            ],
            [
              "Cybernetics Inst. III",
              "3",
              "60 / 14 / 8",
              "RE 6, UT 4, TE 4"
            ]
          ]
        }
      },
      {
        "h": "Tecnologia (TE) - preço base $6, expande horizontalmente"
      },
      {
        "table": {
          "head": [
            "Projeto TE",
            "Nív",
            "Custo inicial / OPEX / Produção",
            "Fornecedores (parte da conta)"
          ],
          "rows": [
            [
              "App Startup I",
              "1",
              "15 / 6 / 2",
              "UT 6"
            ],
            [
              "Data Center I",
              "1",
              "15 / 6 / 2",
              "UT 6"
            ],
            [
              "Server Farm I",
              "1",
              "15 / 6 / 2",
              "MA 6"
            ],
            [
              "IT Support Firm I",
              "1",
              "15 / 6 / 2",
              "MA 6"
            ],
            [
              "Cloud Provider I",
              "1",
              "15 / 6 / 2",
              "HO 6"
            ],
            [
              "Software Campus II",
              "2",
              "25 / 10 / 4",
              "UT 6, MA 4"
            ],
            [
              "Network Hub II",
              "2",
              "25 / 10 / 4",
              "UT 6, HO 4"
            ],
            [
              "Telecom Provider II",
              "2",
              "25 / 10 / 4",
              "MA 6, HO 4"
            ],
            [
              "Sentient AI Cluster III",
              "3",
              "40 / 16 / 8",
              "UT 6, MA 5, HO 5"
            ],
            [
              "Quantum Computing III",
              "3",
              "40 / 16 / 8",
              "UT 6, MA 5, HO 5"
            ]
          ]
        }
      }
    ]
  }
];
