# ADR-0001 — Fundação arquitetural do Atlas

- **Status:** Aceito
- **Data:** 2026-08-04
- **Decisores:** Mantenedor do Atlas Platform

## Contexto

O Atlas evoluiu de uma interface cartográfica para uma plataforma de inteligência operacional, com frontend Next.js, integração inicial com Airtable, monorepo pnpm/Turborepo e módulos de mapa. A continuidade do projeto exige separar domínio, serviços, infraestrutura e interface, além de registrar decisões e validar mudanças automaticamente.

## Decisão

Adotar uma arquitetura modular e orientada a serviços, com os seguintes princípios:

1. o frontend não acessa diretamente credenciais ou detalhes internos do Airtable;
2. regras de negócio ficam separadas dos adaptadores de persistência;
3. integrações externas são encapsuladas por repositórios e serviços;
4. mudanças relevantes passam por pull request e integração contínua;
5. dados, vínculos e conclusões devem conservar origem, classificação e auditabilidade;
6. nenhuma tecnologia de armazenamento será tratada como identidade do domínio.

A estrutura evolutiva será organizada em:

- `apps/` para aplicações executáveis;
- `packages/` para kernel, domínio, SDK, infraestrutura e UI compartilhada;
- `docs/adr/` para decisões arquitetônicas;
- `docs/rfc/` para propostas de capacidades relevantes;
- `.github/workflows/` para controles automáticos de qualidade.

## Consequências positivas

- menor acoplamento ao Airtable;
- maior testabilidade das regras;
- possibilidade de migração futura para outros bancos;
- revisão e reversão mais seguras;
- documentação duradoura das decisões.

## Riscos e limitações

- aumento inicial da quantidade de abstrações;
- necessidade de disciplina para não duplicar regras entre frontend e serviços;
- custo de manutenção dos contratos e testes;
- risco de sobrearquitetura, mitigado pela implementação incremental.

## Alternativas consideradas

### Manter lógica diretamente em componentes React

Rejeitada por aumentar acoplamento, duplicação e exposição acidental de detalhes de infraestrutura.

### Concentrar toda a lógica em automações do Airtable

Rejeitada como arquitetura definitiva por dificultar testes, versionamento, portabilidade e observabilidade.

## Relação com o Blueprint do SIO

Esta decisão aplica os princípios de contexto, fundamento, origem, auditabilidade, IA explicável, independência tecnológica e migração controlada definidos para o SIO.
