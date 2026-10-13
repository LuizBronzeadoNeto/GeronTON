# RNDS/FHIR: requisitos de integração e impacto no modelo de dados

Este documento reúne o que a Rede Nacional de Dados em Saúde (RNDS) exige para trocar dados com ela e o que isso muda no modelo de dados do GeronTON (Prisma/PostgreSQL). A fonte principal para o modelo de Registro de Atendimento Clínico (RAC) é o Guia de Implementação do RAC em <https://fhir.saude.gov.br/rac/en/>; as demais fontes estão nas notas de rodapé, consultadas em 13/10/2026.

Esse documento é um levantamento. Nenhuma mudança de schema ou de código está sendo aplicada agora, e a integração continua tratada como evolução futura. A seção de impacto apenas lista o que convém preparar desde já no modelo, porque os requisitos da RNDS afetam decisões de modelagem que o projeto já tomou. Onde não há fonte, o ponto aparece marcado como (a validar).

## O GeronTON e a RNDS

O GeronTON é uma ferramenta de apoio ao cuidado de idosos, desenvolvida como projeto acadêmico em grupo na disciplina Projeto 2. Não é um prontuário eletrônico nem uma ferramenta diagnóstica (ver `docs/heuristica.md`), e integrar com a RNDS não muda isso. A integração serve para consultar o histórico de saúde do idoso (leitura) e enviar as observações que os cuidadores registram em domicílio (escrita).

A RNDS é a plataforma nacional de interoperabilidade do Ministério da Saúde. A troca de dados segue o padrão HL7 FHIR R4, em JSON, por serviços RESTful, com perfis, terminologias e extensões nacionais definidos pela RNDS.[^1]

## Padrão e identificação

| Item | O que a RNDS exige |
|---|---|
| Padrão | HL7 FHIR R4, representação JSON, API RESTful[^1] |
| Perfis | Toda troca obedece aos perfis (StructureDefinitions), sistemas de códigos e value sets da RNDS, publicados no portal do IG e no Simplifier, e também em pacote ZIP para validação por software[^2][^3] |
| Cidadão | Perfil `BRIndividuo` (recurso `Patient`). O identificador nacional é CNS ou CPF, conforme o modelo aplicável; no modelo de informação do RAC, o identificador é validado no CADSUS e, se vier só CPF sem CNS correspondente, o CNS precisa ser criado. Confirmar as regras de identificação e a eventual atribuição de CNS no fluxo e no perfil escolhidos (a validar)[^3][^4]. No IG do RAC, o `id` do recurso `Patient` é o próprio CNS definitivo do indivíduo[^12] |
| Estabelecimento | Perfil `BREstabelecimentoSaude` (recurso `Organization`), identificado pelo CNES[^3][^4] |
| Profissional | Perfis `BRProfissional` (`Practitioner`) e `BRLotacaoProfissional` (`PractitionerRole`). No RAC, o profissional é identificado por CNS/CPF e ocupação CBO, e precisa estar lotado no estabelecimento credenciado[^3][^4]. O `id` do `Practitioner` é o CNS do profissional e o do `PractitionerRole`, `[CNS]-[CNES]`[^12] |
| Tipos de dados BR | `BRDocumentoIndividuo`, `BREndereco`, `BRNomeIndividuo`, `BRMeioContato`, `BRSexo`[^3] |
| Terminologias | LOINC (medidas e exames), CID-10 e CIAP (condições e motivo), CBO (ocupação), CATMAT/OBM/Anvisa (medicamentos), UCUM (unidades); sistemas de código próprios da RNDS sob `http://www.saude.gov.br/fhir/r4/CodeSystem/`[^3][^4] |

Perfis e terminologias ficam no portal do IG (`fhir.saude.gov.br`) e no Simplifier. O integrador não cria perfis; apenas consulta e valida contra eles.[^2][^3]

No documento do RAC, cidadão e estabelecimento usam perfis `BR*`: `Composition.subject` aponta para `BRIndividuo-1.0` (CNS) e `author`/`serviceProvider`, para `BREstabelecimentoSaude-1.0` (CNES). Os perfis `rnds-patient-1.0`, `rnds-practitioner-1.0` e `rnds-organization-1.0` aparecem apenas nas respostas de consulta (leitura) de `Patient`, `Practitioner` e `Organization`.[^12][^13]

## Contrato de integração

