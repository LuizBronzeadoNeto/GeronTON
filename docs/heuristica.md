# Heurística de acompanhamento — apoio à organização do cuidado

## Finalidade

O GeronTON apoia a organização do cuidado. Não é uma ferramenta diagnóstica.
O resultado orienta a equipe na priorização do acompanhamento e do contato com
as famílias; não identifica doenças nem define condutas clínicas.

A heurística está implementada em `server/src/utils/risk.ts`. O IVCF-20 (Índice
de Vulnerabilidade Clínico-Funcional) serviu de referência para parte dos
aspectos acompanhados, como humor e mobilidade. Do instrumento vem também o
limite de circunferência da panturrilha. As perguntas do check-in, a pontuação
e as faixas de classificação, porém, são próprias do projeto. O resultado não
equivale ao do IVCF-20.

## Relação com o IVCF-20

A comparação abaixo usa o [Manual de uso do IVCF-20 no PEC e-SUS APS, do
Ministério da Saúde](https://saude.rs.gov.br/upload/arquivos/202502/05144907-manual-de-uso-ivcf-20-no-pec.pdf).
Ela separa o que coincide do que foi adaptado.

| Aspecto       | IVCF-20                                                                                                                | GeronTON                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Panturrilha   | < 31 cm é uma das condições da questão de capacidade aeróbica e/ou muscular, que vale até 2 pontos                     | < 31 cm soma 2 pontos isoladamente e gera um alerta                           |
| Humor         | Duas perguntas sobre tristeza/desânimo/desesperança e perda de interesse no último mês; 2 pontos por resposta positiva | Humor triste ou muito triste soma 2 pontos no check-in semanal; neutro soma 1 |
| Marcha        | Dificuldade para caminhar que impede atividades do cotidiano; 2 pontos                                                 | Marcha mais instável que o habitual; 4 pontos                                 |
| Quedas        | Duas ou mais quedas no último ano; 2 pontos                                                                            | Queda na semana: 5 pontos com lesão ou 3 sem lesão                            |
| Classificação | 0–6, 7–14 e 15–40                                                                                                      | 0–5, 6–11 e 12+                                                               |

O limite de 31 cm e os 2 pontos da panturrilha vêm do manual. No IVCF-20, essa
medida integra uma questão mais ampla, que reúne panturrilha, perda de peso,
IMC e velocidade da marcha e vale no máximo 2 pontos no conjunto. O GeronTON
não implementa essa questão completa. O alerta `sarcopenia_risk` é regra do
projeto, não diagnóstico do instrumento.

Nos outros temas em comum, as perguntas são diferentes. `bowelRegular`
acompanha o funcionamento do intestino, e não a perda involuntária de urina ou
fezes. `dailyBath` registra se houve banho, não a capacidade de tomar banho
sozinho. `selfExpression` não substitui a avaliação de visão e audição do
instrumento. A heurística também não pontua idade, autopercepção da saúde nem
os critérios de comorbidades múltiplas do IVCF-20.

O manual recomenda verificar a adesão ao tratamento e estimular atividades
significativas e vínculos sociais. São referências de cuidado, mas de onde não
saem os pesos de `medsOnTime` nem de `stimulation`. O manual pede reavaliação
após intercorrências; não define o piso do GeronTON nem a janela de 30 dias.
Os limites de saturação, pressão e glicemia usados no código também não constam
nele.

## Como o resultado é calculado

O cálculo usa o último check-in do cuidador e as intercorrências dos últimos
30 dias. Um check-in com mais de 14 dias (`STALE_CHECKIN_DAYS`) é ignorado,
para que uma família que parou de responder não continue aparecendo como
Estável.

1. `evaluateCheckIn` soma os pontos das respostas e das medidas que pontuam.
2. `levelFromScore` converte a soma em Estável, Atenção ou Crítico.
3. `acuteEventFloor` define um nível mínimo conforme as intercorrências.
4. `computeRiskStatus` escolhe o nível mais alto entre os dois resultados.

Sem check-in recente e sem intercorrências, o resultado é "Sem dados"
(`unknown`), com pontuação zero. Sem check-in recente mas com intercorrências,
a pontuação segue zero e o nível sai das intercorrências.

O resultado traz também os motivos (`reasons`): primeiro as intercorrências,
depois cada resposta do check-in que somou pontos, como "Apetite ruim (+3)".

## Regras de pontuação do check-in

Os pontos se acumulam. Campo que não atende nenhuma condição da tabela não soma
nada. Os pesos abaixo ainda dependem de validação com profissionais.

### Saúde e eventos da semana

| Campo                                     | Condição                      | Pontos            |
| ----------------------------------------- | ----------------------------- | ----------------- |
| `skinIssues` — problemas de pele          | Sim (`true`)                  | +3                |
| `bowelRegular` — intestino regular        | Não (`false`)                 | +2                |
| `sleepWell` — dorme bem                   | Não (`false`)                 | +2                |
| `unstableGait` — marcha instável          | Sim (`true`)                  | +4                |
| `weeklyEvents` — febre                    | Contém `fever`                | +5 por ocorrência |
| `weeklyEvents` — dificuldade respiratória | Contém `breathing_difficulty` | +5 por ocorrência |
| `weeklyEvents` — queda com lesão          | Contém `fall_with_injury`     | +5 por ocorrência |
| `weeklyEvents` — sangramento ativo        | Contém `active_bleeding`      | +5 por ocorrência |
| `weeklyEvents` — confusão aguda           | Contém `acute_confusion`      | +5 por ocorrência |
| `weeklyEvents` — queda sem lesão          | Contém `fall_without_injury`  | +3 por ocorrência |
| `weeklyEvents` — dor                      | Contém `pain`                 | +2 por ocorrência |
| `weeklyEvents` — tosse                    | Contém `cough`                | +2 por ocorrência |

Cinco desses eventos valem 5 pontos e estão listados em `CRITICAL_WEEKLY_EVENTS`;
todos geram aviso visual no painel. Um deles, sozinho, não define o nível
Crítico: com 5 pontos e nenhuma intercorrência, o resultado ainda é Estável.

A função `weeklyEventPoints` dá 2 pontos a qualquer valor fora do grupo de +5,
exceto `fall_without_injury`. A rota de check-ins aceita apenas os oito tipos
listados em `WEEKLY_EVENTS`. Cada item da lista pontua, mesmo repetido.

### Nutrição e medicação

| Campo                                | Condição               | Pontos |
| ------------------------------------ | ---------------------- | ------ |
| `appetite` — apetite                 | Ruim (`bad`)           | +3     |
| `appetite` — apetite                 | Regular (`regular`)    | +1     |
| `chokingIncident` — engasgo          | Sim (`true`)           | +5     |
| `hydrationGoal` — meta de hidratação | Não atingida (`false`) | +2     |
| `medsOnTime` — medicação no horário  | Não (`false`)          | +3     |

### Comportamento e estímulo

| Campo                                      | Condição                                    | Pontos |
| ------------------------------------------ | ------------------------------------------- | ------ |
| `mood` — humor                             | Triste (`sad`) ou muito triste (`very_sad`) | +2     |
| `mood` — humor                             | Neutro (`neutral`)                          | +1     |
| `sunExposure` — exposição ao sol           | Não (`false`)                               | +1     |
| `selfExpression` — conversa ou se expressa | Não (`false`)                               | +1     |
| `stimulation` — atividades estimulantes    | Não (`false`)                               | +1     |

Não pontuam: `dailyBath`, `oralHygiene`, `groomedNails`, `stressLevel`,
`breathShortness`, `chokingFrequency`, `otherEvent`, `needsMedications`,
`needsHygiene`, `needsFood` e `shortForm`. Uma diferença que confunde:
`breathShortness` não pontua, mas o evento `breathing_difficulty` em
`weeklyEvents` soma 5 pontos.

## Limites das medidas informadas

`evaluateVitalSigns` compara as medidas com limites fixos, sem desvio
estatístico. Só o limite da panturrilha e seus 2 pontos têm base no manual do
IVCF-20, como mostrado antes. Os demais limites e efeitos da tabela abaixo
ainda dependem de validação com profissionais.

| Campo                                      | Condição exata                                          | Pontos | Alerta gerado              |
| ------------------------------------------ | ------------------------------------------------------- | ------ | -------------------------- |
| `saturation` — saturação de O₂             | Menor que 92%                                           | +4     | Nenhum                     |
| `calfCircumference` — panturrilha esquerda | Menor que 31 cm                                         | +2     | `sarcopenia_risk`          |
| `pressure` — pressão arterial              | Sistólica maior que 140 ou diastólica maior que 90 mmHg | 0      | `clinical_warning`         |
| `pressure` — pressão arterial              | Sistólica menor que 90 ou diastólica menor que 60 mmHg  | 0      | `clinical_warning`         |
| `glycemia` — glicemia                      | Maior que 200 mg/dL                                     | 0      | `metabolic_decompensation` |

As comparações são estritas. Saturação de 92%, panturrilha de 31 cm e glicemia
de 200 mg/dL não acionam as respectivas regras. Pressão de 140/90 ou 90/60
também não gera alerta. Se um componente da pressão estiver fora do limite, o
alerta gerado é um só, mesmo que os dois estejam fora.

Os nomes dos tipos de alerta são identificadores internos, não diagnósticos.
As mensagens mostram a medida e o limite ultrapassado. Os alertas ficam salvos
com severidade `attention` em `server/src/services/alerts.ts`. Ao atualizar um
check-in, os alertas abertos ligados a ele são substituídos; os de outros
check-ins permanecem. Alertas já resolvidos por um profissional são mantidos,
com o parecer, e o mesmo aviso não é gerado de novo.

As medidas são opcionais e chegam como texto. O código extrai o primeiro
número de saturação, panturrilha e glicemia e aceita vírgula decimal, como em
`95%` ou `30,5 cm`. Para a pressão, ele procura dois números separados por `/`,
`x` ou `por`. Medida sem os números necessários fica fora dessa avaliação.
Quando os dois números são menores que 30, a leitura é tratada como cmHg e
convertida: `12x8` e `12 por 8` viram 120/80.

## Piso por intercorrências (`acuteEventFloor`)

As intercorrências não somam pontos. Elas fixam um nível mínimo, para que um
evento recente continue em destaque mesmo com a pontuação da semana baixa.

| Condição                                                                                                                                    | Nível mínimo                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Existe evento com `isCritical = true`                                                                                                       | Crítico (`high`)                                |
| Existe evento do tipo `fever`, `breathing_difficulties`, `bleeding`, `confusion`, `chest_pain` ou `choking`, mesmo com `isCritical = false` | Crítico (`high`)                                |
| Existe outra intercorrência e nenhuma das condições acima                                                                                   | Atenção (`moderate`)                            |
| Não existe intercorrência                                                                                                                   | Estável (`low`), sem elevar o resultado semanal |

Os seis tipos de intercorrência que levam ao Crítico estão em
`CRITICAL_EVENT_TYPES`. Uma queda registrada como intercorrência só chega a
esse nível com `isCritical = true`. Atenção à grafia: `breathing_difficulties`
vale para intercorrências e `breathing_difficulty` para o check-in.

O piso nunca reduz o resultado final. Uma pontuação 2 com intercorrência
crítica termina em Crítico, com os 2 pontos mantidos. Uma pontuação 12 com
intercorrência não crítica também termina em Crítico.

As rotas `GET /triagem` e `GET /perfis/:perfilId/risco` aplicam a janela de
30 dias com `INTERCORRENCE_WINDOW_DAYS`. O `acuteEventFloor` recebe os eventos
já filtrados e não olha datas. O piso, os tipos que levam ao Crítico e a
janela de 30 dias ainda serão validados com profissionais.

## Limiares de classificação

| Pontuação semanal | Nível      | Nome na interface |
| ----------------- | ---------- | ----------------- |
| 0–5               | `low`      | Estável           |
| 6–11              | `moderate` | Atenção           |
| 12 ou mais        | `high`     | Crítico           |

Os cortes são `MODERATE_THRESHOLD = 6` e `HIGH_THRESHOLD = 12`, valores a
validar com profissionais. O nível final também depende do piso por
intercorrências, então não dá para inferi-lo só pela pontuação.

## Fontes e validação

As tabelas descrevem o comportamento atual do código. O manual do IVCF-20 é
fonte do limite da panturrilha e de seus 2 pontos e referência para os temas
em comum; essas correspondências não validam a heurística completa nem os
cortes do GeronTON. Os pesos de +1 a +5, os limites de saturação, pressão e
glicemia, as faixas de classificação, o piso por intercorrências e a janela de
30 dias aguardam validação com profissionais de saúde.

O resultado depende da qualidade e da frequência dos registros do cuidador.
**Estável não significa ausência de problemas de saúde.** A avaliação da pessoa
idosa e as decisões clínicas cabem aos profissionais de saúde.
