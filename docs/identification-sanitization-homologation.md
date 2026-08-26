# Homologação — Identificação e Saneamento

Este documento define o encerramento do escopo do módulo. “100%” significa que todos os critérios abaixo foram aprovados; não significa ausência de evolução futura.

## Critérios automatizados

- [x] `pnpm --filter web test`
- [x] `pnpm --filter @atlas/kernel test`
- [x] `pnpm -r typecheck`
- [x] `pnpm -r lint`
- [x] `pnpm format:check`
- [x] `pnpm -r build`

## Segurança e autorização

- [x] Sessão inválida ou expirada retorna 401.
- [x] Papel sem permissão retorna 403.
- [ ] Auditor consulta, mas não decide nem escreve.
- [ ] Revisor trata e propõe apenas nos fluxos autorizados.
- [ ] Administrador mantém as autorizações explicitamente previstas.
- [x] Cinco credenciais inválidas bloqueiam temporariamente novas tentativas.
- [x] Cookie permanece HttpOnly, SameSite=Strict e Secure em produção.
- [ ] Credenciais expostas durante desenvolvimento foram revogadas e substituídas.

## Fluxo de saneamento

- [ ] Solicitação repetida é idempotente.
- [ ] Apenas uma identidade pode assumir solicitação aberta.
- [ ] Somente o responsável — ou administrador — conclui o tratamento.
- [ ] Proponente e aprovador são identidades distintas.
- [ ] Executor é distinto do proponente e aprovador.
- [ ] Aplicação exige confirmação explícita, justificativa válida e versão intacta.
- [ ] Aplicação repetida não gera nova escrita.
- [ ] Escrita interrompida é reconciliada sem duplicação.
- [ ] Reversão exige solicitante, aprovador e executor conforme segregação definida.
- [ ] Reversão usa snapshot e hashes preservados.
- [ ] Alteração posterior bloqueia aplicação ou reversão.

## Auditoria e privacidade

- [ ] Consultas relevantes persistem correlação, ator, papel e resultado.
- [ ] Aplicação e reversão registram contagem real de escritas.
- [ ] Falhas registram resultado sem armazenar segredo ou documento integral.
- [ ] Listas exibem identificadores opacos e documentos mascarados.
- [ ] Reconciliação permanece somente leitura e relata fluxos interrompidos.

## Evidência de homologação

Registrar data, branch, commit, executor dos testes e resultado de cada cenário manual. O módulo só recebe o marco de 100% após todos os itens estarem marcados.

### Validação automatizada — 26/08/2026

- Branch: `main`.
- Commit-base validado: `394f7dcf690f338434e2d6af3ad040ff036be6c4`.
- Executor: Codex, em ambiente isolado de homologação.
- Aplicação web: 24 arquivos de teste e 98 testes aprovados.
- Núcleo `@atlas/kernel`: 9 arquivos de teste e 59 testes aprovados.
- Verificação de tipos: aprovada nos dois projetos do workspace.
- ESLint: aprovado nos dois projetos do workspace.
- Prettier: 170 arquivos normalizados; verificação final aprovada.
- Build de produção: aprovado; 18 páginas geradas e todas as rotas compiladas.
- Resultado: critérios automatizados aprovados. Os cenários manuais permanecem pendentes até execução com credenciais e integrações reais no ambiente de homologação.
