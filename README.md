# Leste Localiza PRO

Sistema profissional para consulta da rede elétrica a partir de arquivos KMZ — inspirado no
[Leste Localiza](https://lestelocaliza.netlify.app), com upload administrativo de KMZ, busca de CSI
por full text search, visualização da rede completa no mapa (postes, transformadores, rede MT/BT,
ramais, chaves, religadores e consumidores) e camadas controláveis, ao estilo Google Maps.

## Stack

React 19 · Vite · TypeScript · TailwindCSS · Shadcn-style UI · React Router · React Query · Zustand ·
Leaflet + OpenStreetMap · Supabase (Auth, Postgres, PostGIS, Storage)

## Arquitetura

```
src/
  components/   # UI reutilizável (map, search, admin, layout, ui)
  pages/        # Login, Home, Admin
  hooks/        # React Query hooks (busca, rede, favoritos)
  services/      # Chamadas ao Supabase (busca, importação KMZ, favoritos)
  supabase/     # Cliente Supabase
  store/        # Estado global (Zustand): tema, camadas, seleção
  contexts/     # AuthContext
  types/        # Tipos do domínio
  utils/        # Categorização de objetos, cn()
sql/
  001_schema.sql  # Schema completo: tabelas, PostGIS, RLS, full text search
```

## Como rodar

### 1. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de `sql/001_schema.sql` — isso cria as tabelas,
   habilita PostGIS, cria os índices espaciais/GIN, as políticas de RLS e o bucket de Storage
   `kmz-files`.
3. Em **Authentication → Providers**, habilite login por e-mail/senha.
4. Crie o primeiro usuário administrador: cadastre um usuário normalmente pelo app e depois,
   no SQL Editor, rode:
   ```sql
   update public.usuarios set role = 'admin' where email = 'seu-email@exemplo.com';
   ```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API no Supabase).

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

### 4. Build de produção

```bash
npm run build
npm run preview
```

## Fluxo de importação de KMZ (painel admin)

1. Administrador acessa `/admin` e clica em **Adicionar KMZ**.
2. O arquivo é descompactado no navegador (JSZip), o `.kml` interno é convertido para GeoJSON
   (`@tmcw/togeojson`).
3. O KMZ original é salvo no Supabase Storage (bucket `kmz-files`).
4. Cada feature do GeoJSON vira uma linha em `geo_objects`, com:
   - `geometry` (PostGIS, indexado com GIST)
   - `properties` (JSONB com **todos** os atributos originais do KMZ — dinâmico, sem schema fixo)
   - Colunas achatadas (`codigo`, `municipio`, `subestacao`, `alimentador`, `regional`, `categoria`)
     extraídas automaticamente para busca e filtro rápidos.
5. Um trigger no banco mantém `search_text` (full text search em português) e
   `latitude`/`longitude` sempre sincronizados.

## Busca

A busca usa a função SQL `buscar_objetos(termo, limite)`, que combina:
- **Full Text Search** em português (`tsvector`/`tsquery`) sobre todos os atributos do KMZ.
- **Trigram** (`pg_trgm`) para tolerância a erro de digitação em código/município.

## "Ver Rede"

Ao clicar em **Ver Rede**, o sistema identifica o `kmz_id` do objeto selecionado e carrega
**somente** os objetos daquele KMZ (`rede_do_objeto` / `carregarRedePorKmz`) — nunca todos os KMZ
simultaneamente, o que mantém a busca e o carregamento do mapa rápidos mesmo com milhares de arquivos.

## Performance

- Índice espacial GIST em `geo_objects.geometry`.
- Índice GIN em `search_text` (full text) e em `codigo`/`municipio` (trigram).
- Clustering de marcadores no mapa (`react-leaflet-cluster`) para não travar com milhares de pontos.
- Lazy loading: a rede de um KMZ só é buscada quando o usuário clica em "Ver Rede".
- Inserção de objetos em lotes de 500 durante a importação, para KMZ muito grandes.

## PWA

O projeto já está configurado com `vite-plugin-pwa` (manifest + cache de tiles do OpenStreetMap),
permitindo instalação como aplicativo e uso básico offline do shell da aplicação.

## Segurança

- Autenticação via Supabase Auth (e-mail/senha).
- Row Level Security em todas as tabelas: usuários autenticados leem `kmz_files`/`geo_objects`;
  apenas administradores escrevem; favoritos e pesquisas recentes são isolados por usuário.
