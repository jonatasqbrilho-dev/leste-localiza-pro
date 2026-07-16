-- ============================================================================
-- LESTE LOCALIZA PRO — Schema do banco (Supabase / PostgreSQL + PostGIS)
-- ============================================================================

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ----------------------------------------------------------------------------
-- PERFIS DE USUÁRIO (estende auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  criado_em timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ARQUIVOS KMZ
-- ----------------------------------------------------------------------------
create table if not exists public.kmz_files (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  storage_path text not null,
  data_upload timestamptz not null default now(),
  usuario_id uuid references public.usuarios(id),
  total_objetos integer not null default 0,
  status text not null default 'processando' check (status in ('processando', 'concluido', 'erro')),
  regional text,
  erro_mensagem text
);

create index if not exists idx_kmz_files_status on public.kmz_files (status);

-- ----------------------------------------------------------------------------
-- OBJETOS GEOGRÁFICOS (todo objeto do KMZ: postes, redes, transformadores, etc)
-- ----------------------------------------------------------------------------
create table if not exists public.geo_objects (
  id uuid primary key default gen_random_uuid(),
  kmz_id uuid not null references public.kmz_files(id) on delete cascade,
  tipo text not null, -- Point, LineString, Polygon, MultiLineString, MultiPolygon
  geometry geometry(Geometry, 4326) not null,
  properties jsonb not null default '{}'::jsonb, -- todos os atributos dinâmicos do KMZ

  -- colunas "achatadas" das chaves mais comuns, para busca/filtro rápido
  -- (continuam sendo alimentadas a partir de properties na importação)
  codigo text,
  municipio text,
  alimentador text,
  subestacao text,
  regional text,
  categoria text, -- poste | transformador | rede_mt | rede_bt | ramal | chave | religador | consumidor | csi | outro

  latitude double precision,
  longitude double precision,

  -- texto concatenado de todos os valores de properties, para full text search
  search_text tsvector,

  criado_em timestamptz not null default now()
);

-- índice espacial (GIST) — essencial para consultas de "rede próxima"/bounding box
create index if not exists idx_geo_objects_geometry on public.geo_objects using gist (geometry);

-- índice espacial por KMZ, para "carregar somente a rede daquele KMZ"
create index if not exists idx_geo_objects_kmz_id on public.geo_objects (kmz_id);
create index if not exists idx_geo_objects_categoria on public.geo_objects (categoria);

-- full text search (português) sobre o texto dinâmico dos atributos
create index if not exists idx_geo_objects_search_text on public.geo_objects using gin (search_text);

-- trigram, para buscas parciais/"contém" em código/município/etc (tolerante a erro de digitação)
create index if not exists idx_geo_objects_codigo_trgm on public.geo_objects using gin (codigo gin_trgm_ops);
create index if not exists idx_geo_objects_municipio_trgm on public.geo_objects using gin (municipio gin_trgm_ops);

-- trigger para manter search_text e latitude/longitude sempre sincronizados
create or replace function public.geo_objects_before_write()
returns trigger as $$
begin
  new.search_text := to_tsvector(
    'portuguese',
    unaccent(
      coalesce(new.codigo, '') || ' ' ||
      coalesce(new.municipio, '') || ' ' ||
      coalesce(new.alimentador, '') || ' ' ||
      coalesce(new.subestacao, '') || ' ' ||
      coalesce(new.regional, '') || ' ' ||
      coalesce((select string_agg(value::text, ' ') from jsonb_each_text(new.properties)), '')
    )
  );

  if new.geometry is not null and GeometryType(new.geometry) = 'POINT' then
    new.latitude := ST_Y(new.geometry);
    new.longitude := ST_X(new.geometry);
  else
    new.latitude := coalesce(new.latitude, ST_Y(ST_Centroid(new.geometry)));
    new.longitude := coalesce(new.longitude, ST_X(ST_Centroid(new.geometry)));
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_geo_objects_before_write on public.geo_objects;
create trigger trg_geo_objects_before_write
  before insert or update on public.geo_objects
  for each row execute function public.geo_objects_before_write();

-- ----------------------------------------------------------------------------
-- FAVORITOS
-- ----------------------------------------------------------------------------
create table if not exists public.favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  geo_object_id uuid not null references public.geo_objects(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (usuario_id, geo_object_id)
);

-- ----------------------------------------------------------------------------
-- PESQUISAS RECENTES
-- ----------------------------------------------------------------------------
create table if not exists public.pesquisas_recentes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  termo text not null,
  geo_object_id uuid references public.geo_objects(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_pesquisas_recentes_usuario on public.pesquisas_recentes (usuario_id, criado_em desc);

-- ----------------------------------------------------------------------------
-- LOGS (auditoria: upload, exclusão, login, etc)
-- ----------------------------------------------------------------------------
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_logs_criado_em on public.logs (criado_em desc);

-- ============================================================================
-- FUNÇÃO DE BUSCA PRINCIPAL (full text + trigram, com fallback)
-- ============================================================================
create or replace function public.buscar_objetos(termo text, limite integer default 30)
returns table (
  id uuid,
  kmz_id uuid,
  kmz_nome text,
  tipo text,
  codigo text,
  municipio text,
  alimentador text,
  subestacao text,
  regional text,
  categoria text,
  latitude double precision,
  longitude double precision,
  properties jsonb,
  relevancia real
) as $$
begin
  return query
  select
    g.id, g.kmz_id, k.nome as kmz_nome, g.tipo,
    g.codigo, g.municipio, g.alimentador, g.subestacao, g.regional, g.categoria,
    g.latitude, g.longitude, g.properties,
    ts_rank(g.search_text, websearch_to_tsquery('portuguese', unaccent(termo))) as relevancia
  from public.geo_objects g
  join public.kmz_files k on k.id = g.kmz_id
  where
    g.search_text @@ websearch_to_tsquery('portuguese', unaccent(termo))
    or g.codigo ilike '%' || termo || '%'
    or g.municipio ilike '%' || termo || '%'
  order by relevancia desc nulls last, g.codigo asc
  limit limite;
end;
$$ language plpgsql stable;

-- ============================================================================
-- FUNÇÃO "VER REDE": todos os objetos do mesmo KMZ de um dado geo_object
-- ============================================================================
create or replace function public.rede_do_objeto(objeto_id uuid)
returns setof public.geo_objects as $$
  select g.*
  from public.geo_objects g
  where g.kmz_id = (select kmz_id from public.geo_objects where id = objeto_id);
$$ language sql stable;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.usuarios enable row level security;
alter table public.kmz_files enable row level security;
alter table public.geo_objects enable row level security;
alter table public.favoritos enable row level security;
alter table public.pesquisas_recentes enable row level security;
alter table public.logs enable row level security;

-- usuarios: qualquer usuário autenticado vê seu próprio perfil; admin vê todos
create policy "usuarios_select_own_or_admin" on public.usuarios
  for select using (
    auth.uid() = id
    or exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "usuarios_update_own" on public.usuarios
  for update using (auth.uid() = id);

-- kmz_files: leitura liberada a todo autenticado; escrita só admin
create policy "kmz_files_select_all" on public.kmz_files
  for select using (auth.role() = 'authenticated');

create policy "kmz_files_admin_write" on public.kmz_files
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- geo_objects: leitura liberada a todo autenticado; escrita só admin (via import)
create policy "geo_objects_select_all" on public.geo_objects
  for select using (auth.role() = 'authenticated');

create policy "geo_objects_admin_write" on public.geo_objects
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- favoritos: cada usuário só mexe nos seus
create policy "favoritos_own" on public.favoritos
  for all using (auth.uid() = usuario_id);

-- pesquisas_recentes: cada usuário só mexe nas suas
create policy "pesquisas_recentes_own" on public.pesquisas_recentes
  for all using (auth.uid() = usuario_id);

-- logs: qualquer autenticado insere; só admin lê tudo
create policy "logs_insert_authenticated" on public.logs
  for insert with check (auth.role() = 'authenticated');

create policy "logs_select_admin" on public.logs
  for select using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- ============================================================================
-- TRIGGER: cria automaticamente um registro em usuarios ao criar auth.users
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, email, nome, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', new.email), 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- STORAGE BUCKET para os arquivos KMZ originais
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('kmz-files', 'kmz-files', false)
on conflict (id) do nothing;

create policy "kmz_storage_read_authenticated" on storage.objects
  for select using (bucket_id = 'kmz-files' and auth.role() = 'authenticated');

create policy "kmz_storage_admin_write" on storage.objects
  for all using (
    bucket_id = 'kmz-files'
    and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );
