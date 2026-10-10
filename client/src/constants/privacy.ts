/**
 * Consent term and privacy policy shown at sign-up and on the consent screen.
 *
 * Keep CONSENT_VERSION equal to the one in server/src/config/consent.ts, and
 * bump both whenever the text changes in a way people need to agree to again.
 * Everyone with an older version is asked to accept the new one at sign-in.
 *
 * PRIVACY_CONTACT is who answers for the data (the "encarregado" in Art. 41
 * of the LGPD).
 */
export const CONSENT_VERSION = "2026-10-10.2";

export const PRIVACY_CONTACT = "mikael.amaral@ccc.ufcg.edu.br";

export interface PolicySection {
  title: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY: PolicySection[] = [
  {
    title: "Sobre este termo",
    paragraphs: [
      "O GeronTON é um aplicativo de acompanhamento de idosos em casa, desenvolvido como projeto acadêmico. Cuidadores registram um check-in semanal e intercorrências, e a equipe de saúde usa essas informações para saber quando entrar em contato com a família.",
      "Este termo explica quais dados coletamos, para que usamos e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018).",
    ],
  },
  {
    title: "Quais dados coletamos",
    paragraphs: [
      "Da sua conta: e-mail, senha (guardada de forma criptografada, nunca em texto puro), o tipo de perfil (cuidador ou profissional) e, para profissionais, o CRM informado.",
      "Do uso do aplicativo: os dias em que cada conta usou o app, para acompanhar a adesão durante o estudo. Os relatórios mostram só totais por mês, sem identificar ninguém.",
      "Do idoso: nome, CPF, data de nascimento, sexo, escolaridade, condições de saúde, medicamentos, rotinas, respostas do check-in semanal (sono, alimentação, humor, sinais vitais e outras) e intercorrências registradas.",
      "Informações de saúde são dados pessoais sensíveis pela LGPD (Art. 5º, II). Por isso pedimos o seu consentimento de forma específica e destacada, só para as finalidades descritas aqui (Art. 11, I).",
    ],
  },
  {
    title: "Para que usamos",
    paragraphs: [
      "Mostrar à equipe de saúde vinculada ao idoso quando vale entrar em contato com a família. O aplicativo não faz diagnóstico: ele só aponta sinais que merecem uma conversa.",
      "Enviar notificações sobre intercorrências graves para quem acompanha o idoso.",
      "Avaliar se os sinais do sistema funcionam, comparando o que ele apontou com o que a equipe encontrou. Os relatórios usados nessa avaliação identificam o idoso apenas por um número de cadastro, sem nome, e qualquer publicação acadêmica usa somente dados anonimizados.",
    ],
  },
  {
    title: "Quem tem acesso",
    paragraphs: [
      "Só quem está vinculado ao idoso dentro do aplicativo: quem fez o cadastro e quem se vinculou informando o CPF e a data de nascimento dele.",
      "Não vendemos nem compartilhamos os dados com empresas, anunciantes ou terceiros fora da equipe do projeto.",
    ],
  },
  {
    title: "Consentimento em nome do idoso",
    paragraphs: [
      "Ao cadastrar um idoso, você declara que ele concorda com o uso dos dados dele como descrito aqui ou que você é o responsável legal por ele. Se o idoso puder entender este termo, explique a ele antes de cadastrar.",
    ],
  },
  {
    title: "Como protegemos",
    paragraphs: [
      "Usamos conexão criptografada, senhas protegidas por hash e controle de acesso por vínculo, como pede o Art. 46 da LGPD. Nenhum sistema é totalmente imune a falhas; se acontecer um incidente que possa trazer risco a você, avisaremos.",
      "Os dados ficam guardados enquanto a conta ou o cadastro do idoso existir, ou pelo tempo do estudo. Depois disso são apagados ou anonimizados, salvo quando a lei exigir que sejam mantidos (Art. 16).",
    ],
  },
  {
    title: "Seus direitos",
    paragraphs: [
      "Pelo Art. 18 da LGPD você pode, a qualquer momento: confirmar se tratamos seus dados, ter acesso a eles, corrigir dados incompletos ou errados, pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários, pedir a portabilidade, saber com quem compartilhamos, e revogar este consentimento.",
      "Você pode não aceitar este termo. Nesse caso não é possível usar o aplicativo, porque ele depende desses dados para funcionar. Revogar o consentimento depois também é possível e não afeta o que foi feito antes da revogação.",
      "Você mesmo pode excluir sua conta a qualquer momento, no botão de privacidade no topo do aplicativo. Idosos que só você acompanha são apagados junto. Se outra pessoa também acompanha o idoso, o cadastro dele continua com ela. Os dias de uso já registrados ficam só como números nos totais mensais, sem ligação com você.",
      `Para exercer qualquer um desses direitos ou tirar dúvidas, escreva para ${PRIVACY_CONTACT}.`,
    ],
  },
];

/** Line next to the checkbox and on the consent screen. */
export const CONSENT_STATEMENT =
  "Li e concordo com o termo de consentimento e a política de privacidade, inclusive com o uso de dados de saúde do idoso para as finalidades descritas.";
