// Só para conferência: põe o relógio do processo em 18/11/2026 15:00 (Brasília), andando normalmente a partir daí.
// Usado para mostrar que a falha do teste T1.8 do Portal do cliente (etapa 1) depende só da hora em que a suíte roda
// (entre 21h e 24h de Brasília o dia em UTC já é o seguinte). Não muda nenhum arquivo do legado nem dos testes.
'use strict';
const Real = Date;
const inicioReal = Real.now();
const alvo = Real.parse('2026-11-18T15:00:00-03:00');
const agora = () => alvo + (Real.now() - inicioReal);
class DataTarde extends Real {
  constructor(...a) { if (a.length === 0) super(agora()); else super(...a); }
  static now() { return agora(); }
}
DataTarde.parse = Real.parse; DataTarde.UTC = Real.UTC;
global.Date = DataTarde;