A integração com a RNDS utiliza FHIR R4 e ocorre em duas etapas: autenticação no serviço Auth e acesso aos serviços de saúde (EHR) com o token obtido.[^5][^6]

| Item | Detalhe |
|---|---|
| Autenticação | `GET /api/token`, com certificado digital ICP-Brasil. |
| Token | JWT válido por 30 minutos. |
| Headers | `X-Authorization-Server: Bearer <token>` e `Authorization: <CNS do profissional>`. |
| Leitura | Pacientes, organizações e profissionais. |
| Escrita | `POST /api/fhir/r4/Bundle`, com `type: document`. |
| Consulta e exclusão | Consulta por identificador local ou ID RNDS; exclusão lógica conforme as regras da API. |
| Ambientes | Homologação obrigatória antes da liberação para produção. |

[^5][^6][^7][^8][^13]

A API também define regras para identificar, substituir e excluir documentos. Erros são retornados com status HTTP e detalhes em `OperationOutcome`. Para acessar a produção, o estabelecimento deve enviar evidências ao DATASUS e obter aprovação.[^9][^13]

A integração exige um profissional de saúde vinculado a um estabelecimento credenciado, então registros feitos por cuidadores não podem ser enviados automaticamente como atendimentos realizados por profissionais habilitados. O GeronTON também precisa identificar quem registrou cada informação, algo que seu modelo atual não contempla adequadamente.

O RAC é o modelo candidato para o envio. Seu documento é um `Bundle` `type: document` cuja `Composition` usa o perfil `BRRegistroAtendimentoClinico` e referencia os recursos do atendimento (entre eles `Condition`, `Observation`, `Medication`, `CarePlan` e `Location`). A modalidade Atenção Domiciliar consta do RAC e é a que mais se aproxima do cenário do GeronTON.[^6][^12]

## Mapeamento do modelo atual para recursos FHIR

Modelos do `server/prisma/schema.prisma`, o recurso FHIR correspondente e o que falta hoje:

| Modelo atual | Recurso FHIR (perfil) | O que falta |
|---|---|---|
| `Profile` (idoso) | `Patient` (`BRIndividuo`) | Sem CNS; `sex` é texto livre e opcional; sem endereço; sem nome da mãe |
| `Profile.medicalConditions` | `Condition` (`BRProblemaDiagnostico`) | Lista de texto livre (presets "Hipertensão", "Demência"…); falta código CID-10 |
| `User` (role `profissional`) | `Practitioner` (`BRProfissional`) / `PractitionerRole` (`BRLotacaoProfissional`) | Sem CNS; sem nome completo (só e-mail); `crm` existe, é auto-declarado e não é o identificador usado; sem CBO; sem lotação |
| `User` (role `cuidador`) | (sem recurso equivalente; hipótese: `RelatedPerson`) | Não tem CNS nem registro profissional; não pode ser autor de envio (a validar) |
| (não existe) | `Organization` (`BREstabelecimentoSaude`) | Sem estabelecimento/CNES |
| `CheckIn` (sinais vitais: `pressure`, `saturation`, `glycemia`, `calfCircumference`) | `Observation` (`BRMedidaObservada`) | Valores em texto livre ("140/90", "95%"); falta número e código de terminologia |
| `CheckIn` (respostas subjetivas) | `QuestionnaireResponse` / `Observation` (`BRObservacaoDescritiva`) | Booleanos e enums locais, sem mapeamento terminológico |
| `Medication` | `Medication` (`BRMedicamento`) / `MedicationRequest` (`BRPrescricaoMedicamento`) | Nome e dosagem em texto livre, sem código de medicamento |
| `Routine` | `CarePlan` (`BRPlanoCuidados`) (a validar) | Rotina domiciliar em texto livre; sem estrutura de plano de cuidados |
| `Intercorrence` | `Condition` (`BRProblemaDiagnostico`, `BRCID10Avaliado`) / `Encounter` (`BRContatoAssistencial`) | `eventType` é enum local, sem código CID-10 ou CIAP |
| `Alert` | (sem recurso equivalente no RAC) | Os modelos de troca analisados não definem perfil para alertas de cuidado; `Flag`/`RiskAssessment` são recursos FHIR genéricos, sem perfil RAC. Tendem a permanecer internos (a validar) |
| `MissedSignal` | (sem recurso equivalente no RAC) | Registro interno de falso negativo; sem perfil de troca |
| `ProfileAccess` | (relação de acesso) | Não corresponde a um recurso de dados; é controle de acesso interno |

