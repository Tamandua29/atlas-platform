# Homologação — Identificação e Saneamento

Este documento define o encerramento do escopo do módulo. “100%” significa que todos os critérios abaixo foram aprovados; não significa ausência de evolução futura.

## Critérios automatizados

- [ ] `pnpm --filter web test`
- [ ] `pnpm --filter @atlas/kernel test`
- [ ] `pnpm -r typecheck`
- [ ] `pnpm -r lint`
- [ ] `pnpm -r build`

## Segurança e autorização

- [ ] Sessão inválida ou expirada retorna 401.
- [ ] Papel sem permissão retorna 403.
- [ ] Auditor consulta, mas não decide nem escreve.
- [ ] Revisor trata e propõe apenas nos fluxos autorizados.
- [ ] Administrador mantém as autorizações explicitamente previstas.
- [ ] Cinco credenciais inválidas bloqueiam temporariamente novas tentativas.
- [ ] Cookie permanece HttpOnly, SameSite=Strict e Secure em produção.
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
