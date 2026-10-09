# Açaí Daiane - Cardápio Digital & Sistema de Pedidos Online

Sistema profissional e completo de cardápio digital e gestão de pedidos, desenvolvido em **Next.js 15 (App Router)** com **TypeScript**, pronto para publicação na **Vercel** e integração com banco de dados **Supabase** e pagamentos via **Mercado Pago (Pix Online)**.

---

## Recursos e Funcionalidades

### 1. Cardápio Público & Experiência do Cliente
- **Acesso sem cadastro:** O cliente pode consultar o cardápio e fazer pedidos sem criar conta.
- **Categorias e busca dinâmica:** Pesquisa instantânea por nome ou descrição e filtro por categorias.
- **Destaques:** Mais Vendidos, Promoções do Dia com preço original vs promocional, e Novidades.
- **Personalização de Produto:** Modal de opções obrigatórias e opcionais, limites mínimos e máximos por grupo (tamanhos, frutas, complementos, caldas e adicionais nobres).
- **Tratamento de indisponibilidade:** Itens indisponíveis permanecem visíveis com indicação clara e bloqueio de adição ao carrinho.
- **Carrinho completo:** Stepper de quantidade, cálculo de taxa de entrega por bairro, regras de frete grátis e cálculo de pedido mínimo.
- **Cupons de desconto:** Validação no servidor por porcentagem ou valor fixo, data de validade, pedido mínimo e limite de utilização.
- **Controle de Horários (America/Recife):** Verifica horários de funcionamento e fechamentos especiais. Quando fechado, permite navegação mas bloqueia finalização.

### 2. Pagamentos e Integrações
- **Pix Online:** Integração pronta com Mercado Pago API, geração de QR Code e código Pix Copia e Cola no servidor, consulta de status e endpoint de webhook com idempotência.
- **Dinheiro na Entrega / Retirada:** Registro seguro da forma de pagamento.
- **Cartão na Maquininha:** Pagamento presencial na entrega ou retirada no balcão.
- **Cartão por Link WhatsApp:** Solicitação direta de link para envio pelo operador.
- **Encaminhamento WhatsApp:** Mensagem estruturada sem emojis, com todos os dados do pedido, itens, adicionais, valores e endereço.

### 3. Painel Administrativo
- **Dashboard:** Métricas de faturamento, pedidos pendentes, ticket médio e atalhos rápidos.
- **Gestão de Pedidos:** Acompanhamento do fluxo operacional (Recebido, Em preparação, Pronto, Saiu para entrega, Concluído, Cancelado).
- **Impressão de Comprovante Interno:** Visualização otimizada para impressora térmica (58mm e 80mm) e papel A4, ocultando menus e botões durante a impressão (`window.print()`).
- **Cadastro de Produtos & Categorias:** CRUD completo com preços promocionais, tags de destaque e duplicação rápida.
- **Complementos Reutilizáveis:** Criação de grupos e itens associados a vários produtos.
- **Bairros e Taxas de Entrega:** Configuração de valores individuais, pedido mínimo e frete grátis por região.
- **Cupons de Desconto:** Criação de códigos promocionais com limites de uso.
- **Horários e Controle de Emergência:** Abertura ou fechamento manual imediato com prioridade sobre o modo automático.
- **Configurações Gerais:** Personalização de nome, WhatsApp, endereço, cores e métodos de pagamento aceitos.

### 4. Temas e Idiomas
- **Temas Claro e Escuro:** Suporte nativo completo sem piscar a tela, respeitando preferências do sistema operacional e salvando localmente.
- **Idiomas:** Português Brasileiro (padrão), Inglês (EN) e Espanhol (ES) com fallback inteligente.
- **Sem Emojis:** Identidade visual sóbria, elegante e profissional utilizando ícones Lucide consistentes.

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── orders/          # Criação e consulta de pedidos com recálculo de preços no servidor
│   │   ├── payments/        # Cobrança Pix e Webhook Mercado Pago
│   │   ├── coupons/         # Validação de cupons no servidor
│   │   └── store-status/    # Verificação de horário America/Recife
│   ├── pedido/[code]/       # Página pública de acompanhamento e Pix Copia e Cola
│   ├── admin/               # Painel administrativo completo
│   │   ├── pedidos/         # Gestão de status e impressão térmica
│   │   ├── produtos/        # CRUD de produtos e preços
│   │   ├── categorias/      # CRUD de categorias
│   │   ├── complementos/    # CRUD de adicionais
│   │   ├── bairros/         # Taxas de entrega
│   │   ├── cupons/          # Cupons de desconto
│   │   ├── horarios/        # Horários de funcionamento
│   │   └── configuracoes/   # Dados da loja e cores
│   ├── globals.css          # Design tokens, temas claro/escuro e estilos de impressão
│   └── page.tsx             # Cardápio digital público
├── components/ui/           # Componentes modulares e reutilizáveis
├── context/                 # CartContext, ThemeContext, LanguageContext
├── lib/                     # Regras de negócio, Mercado Pago, WhatsApp e repositório
├── locales/                 # Dicionários pt, en, es
└── supabase/                # Scripts SQL (schema.sql e seed.sql)
```

---

## Como Rodar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o arquivo de variáveis de ambiente:**
   Crie um arquivo `.env.local` baseado no `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000` para o cardápio público ou `http://localhost:3000/admin` para o painel administrativo.

---

## Configuração do Supabase

1. No painel do [Supabase](https://supabase.com), crie um novo projeto.
2. Acesse o **SQL Editor** do Supabase.
3. Execute o script `supabase/schema.sql` para criar todas as tabelas, índices e políticas de segurança RLS.
4. Execute o script `supabase/seed.sql` para popular as categorias, produtos, complementos, bairros e horários iniciais.
5. Copie as chaves do projeto (Project URL e Anon Key) e configure no seu `.env.local` e nas variáveis de ambiente da Vercel:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
   ```

---

## Configuração do Mercado Pago (Pix Online)

1. Obtenha suas credenciais no [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers).
2. Adicione ao `.env.local`:
   ```env
   MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token
   MERCADO_PAGO_WEBHOOK_SECRET=seu-secret
   NEXT_PUBLIC_SITE_URL=https://seu-dominio.vercel.app
   ```
3. Cadastre a URL do webhook no Mercado Pago: `https://seu-dominio.vercel.app/api/payments/webhook`.

---

## Publicação na Vercel & GitHub

1. Inicialize o repositório git e suba para o GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: cardapio digital e sistema de pedidos completo"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/seu-repositorio.git
   git push -u origin main
   ```
2. Na [Vercel](https://vercel.com), importe o repositório do GitHub.
3. Preencha as variáveis de ambiente em **Settings > Environment Variables**.
4. Clique em **Deploy**. A compilação e deploy ocorrerão automaticamente.