## Mudanças de modelagem recomendadas

As mudanças abaixo ainda não estão no `schema.prisma`. Adicionar os campos como opcionais (`?`) para permitir migração sem quebrar a API atual.

As justificativas distinguem exigências do perfil FHIR, do modelo de informação do RAC e melhorias preparatórias. Requisitos ainda não confirmados ficam **a validar**.

### Campos novos em modelos existentes

| Modelo | Campo | Motivo |
|---|---|---|
| `Profile` | `cns String? @unique` | Identificar o paciente na RNDS.[^4] |
| `Profile` | `sex` como enum | Padronizar o sexo conforme a terminologia aplicável; valores e obrigatoriedade a validar.[^4] |
| `Profile` | `Address` | Preparar o endereço do idoso; campos obrigatórios a validar.[^3][^4] |
| `Profile` | `motherName String?` | Incluir o nome da mãe caso seja exigido.[^4] |
| `User` | `cns String? @unique` | Identificar o profissional nas requisições à RNDS.[^6] |
| `User` | `fullName String?` | Fornecer o nome do profissional para o recurso `Practitioner`.[^4] |
| `Medication` | `code String?` | Identificar medicamentos por código padronizado; terminologia e compatibilidade com RPM/RDM a validar.[^4] |
| `CheckIn` | Campos numéricos para pressão sistólica e diastólica | O RAC define a pressão como sistólica e diastólica em mmHg; preparar para envio como `Observation`. Manter os campos de texto durante a transição.[^4][^12] |
| `CheckIn` | Campos numéricos para saturação, glicemia e circunferência da panturrilha | Sem campo correspondente no RAC; manter para uso interno e confirmar se algum fluxo da RNDS aceita essas medidas.[^4][^12] |
| `Intercorrence` | `cid10 String?` | Padronizar condições de saúde por CID-10.[^4] |
| `CheckIn` / `Intercorrence` | `authorUserId Int?` | Registrar quem inseriu cada informação. O profissional responsável pelo envio também precisará ser identificado.[^12] |

### Modelos novos

| Modelo | Campos principais | Motivo |
|---|---|---|
| `Organization` | `cnes`, nome, UF | Identificar o estabelecimento credenciado e direcionar as requisições.[^3][^8] |
| `RndsSubmission` | `profileId`, `bundleType`, `operation`, `localId`, `payloadJson`, `status`, `rndsDocumentId`, `submittedAt`, `lastAttemptAt`, `error` | Registrar envios e substituições, permitindo acompanhar erros e consultar ou excluir documentos posteriormente. Guardar os identificadores local e RNDS.[^7][^13] |


## Fases propostas

1. **Fase 1, preparação do modelo:** priorizar campos estruturados e identificadores que já façam sentido para o produto, distinguindo necessidades gerais do sistema dos requisitos ainda dependentes da integração.
2. **Fase 2, credenciamento e homologação:** certificado, adesão no Portal de Serviços e conector de leitura (`GET Patient`/`Practitioner`) validando perfis em homologação.[^5][^9]
3. **Fase 3, leitura em produção:** consulta ao histórico do idoso (RAC, REL).[^5][^10][^12]
4. **Fase 4, escrita, condicionada à validação:** definir o documento FHIR e os recursos que representarão os dados domiciliares. Verificar se as medidas do `CheckIn` podem ser transmitidas por meio do RAC ou de outro fluxo suportado pela RNDS. Implementar o envio apenas depois de confirmar o perfil aplicável, os requisitos institucionais e a homologação do caso de uso.[^7][^10][^12]

## Lacunas a validar

