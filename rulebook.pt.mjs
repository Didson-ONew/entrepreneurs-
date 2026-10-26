/* ============================================================================
   ENTREPRENEURS - o manual, em portugues do Brasil.

   Traducao de rulebook.data.mjs, secao por secao, com a MESMA ESTRUTURA: os
   mesmos ids, os mesmos blocos na mesma ordem, as mesmas tabelas com as mesmas
   dimensoes. Isso nao e estilo, e o que permite checar as duas versoes uma
   contra a outra: check_rulebook_i18n.mjs compara forma e numeros e falha se
   alguem mexer em um lado so.

   O ingles continua sendo a fonte das REGRAS. Quando uma regra muda, muda la,
   e esta traducao e refeita - nunca o contrario.

   Nomes de cartas de Projeto e de fichas de Megacorporacao sao traduzidos, carta
   por carta, com os mesmos nomes que o jogo usa em i18n.pt.js: numa edicao
   brasileira e isso que estaria impresso no componente.
   ========================================================================== */

export const EDITION_PT = "Manual v22";

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
        "p": "Uma reforma tem que caber no NÍVEL da carcaça, e em mais nada. Qualquer Projeto do mesmo nível reforma qualquer estrutura em dificuldade, seja qual for o setor que ela era e a forma em que está de pé - um lote empilhado pode virar a empresa de um setor que se espalha, e uma fileira de lotes a de um setor que empilha. A empresa fica com a área da carcaça exatamente como está, paga aluguel e conta para os prêmios de terras em cada lote dela, e cresce dali na direção do próprio setor."
      },
      {
        "note": "Medido em 300 partidas por número de jogadores: as reformas sobem 43%, cerca de um híbrido por partida se forma, e o ganho cai nos setores horizontais - as reformas para Serviços Públicos quase dobram, e para Tecnologia também - porque a carcaça comum é um lote empilhado, e uma carta horizontal agora pode ocupá-lo sem precisar achar dois ou três lotes vizinhos. Os setores verticais ficam com mais EP em 66.7% das partidas de três jogadores, contra 69.8%."
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
        "p": "O valor de um lote é o preço de via impresso nele mais $3 por estrutura que esteja sobre ele ou o toque ortogonalmente - cinco casas ao todo, o lote e seus quatro vizinhos, cantos nunca contando. Um Centro Logístico é uma estrutura como qualquer outra: ele fica sobre um lote e o ocupa para sempre. Os preços de via vão de 1 na borda externa a 6 bem no centro da cidade. Você paga esse valor para comprar e o recebe ao vender - então terreno perto da ação de fato se valoriza conforme a cidade se preenche, e o chão debaixo de uma empresa em funcionamento é o mais caro de todos."
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
              "15 / 6 / 3",
              "20 / 11 / 6",
              "30 / 15 / 12"
            ],
            [
              "Varejo (RE)",
              "15 / 10 / 4",
              "25 / 18 / 8",
              "40 / 28 / 16"
            ],
            [
              "Hotelaria (HO)",
              "10 / 6 / 2",
              "15 / 10 / 4",
              "25 / 16 / 8"
            ],
            [
              "Manufatura (MA)",
              "20 / 8 / 4",
              "35 / 14 / 8",
              "60 / 20 / 16"
            ],
            [
              "Saúde (HC)",
              "20 / 10 / 3",
              "35 / 18 / 6",
              "60 / 28 / 12"
            ],
            [
              "Tecnologia (TE)",
              "10 / 8 / 2",
              "15 / 13 / 4",
              "25 / 21 / 8"
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
        "p": "Um ícone não se esgota quando você vende para ele. Todo ícone fica aberto para toda empresa em todo trimestre, e uma empresa vende uma unidade em cada ícone que alcança - então o que você vende depende de onde você está e do seu tamanho, nunca de quem chegou primeiro. Tudo o que você não conseguir colocar é reciclado por $1 a unidade."
      },
      {
        "p": "A entrega passa pela mesa na ordem de turno, mas nada depende da ordem: ninguém pode tirar um ícone de você. Todas as empresas podem resolver suas vendas ao mesmo tempo, se a mesa preferir."
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
          "Um ícone volta a ficar aberto no trimestre seguinte, para todos. Nada é limpo e nada precisa ser marcado entre um trimestre e outro.",
          "UM ÍCONE RECEBE UMA UNIDADE por trimestre de cada empresa que o alcança. Uma empresa de nível 3 que alcança as colunas 1, 2 e 3 vende, portanto, 3 unidades numa linha do seu setor, todo trimestre - Tecnologia vende duas por coluna, 6 na mesma linha.",
          "Uma empresa pode vender em cada ícone que alcança uma vez por trimestre; duas empresas que alcançam o mesmo ícone vendem as duas nele. Um setor lotado é precificado pela trilha de preços, não racionado pela grade.",
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
              "Uma rede é o seu nível em lojas: o próprio lote e uma FILIAL para cada nível acima do primeiro, cada uma num lote que alguém já possui, cada uma num distrito que a rede alcança. Ela vende em todo distrito onde está. Nunca usa centros."
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
              "Todo ícone em que ela vende recebe 2 unidades em vez de 1, e paga pelas duas."
            ]
          ]
        }
      },
      {
        "h": "Filiais do Varejo"
      },
      {
        "p": "O Varejo não alcança mais longe por declaração. Ele ABRE LOJAS: uma rede é o seu nível em lojas, contando o lote de origem, então uma rede de nível 3 é a sua sede e duas filiais, em três distritos. Cada filial ocupa um lote próprio, e a empresa vende em todos os distritos onde está como se estivesse ali."
      },
      {
        "ul": [
          "Uma filial só pode abrir num lote que ALGUÉM JÁ POSSUI - você ou um rival - e o lote precisa estar vazio. Ela não toma o terreno: a escritura continua com o dono.",
          "Uma filial no lote de outra pessoa paga a ela $2 de aluguel de terreno por trimestre, exatamente como um prédio sobre o terreno dela.",
          "Cada filial deve abrir num distrito ortogonalmente vizinho a um que a rede já cobre, contando o lote da própria empresa e as filiais existentes. A rede se liga; ela não salta.",
          "Uma filial consome uma ficha, como tudo que você põe no tabuleiro, e ninguém pode construir no lote dela enquanto estiver de pé.",
          "Venda, funda ou perca a empresa e as lojas caem. O terreno fica com quem era dono."
        ]
      },
      {
        "note": "A filial tomava terreno livre de graça - ela olhava só para lotes que ninguém possuía e se escrevia como dona, então o preço inteiro era uma ficha, enquanto o mesmo lote comprado custa dinheiro E uma ficha. O Varejo escalava seu alcance de graça enquanto todo outro setor pagava pelo terreno, e isso aparecia: o Varejo decidia 26% das partidas com três jogadores e levava a maior fatia dos prêmios de terras quando estes passaram a pagar por terreno construído. Exigir que o terreno já tenha dono derruba isso para 21.4% e põe o prêmio de terras do Varejo em linha com Serviços Públicos e Indústria, e ainda assim as filiais abrem 1.68 por partida. Cobrar pelo lote em vez de restringi-lo também foi medido e quase não faz nada. O que importa é ONDE uma filial pode abrir, não quanto custa."
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
        "p": "UM POTE SEM NINGUÉM A QUEM PAGAR FICA. Se um setor não tem nenhuma empresa ativa quando seu pote é distribuído, o pote inteiro espera - e continua crescendo - até alguém abrir uma empresa ali. A primeira empresa a entrar leva tudo o que acumulou, sozinha."
      },
      {
        "note": "A v21 descartava o dinheiro daquele trimestre; a v22 trouxe o acúmulo de volta por escolha do designer, porque um mercado que visivelmente espera alguém atendê-lo é a leitura temática. O preço é conhecido e medido: em 400 partidas por número de jogadores o pote à espera chega a $355, e a primeira empresa a entrar já abocanhou até $342, numa média de $31 a $67 por abocanhada. Descartar, em vez disso, reduz isso a $76 e $66, e faz um setor que ninguém quer ser aberto um pouco menos vezes."
      },
      {
        "p": "Vale ler isso duas vezes ao planejar uma construção. Um setor em que ninguém está pode estar sentado sobre um pote que paga a empresa que você abrir ali."
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
          "O Magnata Imobiliário e O Onipresente são concedidos - 4 EP mais o número de jogadores, só ao líder isolado, ou seja 6 EP com duas cadeiras subindo até 10 com seis. Eles também são pagos no trimestre final se a partida for encerrada antes do Q12.",
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
        "p": "Não há nada retido nem nada para controlar nas cartas: todo EP que você ganhou está embolsado, e a classificação é a pontuação. Você nunca perde EP que já pontuou - nem quando uma empresa é vendida, nem quando ela entra em dificuldade, nem quando é fundida em uma Megacorporação. Uma carcaça RETOMADA como está não pontua de novo - nem para quem a vendeu, nem para um rival que a compre do banco - porque os níveis dela já foram pagos quando foram construídos. REFORMAR uma carcaça sim pontua, porque isso é uma empresa nova abrindo em um prédio velho. Em qualquer dos casos, a sua primeira empresa em um setor ainda paga o bônus de entrada."
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
          "Todas as outras vão para o banco como Ativos em Dificuldade - as lojas delas caem - e qualquer um pode assumi-las depois.",
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
              "Consórcio Local",
              "3 x L1",
              "3",
              "8 EP"
            ],
            [
              "Pacto dos Fundadores",
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
              "Gêmeas Participações",
              "1 x L1 + 2 x L2",
              "3",
              "10 EP"
            ],
            [
              "Fusão Silenciosa",
              "3 x L2",
              "3",
              "11 EP"
            ],
            [
              "Vizinhança Holdings",
              "3 x L1 + 1 x L2",
              "4",
              "12 EP"
            ],
            [
              "Consolidada Regional",
              "2 x L2 + 1 x L3",
              "3",
              "13 EP"
            ],
            [
              "Aliança Urbana",
              "2 x L1 + 2 x L2",
              "4",
              "13 EP"
            ],
            [
              "Grupo Metropolitano",
              "1 x L2 + 2 x L3",
              "3",
              "14 EP"
            ],
            [
              "Acordo da Encruzilhada",
              "1 x L1 + 3 x L2",
              "4",
              "14 EP"
            ],
            [
              "Skyline Consolidada",
              "3 x L3",
              "3",
              "15 EP"
            ],
            [
              "Grupo Apex",
              "2 x L2 + 2 x L3",
              "4",
              "16 EP"
            ],
            [
              "Indústrias Titan",
              "2 x L3 + 1 x L4",
              "3",
              "17 EP"
            ],
            [
              "Grupo Colosso",
              "4 x L3",
              "4",
              "19 EP"
            ],
            [
              "Império Holdings",
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
              "Consórcio Local, Pacto dos Fundadores, Continental Holdings, Gêmeas Participações",
              "2 jogadores",
              "0 EP",
              "1 EP"
            ],
            [
              "3",
              "Fusão Silenciosa, Vizinhança Holdings, Consolidada Regional, Aliança Urbana",
              "2 jogadores",
              "1 EP",
              "2 EP"
            ],
            [
              "2",
              "Grupo Metropolitano, Acordo da Encruzilhada, Skyline Consolidada, Grupo Apex",
              "3 jogadores",
              "1 EP",
              "3 EP"
            ],
            [
              "1",
              "Indústrias Titan, Grupo Colosso, Império Holdings, Omnicorp",
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
        "note": "Antes dos patamares, um Consórcio Local montado com três empresas de nível 1 ganhava por trimestre exatamente o mesmo que um Omnicorp montado com quatro de nível 3, e a Megacorporação havia crescido até 33% de uma pontuação vencedora - o maior bloco isolado do jogo, à frente das empresas. Dividir o EP de marca pelo patamar cortou isso pela metade, para 17%, e baixou a vantagem do vencedor sobre o último de 58.6 EP para 48.7, sem tornar a fusão em si mais rara. A regra de sorteio quase não pesa com quatro jogadores, onde oito fichas aleatórias de dezesseis já dão em média duas por patamar; ela se paga com dois, onde tirou da caixa as fichas impossíveis de reivindicar e as Megacorporações formadas subiram de 1.00 por partida para 1.26."
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
              "+4 mais o número de jogadores, só ao líder isolado"
            ],
            [
              "O Onipresente - mais distritos em que você está presente, a cada fim de ano",
              "+4 mais o número de jogadores, só ao líder isolado"
            ],
            [
              "Dinheiro em caixa no fim",
              "+1 a cada $100 completos"
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
        "note": "Antes contavam as escrituras, e as escrituras não são o ponto. Medido, 78% de todo o EP de prêmios de terras ia para terreno sem nada em cima - os prêmios viraram dividendo de especulação em vez de corrida para desenvolver a cidade. Contar terreno construído devolve de 6 a 9 pontos de partidas a Serviços Públicos, Indústria e Tecnologia em qualquer número de jogadores, e o terreno vazio agora ganha $0.2 de um prêmio de $40 em vez de $31.9. Vale pouco sozinho e muito junto com a regra das filiais e as cartas reequilibradas: separadamente dão 8.8 e 1.8 pontos, juntos 15.4."
      },
      {
        "p": "O aluguel do terreno é simplesmente dinheiro. Ele é recebido conforme é gerado e pontua dentro do seu caixa no fim, como qualquer outro dólar - não há nada separado para controlar. O que vale saber é quanto da sua renda ele silenciosamente se torna: um lote com a construção de outra pessoa em cima paga você todo trimestre, e com seis jogadores metade dos lotes que um jogador possui carrega a construção de um rival."
      },
      {
        "note": "Esse número já mudou duas vezes, nas duas por causa de mudanças nas regras de preço. Era $10 até a trilha de preços entrar; a trilha deixou a economia maior, e pontuar isso na taxa antiga dobrou a linha do dinheiro, de cerca de um terço de uma pontuação vencedora para cerca de metade, de modo que não gastar rendia mais do que construir. $20 corrigiu isso. Aumentar toda base em $2 e fazer cada evento valer um dólar inteiro provocou a mesma coisa de novo, em escala maior - a arrecadação sobe 83% - e $50 corrige de novo: medida ao longo de 2250 partidas, a pontuação vencedora fica a 2% de onde estava, ao passo que deixar a taxa em $20 a teria inflado em 44%. Uma taxa que só acompanhasse o dinheiro seria $37; $50 está certo porque os bots também precificam cada decisão por meio desse número, então uma taxa mais alta também faz construir valer mais do que guardar. Veja audit_base_plus_two.js. Se as regras de preço mudarem de novo, esse número muda junto - são um único ajuste em dois lugares. A v22 dobrou de novo, para $100: com a demanda como fluxo o mesmo tabuleiro absorve mais e o dinheiro se acumula mais alto, e a leitura do designer é que dinheiro é o meio, não a pontuação."
      },
      {
        "note": "O aluguel chegou a ter sua própria linha de pontuação por um tempo, enquanto o equilíbrio das terras estava sendo investigado. Ele foi reincorporado ao caixa: a separação não mudou nenhum total, e pedir que a mesa mantenha uma contagem corrente de aluguel a partida inteira para dividir um número em duas metades que voltam a somá-lo é burocracia sem decisão. A versão digital ainda mostra o fluxo, onde isso não custa nada. Terras mais aluguel somam cerca de 27% de uma pontuação vencedora com dois assentos e 14% com seis - veja audit_idle_land.js."
      },
      {
        "p": "Apenas o líder isolado pontua uma premiação de terreno, e uma liderança compartilhada paga mal. A premiação é 4 EP MAIS O NÚMERO DE JOGADORES: 6 EP com duas cadeiras, 7 com três, 8 com quatro, 9 com cinco, 10 com seis. Um empate de dois paga 40% disso e três ou mais pagam 20%, então com quatro jogadores a escada é 8 sozinho, 3 para cada um em uma dupla, 2 para cada um além disso. O segundo lugar não recebe nada em nenhuma contagem."
      },
      {
        "note": "As duas premiações pagam um número fixo de vezes por partida - cerca de sete pagamentos ao longo dos três fins de ano, qualquer que seja a contagem - então o peso delas em uma pontuação vencedora é esse bolo dividido por uma pontuação que cresce com a mesa. Uma taxa fixa portanto encolhia conforme cadeiras eram somadas: terreno era 17% de uma pontuação vencedora com duas cadeiras e 3.5% com seis, e a 5 EP o jogador que segurava mais chão ganhava ABAIXO do que uma cadeira indiferente levaria. Perseguir terreno era uma armadilha. Dobrar a taxa a partir de quatro jogadores resolveu isso, e comprou um penhasco junto: 13% de uma pontuação vencedora com três jogadores e 27% com quatro, o que fazia de quatro cadeiras o jogo mais pesado em terreno que existia - a primeira contagem no bolo dobrado, com os menos rivais para dividi-lo. Escalar a premiação com a contagem remove o penhasco em vez de movê-lo: 22% com duas cadeiras, 21% com três, 19% com quatro, 18% com cinco, 17% com seis, caindo suavemente como deveria. Medido contra quatro outras escalas nas mesmas sementes, mantém o líder de terreno no nível do acaso ou acima dele em toda contagem e ASSENTA O JOGO MENOS que o degrau assentava - a taxa de vitória de quem lidera na metade cai de 64% para 46% com quatro cadeiras. Pagar um vice é pior que não pagar ninguém: metade a mais de EP, e o líder de terreno vence menos. Veja audit_land_threshold.js."
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
        "note": "AS DUAS PREOCUPAÇÕES QUE ESTA NOTA LEVANTAVA JÁ FORAM RESOLVIDAS por outras mudanças, e a nota fica na forma corrigida em vez de ser apagada, porque esses dois números são os primeiros a reconferir se a economia voltar a se mover. Ela dizia que O DINHEIRO EM CAIXA ERA CERCA DE UM TERÇO DE UMA PONTUAÇÃO VENCEDORA - muito peso para uma regra que soa como arredondar as sobras, e um sinal de que um jogador que simplesmente não gastava pontuava tanto quanto um que construía. Subir a taxa do dinheiro para $50 por EP cortou isso pela metade: remedido em 250 partidas por tamanho de mesa, são 16% dos pontos do vencedor em duas cadeiras, 15% em três e 13% em quatro, cinco e seis, e 12-15% considerando todas as cadeiras. Construir continua sendo a maior coisa isolada que um vencedor faz, com 31-39%. A nota também dizia que AS PREMIAÇÕES DE TERRENO ENCOLHIAM CONFORME A MESA CRESCIA, de 20% dos pontos do vencedor em duas cadeiras para 5% em seis; isso era verdade com um prêmio FIXO dividido entre mais pretendentes, e é por isso que o prêmio agora dobra a partir de quatro jogadores. Ele já não desaparece: 19% em duas cadeiras, 13% em três, 27% em quatro e 18% em cinco e em seis. Veja audit_state_of_play.js, que imprime as duas tabelas."
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
        "p": "As três primeiras soam como jogar do jeito antigo, porque é isso que elas são: regras que eram opcionais na v12 e viraram padrão na v13. O jogo para iniciantes é o oposto - não é uma versão antiga deste jogo, e sim um caminho mais curto para entrar nele, e tem uma seção própria mais abaixo."
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
              "Baralhos ordenados",
              "Cada baralho de setor vai do nível 1 no topo até o nível 3 no fundo, em vez de ser embaralhado por inteiro. Nenhum nível 3 pode ser draftado, e o início de partida não guarda surpresas."
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
        "note": "As três regras antigas continuam alternáveis para que as duas versões possam ser jogadas lado a lado, não porque estejam equilibradas em relação às novas. Outras duas foram removidas na v20 depois de vinte e seis partidas registradas em que ninguém ligou nenhuma das duas: centros logísticos na estrada, que obrigava toda regra de centro do jogo a responder por dois formatos, e níveis pontuam pesado, que pela própria descrição empurrava terras, dinheiro e os bônus de entrada para segundo plano."
      },
      {
        "note": "Centros logísticos em lotes são uma restrição de verdade: um quarto dos lotes do tabuleiro não tem nenhum vizinho ortogonal, então um centro mal colocado não conecta ninguém. É a regra funcionando como planejado - é por isso que o seletor de centros diz quantos lotes um ponto conectaria antes de você se comprometer com ele - mas é também a regra com maior chance de precisar de uma nova olhada depois de algumas mesas."
      }
    ]
  },
  {
    "id": "beginner",
    "title": "O jogo para iniciantes",
    "blocks": [
      {
        "p": "Um caminho mais curto para entrar, para uma mesa em que alguém nunca jogou. São dois anos em vez de três, e cada trilha fica com uma ação em vez de duas, então há quatro coisas a fazer em vez de oito. Tudo o que foi cortado é um subsistema que exige uma segunda explicação; nada do que foi cortado é o motor do jogo."
      },
      {
        "p": "O que fica é a parte que vale a pena aprender. Sua produção continua vendendo para os ícones de demanda, seus custos operacionais continuam caindo nos potes dos setores de que seu Projeto compra e sendo divididos entre quem tiver empresas lá, e toda construção continua empurrando o preço do próprio setor um dólar para baixo e o de cada fornecedor um para cima. Seu cliente continua sendo seu concorrente."
      },
      {
        "table": {
          "head": [
            "",
            "O jogo completo",
            "O jogo para iniciantes"
          ],
          "rows": [
            [
              "Duração",
              "12 trimestres, 3 anos",
              "8 trimestres, 2 anos"
            ],
            [
              "Captar Recursos",
              "EMPRÉSTIMO ou VENDER",
              "EMPRÉSTIMO"
            ],
            [
              "F&A",
              "COMPRAR ou LANÇAR",
              "LANÇAR"
            ],
            [
              "P&D",
              "PESQUISA ou MELHORAR",
              "PESQUISA"
            ],
            [
              "Reunião de Diretoria",
              "ABRIR CAPITAL ou REPOSICIONAR",
              "REPOSICIONAR"
            ],
            [
              "Megacorporações",
              "sim",
              "não"
            ],
            [
              "Jogadores",
              "2-6",
              "2-4"
            ],
            [
              "Personas",
              "uma para cada, seis existem",
              "uma para cada, quatro existem"
            ],
            [
              "Fichas",
              "12",
              "6"
            ],
            [
              "Terras",
              "compradas e vendidas",
              "tomadas de graça ao construir"
            ],
            [
              "Prêmios de terras",
              "mais lotes e mais distritos",
              "mais distritos"
            ],
            [
              "Alcance de demanda",
              "colunas até o seu nível",
              "uma coluna acima do seu nível"
            ]
          ]
        }
      },
      {
        "p": "CONSTRUIR TOMA O TERRENO. Não existe COMPRAR aqui, então a empresa fica com os lotes em que está, de graça, no momento em que é construída. A ficha dela cobre toda a área, quantos lotes forem - e é isso que faz valer a pena draftar um setor horizontal, já que uma única ficha pode te colocar em vários distritos ao mesmo tempo, e distrito é a única terra que pontua."
      },
      {
        "p": "SEIS FICHAS, e cinco vagas de empresa. Cinco fichas são um quadro cheio de empresas, então a sexta é toda a sua folga: pegue um empréstimo e você está no limite, pegue dois e abriu mão de uma empresa. Essa é a economia inteira do modo."
      },
      {
        "p": "UMA EMPRESA ALCANÇA UMA COLUNA ACIMA DO SEU NÍVEL. Uma empresa de nível 1 alcança as colunas 1 e 2, uma de nível 2 alcança de 1 a 3, uma de nível 3 alcança todas as quatro. Sem isso, uma empresa de nível 1 só conseguiria vender para o ícone de nível 1 e, como aqui nada é melhorado, jogaria fora quase tudo o que produz."
      },
      {
        "p": "OS NÍVEIS CONTINUAM EXISTINDO mesmo sem melhorias. PESQUISA compra a carta do topo de um baralho, e os baralhos são embaralhados por inteiro, então uma carta de nível 2 ou nível 3 pode ser comprada e construída direto. É assim que se consegue uma empresa maior, e é o único jeito de alcançar a quarta coluna de demanda."
      },
      {
        "p": "QUATRO PERSONAS, E QUATRO LUGARES. Os seis setores estão todos aqui e jogam exatamente como no jogo completo, mas só quatro das seis personas são distribuídas. O Arquiteto de Sistemas e o Desenvolvedor de Resorts mudam como você MELHORA empresas, e aqui nada é melhorado, então quem pegasse uma das duas teria uma especialidade que nunca aparece. As quatro que ficam - o Diretor de Saúde Pública, o Fornecedor White-Label, o Especialista em Cadeia de Suprimentos e o Concessionário - todas agem em algum lugar onde este modo ainda vai."
      },
      {
        "p": "É também por isso que a mesa é de quatro e não de seis. Quatro personas distribuídas para quatro jogadores significa que todo mundo tem uma e nenhuma sobra, então ninguém joga contra um poder que não está na mesa."
      },
      {
        "p": "UMA EMPRESA PERDIDA NÃO VOLTA. A insolvência funciona exatamente como no jogo completo, e é o único jeito de uma empresa sair do seu quadro. O terreno vai junto com ela e ninguém pode comprá-la de volta."
      },
      {
        "p": "DINHEIRO SÓ PONTUA SE VOCÊ GASTAR. Não há terreno para comprar, nada para melhorar e nenhuma Megacorp para formar, então o dinheiro não tem para onde ir e se acumula - medido, um jogador terminou este modo com tanto dinheiro quanto numa partida completa três trimestres mais longa. Aqui ele compra EP diretamente num fim de ano, e em nenhum outro lugar. O dinheiro ainda na sua frente quando a partida acaba não vale nada."
      },
      {
        "p": "E O PREÇO SOBE. Cada EP custa $50 no fim do Ano 1 e $100 no fim do Ano 2. Comprar cedo sai pela metade, e o problema é que cedo é justamente quando você está mais pobre e precisa do dinheiro para construir. É essa a decisão: construir agora, ou guardar os pontos barato. Na partida completa o dinheiro pontua sozinho a $100 por ponto, sem janela e sem prazo."
      },
      {
        "note": "Medido em 200 partidas em cada um dos três tamanhos de mesa, os dois últimos trimestres ainda carregam de um terço a dois quintos da pontuação vencedora, então o jogo curto não acaba antes de algo acumular. Ele também é bem mais gentil que o jogo completo: nenhum assento terminou sem nada de pé, contra um em vinte e oito a um em treze, e quem estava em último na metade chegou à metade de cima entre um terço e quase metade das vezes. O único número que foi para o lado errado é o dinheiro, que aqui é de um quinto a um quarto de uma pontuação vencedora contra cerca de um sétimo no jogo completo - os pontos que as Megacorporações carregavam foram para o dinheiro e para as estreias de setor. Quem aprende aqui aprende a sentar em cima do dinheiro num jogo que premia isso mais do que o de verdade."
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
              "preço da via (1-6) + $3 por estrutura sobre o lote ou ortogonalmente adjacente (um centro é uma estrutura)"
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
              "dividido igualmente entre as empresas ativas daquele setor; a sobra fica para o trimestre seguinte, e um pote sem ninguém a quem pagar espera por inteiro"
            ],
            [
              "Reforma",
              "qualquer carta do nível da carcaça, seja qual for o setor ou a forma; a empresa fica com a área da carcaça"
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
              "os ícones nunca se esgotam: uma unidade por trimestre de cada empresa que os alcança, duas de Tecnologia"
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
              "O que o mercado vai de fato comprar, a certo preço, agora. No jogo: os quadrados coloridos de cada distrito. Abertos a todos, todo trimestre."
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
    "id": "history",
    "title": "Anexo: histórico de versões",
    "blocks": [
      {
        "p": "O NÚMERO MUDA QUANDO UMA REGRA MUDA. Uma edição é reimpressa sempre que algo muda a ponto de tornar um manual mais antigo errado na mesa - não por uma frase mais clara, um erro de digitação corrigido ou um anexo novo sozinho. Se você tem uma edição anterior, é isto que está faltando."
      },
      {
        "h": "v22 - esta edição"
      },
      {
        "ul": [
          "A DEMANDA NÃO SE ESGOTA. Um ícone absorve uma unidade por trimestre de cada empresa que o alcança (duas de Tecnologia) e volta a ficar aberto no trimestre seguinte; nada é marcado na grade, nada é limpo no Trimestre 8, e ninguém disputa ícone com ninguém. Na v21 um ícone absorvia a própria coluna uma única vez, por ordem de chegada, e a mesa já tinha parado de jogar assim.",
          "UM POTE SEM NINGUÉM A QUEM PAGAR ESPERA, como na v20. A v21 o descartava; o acúmulo voltou por escolha, e o prêmio que ele dá a quem entra tarde está medido na nota de B2B.",
          "O DINHEIRO PONTUA A $100 POR EP, antes $50. Com a demanda como fluxo o mesmo tabuleiro absorve mais e o dinheiro se acumula mais alto; dinheiro é o meio, não a pontuação.",
          "UMA REDE DE VAREJO É O SEU NÍVEL EM LOJAS, contando a sede: uma rede de nível 3 é a sua sede e duas filiais, em três distritos. A v21 abria uma filial por nível além da sede, um distrito a mais em todo nível do que a rede jamais deveria ter.",
          "QUALQUER ESTRUTURA EM DIFICULDADE ACEITA QUALQUER CARTA DO SEU NÍVEL, seja qual for o setor que ela era e a forma em que está de pé; a empresa fica com a área da carcaça. A v21 exigia o mesmo tipo de crescimento do nível 2 para cima. Medido, as reformas sobem dois quintos e os setores horizontais levam a maior parte delas.",
          "UMA FUSÃO DERRUBA AS LOJAS DA REDE, como uma venda sempre fez. Na v21 uma rede de Varejo fundida deixava as filiais de pé no tabuleiro em nome do banco."
        ]
      },
      {
        "note": "Medido em 200 partidas por número de jogadores com as cartas da v21: a regra de fluxo elimina a disputa por ícones - dispersão entre assentos de 8.0 tanto com três quanto com quatro jogadores, contra 18.5 e 12.5 - reduz pela metade a parcela de trimestres de nível 1 sem demanda nenhuma (de 48% para 24%) e aumenta a receita de vendas em cerca de um quarto. Já tinha sido medida e deixada de fora uma vez, em audit_demand_flow.js; o protótipo físico vinha jogando assim há semanas."
      },
      {
        "h": "v21"
      },
      {
        "ul": [
          "OS PRÊMIOS DE TERRAS PAGAM POR TERRENO CONSTRUÍDO. O Magnata Imobiliário conta lotes com uma de suas empresas em cima, e O Onipresente conta distritos em que você tem uma empresa ou uma filial de Varejo. Um lote cuja escritura você tem e no qual não construiu não conta nada. Na v20 ambos contavam propriedade, e 78% de todos os pontos de prêmios de terras iam para terreno vazio.",
          "UMA FILIAL DE VAREJO FICA EM TERRENO DE ALGUÉM. Ela só pode abrir num lote que você ou um rival já possui, não toma a escritura, e no lote de um rival paga a ele $2 de aluguel por trimestre. Na v20 uma filial tomava terreno livre pelo preço de uma ficha, enquanto todo outro setor pagava em dinheiro pelo seu terreno.",
          "TODO PROJETO TEM PREÇO NOVO. A entrada é pareada - Hotelaria e Tecnologia $10, Serviços Públicos e Varejo $15, Indústria e Saúde $20 - e cinco dos seis agora se pagam nos mesmos 2.50 trimestres ao preço base, contra uma amplitude de 3.14x antes. O que difere em lugar disso é quanto o preço pode cair antes de uma empresa parar de lucrar, de $1.50 no Varejo a $3 na Indústria.",
          "A TABELA DE DEMANDA FOI REDESENHADA. Cada setor aparece agora em exatamente oito distritos, então a amplitude não carrega nada do equilíbrio, e os anos são inclinados de propósito: Indústria e Serviços Públicos são do início, Saúde e Tecnologia do fim, Hotelaria plana nos dois.",
          "A MATRIZ DE FORNECEDORES FOI REAPONTADA. Cada setor ainda compra de três outros e é citado por três outros, mas catorze das dezoito ligações agora correm nos dois sentidos, em vez de dez.",
          "Um anexo novo apresenta cada componente e os números impressos nele, e este aqui registra o histórico."
        ]
      },
      {
        "note": "Medido ao longo de 1500 partidas por número de jogadores, com um bloco de controle separado. Com três jogadores os três setores verticais levavam 90.9% das partidas na v20 e agora levam cerca de 69.5%; o setor mais dominante caiu de 43.6% para 34.8% e o mais silencioso subiu de 1.9% para 9.1%. Nenhuma das três mudanças vale muito sozinha - os prêmios de terras valem 8.8 pontos dessa divisão e a regra das filiais 1.8 - e juntas valem 15.4, porque terreno construído é o que torna uma filial valiosa e a regra das filiais é o que impede o setor que mais ganha com isso de disparar."
      },
      {
        "h": "v20"
      },
      {
        "ul": [
          "O VALOR DE UM LOTE é seu preço de estrada impresso mais $3 por estrutura em cima dele ou encostando ortogonalmente - o lote e seus quatro vizinhos, cantos nunca contando. A v19 precificava por adjacência solta a $1 por vizinho, o que fazia do valor do lote a única regra do jogo em que um canto contava.",
          "UM CENTRO LOGÍSTICO É UMA ESTRUTURA como qualquer outra, então move o preço de um vizinho nos mesmos $3. A v19 trazia uma cláusula à parte pagando $1 por encostar num centro, o que era redundante e invertido - um centro ocupa seu lote para sempre, que é mais do que uma empresa faz.",
          "OS PRÊMIOS DE TERRAS ESCALAM COM A MESA: 4 PE mais o número de jogadores, só para o líder isolado, então 6 PE com dois assentos subindo a 10 com seis. Um prêmio fixo era um arredondamento numa mesa grande e um terço de uma pontuação vencedora numa pequena.",
          "DUAS VARIANTES FORAM REMOVIDAS depois de vinte e seis partidas registradas em que ninguém ligou nenhuma das duas: centros logísticos na estrada, e níveis pontuam pesado.",
          "UM JOGO DE INICIANTES foi adicionado e ajustado: 8 trimestres, quatro ações, sem Megacorporações, terras tomadas de graça ao construir."
        ]
      },
      {
        "h": "v19"
      },
      {
        "ul": [
          "Uma venda forçada pelo banco sai pelas mesmas metades da janela de insolvência. Na v18 ela rendia preço cheio e entregava um empréstimo que ninguém tinha pedido.",
          "Uma partida encerrada numa virada de ano paga os prêmios de terras UMA vez. A v18 pagava duas.",
          "Entrar num setor pela primeira vez vale 3 PE. A v18 imprimia 5.",
          "Uma sede de Megacorporação paga um dízimo todo trimestre em vez de pontuar pelos vizinhos no fim.",
          "Um empate é resolvido primeiro por empresas ativas, depois dinheiro, depois fichas de empréstimo.",
          "Uma melhoria horizontal pode tomar qualquer lote vazio com dono, não só um seu - você paga aluguel ao dono.",
          "As contagens de peças com cinco e seis jogadores estavam subestimadas na v18.",
          "Esta edição trouxe pela primeira vez o anexo dos Projetos."
        ]
      },
      {
        "h": "v18"
      },
      {
        "ul": [
          "O glossário: o que o jargão econômico significa neste jogo, e o único lugar em que o jogo usa uma palavra de forma mais estreita que as finanças."
        ]
      },
      {
        "h": "v17"
      },
      {
        "ul": [
          "A ECONOMIA DE PREÇOS FOI RECONSTRUÍDA. Todo preço base subiu $2, a trilha foi refeita para ir de $2 a $12, uma construção move um marcador um dólar inteiro em vez de meio, e o dinheiro converte a $50 por PE em vez de $20. Os quatro são um ajuste só em quatro lugares e não podem ser separados.",
          "O preço de recompra de um prédio em dificuldade é exatamente o que o banco pagou por ele, em vez de uma metade fixa do setup.",
          "Quando uma Megacorporação se forma, sempre se pergunta qual empresa fica com o prédio."
        ]
      },
      {
        "h": "v16 e anteriores"
      },
      {
        "p": "Não registradas individualmente. As edições v12, v15 e v16 entraram neste repositório junto com o primeiro commit que versionou documentos, e o que cada uma mudou antes disso nunca foi anotado. O teste-âncora do próprio motor ainda carrega o nome v13, que é a edição mais antiga a que qualquer verificação do repositório se refere."
      },
      {
        "note": "Este anexo existe porque um número de versão que ninguém consegue decodificar é só uma data. Uma editora, um playtester com uma impressão na mão, ou eu daqui a dois anos, todos precisam olhar para uma capa e saber quais regras estão nela. Tudo aqui foi reconstruído a partir do histórico do próprio repositório, e onde o registro acaba - antes da v17 - ele diz isso em vez de chutar."
      }
    ]
  },
  {
    "id": "components",
    "title": "Anexo: cada componente e o que está impresso nele",
    "blocks": [
      {
        "p": "O que vem na caixa, peça por peça, com os números impressos em cada uma. As cartas de Projeto têm um anexo próprio depois deste; todo o resto está aqui."
      },
      {
        "h": "O tabuleiro: 16 distritos numa grade 4x4"
      },
      {
        "p": "Doze dos dezesseis distritos são peças de SUBÚRBIO sorteadas de um conjunto de dezesseis, então um terço do conjunto fica de fora de cada partida e não há duas cidades iguais. Os outros quatro são distritos CENTRAIS, sempre presentes e sempre os mesmos."
      },
      {
        "table": {
          "head": [
            "Família de peça",
            "No conjunto",
            "Colocadas por partida"
          ],
          "rows": [
            [
              "Residencial (R1-R5)",
              "5",
              "sorteada"
            ],
            [
              "Comercial (C1-C5)",
              "5",
              "sorteada"
            ],
            [
              "Acadêmico (A1-A3)",
              "3",
              "sorteada"
            ],
            [
              "Industrial (I1-I3)",
              "3",
              "sorteada"
            ],
            [
              "Centro Financeiro (FC)",
              "1",
              "sempre"
            ],
            [
              "Área Industrial (IA)",
              "1",
              "sempre"
            ],
            [
              "Centro da Cidade (CC)",
              "1",
              "sempre"
            ],
            [
              "Marco (LM)",
              "1",
              "sempre"
            ]
          ]
        }
      },
      {
        "p": "Doze das dezesseis peças são sorteadas livremente, então uma partida pode ficar sem uma família inteira - um único distrito Residencial, ou nenhum Acadêmico - e isso remodela quais setores valem a pena antes de uma carta ser jogada."
      },
      {
        "h": "Que demanda está impressa em cada distrito"
      },
      {
        "p": "Cada distrito traz uma grade 4x4: quatro LINHAS, um setor em cada, e quatro COLUNAS de valor crescente. As linhas 1 e 2 estão abertas desde o início; AS LINHAS 3 E 4 ABREM NO TRIMESTRE 5, quando começa o Ano 2. A primeira linha de um distrito e a última são SEMPRE O MESMO SETOR, então quem abre um distrito também o fecha."
      },
      {
        "table": {
          "head": [
            "Distrito",
            "Linha 1",
            "Linha 2",
            "Linha 3 (A2)",
            "Linha 4 (A2)"
          ],
          "rows": [
            [
              "Residencial",
              "UT",
              "RE",
              "TE",
              "UT"
            ],
            [
              "Comercial",
              "HO",
              "MA",
              "HC",
              "HO"
            ],
            [
              "Acadêmico",
              "RE",
              "TE",
              "HO",
              "RE"
            ],
            [
              "Industrial",
              "MA",
              "UT",
              "RE",
              "MA"
            ],
            [
              "Centro Financeiro",
              "HC",
              "MA",
              "UT",
              "HC"
            ],
            [
              "Área Industrial",
              "TE",
              "HO",
              "HC",
              "TE"
            ],
            [
              "Centro da Cidade",
              "HC",
              "UT",
              "MA",
              "HC"
            ],
            [
              "Marco",
              "TE",
              "HC",
              "HO",
              "TE"
            ]
          ]
        }
      },
      {
        "p": "No tabuleiro inteiro isso dá a cada setor a mesma amplitude e profundidades ligeiramente diferentes - cada setor aparece em exatamente oito distritos, e Serviços Públicos e Hotelaria carregam doze linhas cada, contra dez dos demais."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Linhas no tabuleiro",
            "Distritos em que aparece",
            "Linhas abertas no Ano 1",
            "Linhas que abrem no Ano 2"
          ],
          "rows": [
            [
              "Serviços Públicos",
              "12",
              "8",
              "7",
              "5"
            ],
            [
              "Varejo",
              "10",
              "8",
              "6",
              "4"
            ],
            [
              "Hotelaria",
              "12",
              "8",
              "5",
              "7"
            ],
            [
              "Indústria",
              "10",
              "8",
              "7",
              "3"
            ],
            [
              "Saúde",
              "10",
              "8",
              "3",
              "7"
            ],
            [
              "Tecnologia",
              "10",
              "8",
              "4",
              "6"
            ]
          ]
        }
      },
      {
        "note": "Amplitude igual em 8 e uma inclinação de ano deliberada: Indústria e Serviços Públicos são setores do início, Saúde e Tecnologia do fim, e Hotelaria é o único plano nos dois anos. A amplitude ser igual nos seis é o que impede a tabela de demanda de carregar parte do equilíbrio entre setores - o que sobra está nas cartas, onde pode ser lido. Varejo e Indústria são os únicos setores impressos em NENHUM distrito central, então a demanda deles oscila com o sorteio mais do que a de qualquer outro; Saúde, presente nos quatro centrais, oscila menos."
      },
      {
        "h": "Fichas, dinheiro e o empréstimo"
      },
      {
        "table": {
          "head": [
            "Componente",
            "Por jogador",
            "O que faz"
          ],
          "rows": [
            [
              "Fichas",
              "12 (6 no jogo de iniciantes)",
              "Uma para cada lote que você possui, uma para cada empresa que opera e uma para cada empréstimo em aberto. Ficar sem fichas é o que te trava, não ficar sem dinheiro."
            ],
            [
              "Dinheiro inicial",
              "$25 / $22 / $19 pela ordem dos assentos",
              "Quanto mais tarde você senta, com menos começa - o primeiro jogador paga pela primeira escolha."
            ],
            [
              "Empréstimo",
              "$20 por uma ficha",
              "Tomado a qualquer momento em que sobre uma ficha. Cada um ainda no banco no fim vale -5 PE."
            ]
          ]
        }
      },
      {
        "h": "A trilha de preços"
      },
      {
        "p": "Um marcador por setor numa trilha de $2 a $12, cada dólar dividido em duas casas. Construir uma empresa move o próprio setor UM dólar para baixo e cada fornecedor citado no Projeto UM dólar para cima. As pontas são paradas rígidas."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Preço base",
            "Como melhora",
            "Fornecedores que paga"
          ],
          "rows": [
            [
              "Serviços Públicos (UT)",
              "$4",
              "Horizontal - um lote por nível",
              "TE, HC, MA"
            ],
            [
              "Varejo (RE)",
              "$4",
              "Vertical - um lote, qualquer nível",
              "UT, HO, TE"
            ],
            [
              "Hotelaria (HO)",
              "$5",
              "Vertical - um lote, qualquer nível",
              "HC, MA, RE"
            ],
            [
              "Indústria (MA)",
              "$5",
              "Horizontal - um lote por nível",
              "HO, TE, UT"
            ],
            [
              "Saúde (HC)",
              "$6",
              "Vertical - um lote, qualquer nível",
              "RE, UT, HO"
            ],
            [
              "Tecnologia (TE)",
              "$6",
              "Horizontal - um lote por nível",
              "MA, RE, HC"
            ]
          ]
        }
      },
      {
        "p": "Cada setor compra de três outros e é citado como fornecedor por três outros, então o dinheiro não pode empoçar num canto do circuito: catorze das dezoito ligações correm nos dois sentidos."
      },
      {
        "h": "Quanto vale uma empresa em cada nível"
      },
      {
        "p": "O Setup é pago para construir e de novo para melhorar. O OPEX é cobrado todo trimestre - $2 por nível dele é aluguel de terreno, o resto é a conta dos fornecedores. A Produção é em unidades por trimestre. Crescer uma empresa adiciona um nível e DOBRA tanto o OPEX quanto a produção."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Nível 1",
            "Nível 2",
            "Nível 3",
            "Trimestres para se pagar ao preço base"
          ],
          "rows": [
            [
              "Serviços Públicos",
              "15 / 6 / 3",
              "20 / 11 / 6",
              "30 / 15 / 12",
              "2.50"
            ],
            [
              "Varejo",
              "15 / 10 / 4",
              "25 / 18 / 8",
              "40 / 28 / 16",
              "2.50"
            ],
            [
              "Hotelaria",
              "10 / 6 / 2",
              "15 / 10 / 4",
              "25 / 16 / 8",
              "2.50"
            ],
            [
              "Indústria",
              "20 / 8 / 4",
              "35 / 14 / 8",
              "60 / 20 / 16",
              "1.67"
            ],
            [
              "Saúde",
              "20 / 10 / 3",
              "35 / 18 / 6",
              "60 / 28 / 12",
              "2.50"
            ],
            [
              "Tecnologia",
              "10 / 8 / 2",
              "15 / 13 / 4",
              "25 / 21 / 8",
              "2.50"
            ]
          ]
        }
      },
      {
        "p": "A entrada é pareada - Hotelaria e Tecnologia a $10, Serviços Públicos e Varejo a $15, Indústria e Saúde a $20 - e cinco dos seis se pagam nos mesmos 2.50 trimestres ao preço base. O que difere é QUANTO O PREÇO PODE CAIR antes de uma empresa parar de dar lucro."
      },
      {
        "table": {
          "head": [
            "Setor",
            "Lucro ao preço base",
            "A base -$1",
            "A base -$2",
            "Dólares de preço que pode perder"
          ],
          "rows": [
            [
              "Varejo",
              "$6",
              "$2",
              "-$2",
              "1.5"
            ],
            [
              "Serviços Públicos",
              "$6",
              "$3",
              "$0",
              "2.0"
            ],
            [
              "Hotelaria",
              "$4",
              "$2",
              "$0",
              "2.0"
            ],
            [
              "Tecnologia",
              "$4",
              "$2",
              "$0",
              "2.0"
            ],
            [
              "Saúde",
              "$8",
              "$5",
              "$2",
              "2.67"
            ],
            [
              "Indústria",
              "$12",
              "$8",
              "$4",
              "3.0"
            ]
          ]
        }
      },
      {
        "note": "Isso é o caráter inteiro de cada setor numa tabela só. O Varejo gira mais mercadoria e morre primeiro quando seu mercado azeda; a Indústria custa mais para entrar e aguenta cair até o piso. Retorno e folga de preço não são independentes - a folga é o lucro dividido pela produção, e o retorno é o setup dividido pelo lucro - então retorno nivelado com folga graduada só é possível quando o setup sobe junto com produção vezes folga, que é o que o pareamento acima faz."
      },
      {
        "note": "ONDE ISSO DEIXA O JOGO, medido ao longo de 1500 partidas por número de jogadores, com um bloco separado das mesmas regras como controle. Com três jogadores, os três setores verticais levavam 90.9% das partidas antes deste reequilíbrio e agora levam cerca de 69.5%; o setor mais dominante caiu de 43.6% para 34.8% e o mais silencioso subiu de 1.9% para 9.1%, então nenhum fica abaixo de uma partida em dez. O pior caso de um setor ausente do tabuleiro é 23.9% das partidas, contra 35.1%. A amplitude de retorno é 1.50x contra 3.14x, e o circuito de fornecimento roda 1.68x contra 3.46x. Três mudanças fizeram isso e nenhuma vale muito sozinha: os prêmios de terras pagarem por terreno construído vale 8.8 pontos da divisão entre setores, a regra das filiais vale 1.8, e juntas valem 15.4 - elas se compõem porque terreno construído é o que torna uma filial valiosa, e a regra das filiais é o que impede o setor que mais ganha com isso de disparar. Arredondar as escadas de melhoria de Varejo e Tecnologia para o múltiplo de cinco do baralho, pensado como arrumação, acabou valendo mais um ponto e meio, porque as duas cartas que precisavam disso estavam em pontas opostas da tabela. SOBRA UMA ESTRUTURA QUE AS CARTAS NÃO ALCANÇAM: os setores horizontais vão melhor com dois jogadores e pior com seis, 31.1% das partidas contra 22.6%, porque os prêmios de terras que os sustentam são 37% de uma pontuação vencedora com dois assentos e 22% com seis. É monotônico, é medido, e tem cerca de metade do tamanho que tinha."
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
              "Usina Solar I",
              "1",
              "15 / 6 / 3",
              "TE 6"
            ],
            [
              "Pequena Hidrelétrica I",
              "1",
              "15 / 6 / 3",
              "TE 6"
            ],
            [
              "Parque Eólico I",
              "1",
              "15 / 6 / 3",
              "HC 6"
            ],
            [
              "Usina de Biomassa I",
              "1",
              "15 / 6 / 3",
              "HC 6"
            ],
            [
              "Usina Maremotriz I",
              "1",
              "15 / 6 / 3",
              "MA 6"
            ],
            [
              "Hub de Fusão II",
              "2",
              "20 / 11 / 6",
              "TE 6, HC 5"
            ],
            [
              "Nó de Smart Grid II",
              "2",
              "20 / 11 / 6",
              "TE 6, MA 5"
            ],
            [
              "Turbina Oceânica II",
              "2",
              "20 / 11 / 6",
              "HC 6, MA 5"
            ],
            [
              "Supernó Geotérmico III",
              "3",
              "30 / 15 / 12",
              "TE 6, HC 5, MA 4"
            ],
            [
              "Reator de Antimatéria III",
              "3",
              "30 / 15 / 12",
              "TE 6, HC 5, MA 4"
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
              "Mercadinho I",
              "1",
              "15 / 10 / 4",
              "UT 10"
            ],
            [
              "Quiosque Pop-Up I",
              "1",
              "15 / 10 / 4",
              "UT 10"
            ],
            [
              "Feira do Bairro I",
              "1",
              "15 / 10 / 4",
              "HO 10"
            ],
            [
              "Galeria I",
              "1",
              "15 / 10 / 4",
              "HO 10"
            ],
            [
              "Rede de Vending I",
              "1",
              "15 / 10 / 4",
              "TE 10"
            ],
            [
              "Supermercado II",
              "2",
              "25 / 18 / 8",
              "UT 10, HO 8"
            ],
            [
              "Loja de Departamentos II",
              "2",
              "25 / 18 / 8",
              "UT 10, TE 8"
            ],
            [
              "Outlet II",
              "2",
              "25 / 18 / 8",
              "HO 10, TE 8"
            ],
            [
              "Mega-Shopping III",
              "3",
              "40 / 28 / 16",
              "UT 12, HO 8, TE 8"
            ],
            [
              "Hub Omnichannel III",
              "3",
              "40 / 28 / 16",
              "UT 12, HO 8, TE 8"
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
              "Pousada I",
              "1",
              "10 / 6 / 2",
              "HC 6"
            ],
            [
              "Cama e Café I",
              "1",
              "10 / 6 / 2",
              "HC 6"
            ],
            [
              "Hostel de Passagem I",
              "1",
              "10 / 6 / 2",
              "MA 6"
            ],
            [
              "Hotel de Estrada I",
              "1",
              "10 / 6 / 2",
              "MA 6"
            ],
            [
              "Hotel Cápsula I",
              "1",
              "10 / 6 / 2",
              "RE 6"
            ],
            [
              "Hotel Executivo II",
              "2",
              "15 / 10 / 4",
              "HC 6, MA 4"
            ],
            [
              "Eco-Resort II",
              "2",
              "15 / 10 / 4",
              "HC 6, RE 4"
            ],
            [
              "Hotel Boutique II",
              "2",
              "15 / 10 / 4",
              "MA 6, RE 4"
            ],
            [
              "Cassino de Luxo III",
              "3",
              "25 / 16 / 8",
              "HC 6, MA 5, RE 5"
            ],
            [
              "Resort Orbital III",
              "3",
              "25 / 16 / 8",
              "HC 6, MA 5, RE 5"
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
              "Oficina de Montagem I",
              "1",
              "20 / 8 / 4",
              "HO 8"
            ],
            [
              "Fábrica de Peças I",
              "1",
              "20 / 8 / 4",
              "HO 8"
            ],
            [
              "Tecelagem I",
              "1",
              "20 / 8 / 4",
              "TE 8"
            ],
            [
              "Fábrica de Conservas I",
              "1",
              "20 / 8 / 4",
              "TE 8"
            ],
            [
              "Injetora de Plástico I",
              "1",
              "20 / 8 / 4",
              "UT 8"
            ],
            [
              "Montadora II",
              "2",
              "35 / 14 / 8",
              "HO 8, TE 6"
            ],
            [
              "Fundição de Chips II",
              "2",
              "35 / 14 / 8",
              "HO 8, UT 6"
            ],
            [
              "Indústria Química II",
              "2",
              "35 / 14 / 8",
              "TE 8, UT 6"
            ],
            [
              "Robótica Pesada III",
              "3",
              "60 / 20 / 16",
              "HO 8, TE 6, UT 6"
            ],
            [
              "Estaleiro Orbital III",
              "3",
              "60 / 20 / 16",
              "HO 8, TE 6, UT 6"
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
              "Pronto Atendimento I",
              "1",
              "20 / 10 / 3",
              "RE 10"
            ],
            [
              "Farmácia I",
              "1",
              "20 / 10 / 3",
              "RE 10"
            ],
            [
              "Consultório Dentário I",
              "1",
              "20 / 10 / 3",
              "UT 10"
            ],
            [
              "Centro de Bem-Estar I",
              "1",
              "20 / 10 / 3",
              "UT 10"
            ],
            [
              "Fisioterapia I",
              "1",
              "20 / 10 / 3",
              "HO 10"
            ],
            [
              "Hospital Geral II",
              "2",
              "35 / 18 / 6",
              "RE 10, UT 8"
            ],
            [
              "Centro de Trauma II",
              "2",
              "35 / 18 / 6",
              "RE 10, HO 8"
            ],
            [
              "Clínica Especializada II",
              "2",
              "35 / 18 / 6",
              "UT 10, HO 8"
            ],
            [
              "Polo de Biotecnologia III",
              "3",
              "60 / 28 / 12",
              "RE 12, UT 8, HO 8"
            ],
            [
              "Inst. de Cibernética III",
              "3",
              "60 / 28 / 12",
              "RE 12, UT 8, HO 8"
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
              "Startup de App I",
              "1",
              "10 / 8 / 2",
              "MA 8"
            ],
            [
              "Data Center I",
              "1",
              "10 / 8 / 2",
              "MA 8"
            ],
            [
              "Sala de Servidores I",
              "1",
              "10 / 8 / 2",
              "RE 8"
            ],
            [
              "Suporte de TI I",
              "1",
              "10 / 8 / 2",
              "RE 8"
            ],
            [
              "Provedor de Nuvem I",
              "1",
              "10 / 8 / 2",
              "HC 8"
            ],
            [
              "Campus de Software II",
              "2",
              "15 / 13 / 4",
              "MA 8, RE 5"
            ],
            [
              "Hub de Rede II",
              "2",
              "15 / 13 / 4",
              "MA 8, HC 5"
            ],
            [
              "Operadora de Telecom II",
              "2",
              "15 / 13 / 4",
              "RE 8, HC 5"
            ],
            [
              "Cluster de IA Senciente III",
              "3",
              "25 / 21 / 8",
              "MA 8, RE 7, HC 6"
            ],
            [
              "Computação Quântica III",
              "3",
              "25 / 21 / 8",
              "MA 8, RE 7, HC 6"
            ]
          ]
        }
      }
    ]
  }
];
