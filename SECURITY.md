# Política de Segurança

## Escopo

Esta política cobre o código, as integrações, a infraestrutura e os dados tratados pelo Atlas Platform e pelo SIO.

## Comunicação de vulnerabilidades

Não abra uma issue pública contendo tokens, chaves, dados pessoais, detalhes de exploração ou registros operacionais sensíveis. Registre o problema por canal privado com o mantenedor do repositório, informando:

- componente afetado;
- impacto estimado;
- passos mínimos de reprodução;
- evidências sem dados sensíveis;
- correção sugerida, quando disponível.

## Segredos

É proibido versionar:

- `.env`, `.env.local` e variações de ambiente;
- tokens do Airtable ou de outros serviços;
- senhas, chaves privadas, certificados e credenciais;
- dados operacionais reais usados como fixtures ou exemplos.

Use apenas variáveis de ambiente no servidor. Variáveis iniciadas por `NEXT_PUBLIC_` não podem conter segredos.

## Dados e registros operacionais

- aplique necessidade de conhecimento e menor privilégio;
- minimize dados em logs e mensagens de erro;
- não utilize dados reais em testes automatizados;
- preserve origem, classificação e rastreabilidade;
- trate exportações como operações auditáveis.

## Dependências

Atualizações de segurança devem ser priorizadas conforme impacto e explorabilidade. Mudanças críticas devem passar por testes, revisão e plano de reversão.