- **Autoria:** definir como associar um profissional responsável aos registros feitos por cuidadores, pois `CheckIn` e `Intercorrence` não identificam o autor.
- **Perfis e campos obrigatórios:** verificar os atributos, códigos e terminologias exigidos pelo RAC e pelo IG antes de implementar.[^3][^12]
- **Nomenclatura dos perfis:** confirmar a diferença entre a escrita (perfis `BR*`) e a leitura cadastral (`rnds-*`).[^12][^13]
- **Modelo computacional:** revalidar os perfis e definir quais se aplicam à Atenção Domiciliar, pois o modelo publicado ainda pode mudar.[^12]
- **Terminologias:** definir os códigos exigidos para medidas clínicas, condições de saúde e medicamentos.[^4]
- **Dados em texto livre:** mapear condições de saúde para CID-10 e medicamentos para a terminologia exigida.
- **Sexo:** adaptar a opção `Outro` do aplicativo ao value set do RAC, que prevê Masculino, Feminino e Ignorado.
- **Sinais vitais:** o RAC codifica as medidas por `BRTipoObservacao` (peso, altura, perímetro cefálico, circunferência abdominal e pressão arterial); saturação, glicemia e panturrilha não têm código. Definir como enviá-las ou mantê-las internas.[^4][^7]
- **Alertas:** manter os alertas de cuidado domiciliar (`Alert`) internos até definir como representá-los na RNDS.
- **Atualizações:** revalidar a documentação e os serviços disponíveis antes da implementação.[^2][^3]
- **Usabilidade:** garantir que a coleta do CNS e do endereço do idoso não dificulte o preenchimento do check-in.


[^1]: Guia de Implementação da RNDS — Padrão e Introdução: <https://rnds-guia.saude.gov.br/docs/rnds/padrao>, <https://rnds-guia.saude.gov.br/docs/introducao>
[^2]: Guia da RNDS — Definições (perfis, code systems, value sets, pacote ZIP e Simplifier): <https://rnds-guia.saude.gov.br/docs/rnds/definicoes>
[^3]: Guia de Implementação FHIR da RNDS — Artefatos (perfis `BRIndividuo`, `BREstabelecimentoSaude`, `BRProfissional`, `BRLotacaoProfissional`, tipos BR, terminologias): <https://rnds-fhir.saude.gov.br/artifacts.html> (a partir de <https://fhir.saude.gov.br/>)
[^4]: Guia da RNDS — RAC, Modelo de Informação (RN01/RN02 de identificação e CADSUS, CNES, sexo, nome da mãe, CBO, sinais vitais, medicamentos): <https://rnds-guia.saude.gov.br/docs/rac/mi-rac>
[^5]: Guia da RNDS — Serviços (endpoints Auth e EHR) e Modelos de troca: <https://rnds-guia.saude.gov.br/docs/rnds/servicos>, <https://rnds-guia.saude.gov.br/docs/rel/objetivo-rel>
[^6]: Guia da RNDS — Conector (token, reuso, headers `X-Authorization-Server` e `Authorization`, casos de uso): <https://rnds-guia.saude.gov.br/docs/conector>
[^7]: Guia da RNDS — REL, Modelo Computacional (`Bundle` `type: document`, `identifier .../BRRNDS-<id>`, header `Location`, `relatesTo`/`replaces`): <https://rnds-guia.saude.gov.br/docs/rel/mc-rel>
[^8]: Guia da RNDS — Ambientes (endereços de homologação e produção por UF): <https://rnds-guia.saude.gov.br/docs/rnds/ambientes>
[^9]: Guia da RNDS — Passo a passo (credenciamento e homologação obrigatória): <https://rnds-guia.saude.gov.br/docs/passo-a-passo>
[^10]: Guia da RNDS — RAC, Objetivo e Público-alvo: <https://rnds-guia.saude.gov.br/docs/rac/objetivo-rac>. A página de Modelo Computacional do guia narrativo, <https://rnds-guia.saude.gov.br/docs/rac/mc-rac>, ainda exibe "Estamos trabalhando...".
[^12]: Guia de Implementação do RAC (IG FHIR próprio) — Modelo de Informação e Modelo Computacional: <https://fhir.saude.gov.br/rac/en/mi.html>, <https://fhir.saude.gov.br/rac/en/mc.html> (a partir de <https://fhir.saude.gov.br/rac/en/>; em português, <https://fhir.saude.gov.br/rac/>).
[^13]: Guia de Implementação do RAC — Integração, Credenciamento, Artefatos, Exemplos e Downloads: <https://fhir.saude.gov.br/rac/en/integracao.html>, <https://fhir.saude.gov.br/rac/en/credenciamento.html>, <https://fhir.saude.gov.br/rac/en/artifacts.html>, <https://fhir.saude.gov.br/rac/en/exemplos.html>, <https://fhir.saude.gov.br/rac/en/downloads.html>.

## Referências complementares

- Guia de Implementação do RAC (IG FHIR próprio) — <https://fhir.saude.gov.br/rac/en/> 
- Perfis FHIR da RNDS no Simplifier — <https://simplifier.net/redenacionaldedadosemsaude>
- HL7 FHIR R4 — <https://hl7.org/fhir/>
