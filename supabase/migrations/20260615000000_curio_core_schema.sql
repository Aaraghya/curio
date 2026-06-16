-- Enable PostgreSQL extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 1. PROFILES TABLE
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SPECIMENS TABLE
create table public.specimens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  summary text not null,
  embedding vector(768) not null,
  origin_source text not null check (origin_source in ('topic', 'url')),
  origin_value text not null,
  rarity_score integer not null check (rarity_score between 1 and 100),
  complexity_score integer not null check (complexity_score between 1 and 100),
  domain_distribution jsonb not null,
  max_depth integer default 0 not null,
  is_public boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. EXPLORATION SESSIONS TABLE
create table public.exploration_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  seed_concept text not null,
  trail_history jsonb not null,
  current_depth integer default 0 not null,
  is_archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CONCEPT CACHE TABLE
create table public.concept_cache (
  id uuid default gen_random_uuid() primary key,
  concept_key text unique not null,
  generated_graph jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. NODES TABLE
create table public.nodes (
  id uuid default gen_random_uuid() primary key,
  specimen_id uuid references public.specimens(id) on delete cascade not null,
  label text not null,
  node_type text not null,
  description text not null,
  domain text not null check (domain in ('Technology', 'History', 'Science', 'Culture'))
);

-- 6. EDGES TABLE
create table public.edges (
  id uuid default gen_random_uuid() primary key,
  specimen_id uuid references public.specimens(id) on delete cascade not null,
  source_node_id uuid references public.nodes(id) on delete cascade not null,
  target_node_id uuid references public.nodes(id) on delete cascade not null,
  connection_type text not null,
  description text not null
);

-- 7. DISCOVERY TRAILS TABLE
create table public.discovery_trails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  specimen_id uuid references public.specimens(id) on delete cascade not null,
  steps jsonb not null,
  total_steps integer not null,
  max_depth integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. CURIOSITY INSIGHTS TABLE
create table public.curiosity_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  insight_text text not null,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. UNEXPECTED CONNECTIONS TABLE
create table public.unexpected_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  specimen_a_id uuid references public.specimens(id) on delete cascade not null,
  specimen_b_id uuid references public.specimens(id) on delete cascade not null,
  bridge_title text not null,
  bridge_explanation text not null,
  similarity_score float not null,  -- Cosine distance score
  uniqueness_score integer not null check (uniqueness_score between 1 and 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_specimen_pair unique (specimen_a_id, specimen_b_id)
);

-- 10. INVESTIGATIONS TABLE (BOARD CONTAINER)
create table public.investigations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. STICKY NOTES TABLE
create table public.sticky_notes (
  id uuid default gen_random_uuid() primary key,
  investigation_id uuid references public.investigations(id) on delete cascade not null,
  kind text not null check (kind in ('Concept', 'Insight', 'Scrap')),
  title text not null,
  body text not null,
  x integer not null,
  y integer not null,
  w integer default 280 not null,
  rotate numeric(4, 2) not null,
  sticker text,
  meta text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. THREADS TABLE
create table public.threads (
  id uuid default gen_random_uuid() primary key,
  investigation_id uuid references public.investigations(id) on delete cascade not null,
  source_note_id uuid references public.sticky_notes(id) on delete cascade not null,
  target_note_id uuid references public.sticky_notes(id) on delete cascade not null,
  topic text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_note_connection unique (source_note_id, target_note_id)
);

-- PERFORMANCE & VECTOR INDEXES
create index if not exists specimens_embedding_idx on public.specimens using hnsw (embedding vector_cosine_ops);
create index if not exists concept_cache_key_idx on public.concept_cache (concept_key);
create index if not exists specimens_user_id_idx on public.specimens (user_id);
create index if not exists nodes_specimen_id_idx on public.nodes (specimen_id);
create index if not exists edges_specimen_id_idx on public.edges (specimen_id);
create index if not exists discovery_trails_user_id_idx on public.discovery_trails (user_id);
create index if not exists exploration_sessions_user_id_idx on public.exploration_sessions (user_id);
create index if not exists sticky_notes_investigation_id_idx on public.sticky_notes (investigation_id);
create index if not exists threads_investigation_id_idx on public.threads (investigation_id);

-- ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.specimens enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.discovery_trails enable row level security;
alter table public.curiosity_insights enable row level security;
alter table public.unexpected_connections enable row level security;
alter table public.exploration_sessions enable row level security;
alter table public.investigations enable row level security;
alter table public.sticky_notes enable row level security;
alter table public.threads enable row level security;

-- ROW LEVEL SECURITY POLICIES

-- Profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Specimens
create policy "Specimens are readable if public or owned by user"
  on public.specimens for select using (is_public = true or auth.uid() = user_id);

create policy "Users can insert their own specimens"
  on public.specimens for insert with check (auth.uid() = user_id);

create policy "Users can update their own specimens"
  on public.specimens for update using (auth.uid() = user_id);

create policy "Users can delete their own specimens"
  on public.specimens for delete using (auth.uid() = user_id);

-- Nodes
create policy "Nodes are readable if parent specimen is accessible"
  on public.nodes for select using (
    exists (
      select 1 from public.specimens 
      where specimens.id = nodes.specimen_id 
        and (specimens.is_public = true or specimens.user_id = auth.uid())
    )
  );

create policy "Users can manage nodes of owned specimens"
  on public.nodes for all using (
    exists (
      select 1 from public.specimens 
      where specimens.id = nodes.specimen_id 
        and specimens.user_id = auth.uid()
    )
  );

-- Edges
create policy "Edges are readable if parent specimen is accessible"
  on public.edges for select using (
    exists (
      select 1 from public.specimens 
      where specimens.id = edges.specimen_id 
        and (specimens.is_public = true or specimens.user_id = auth.uid())
    )
  );

create policy "Users can manage edges of owned specimens"
  on public.edges for all using (
    exists (
      select 1 from public.specimens 
      where specimens.id = edges.specimen_id 
        and specimens.user_id = auth.uid()
    )
  );

-- Discovery Trails
create policy "Users can manage their own discovery trails"
  on public.discovery_trails for all using (auth.uid() = user_id);

-- Curiosity Insights
create policy "Users can manage their own insights"
  on public.curiosity_insights for all using (auth.uid() = user_id);

-- Unexpected Connections
create policy "Users can read unexpected connections if involved"
  on public.unexpected_connections for select using (auth.uid() = user_id);

create policy "Users can manage their own unexpected connections"
  on public.unexpected_connections for all using (auth.uid() = user_id);

-- Exploration Sessions
create policy "Users can manage their own exploration sessions"
  on public.exploration_sessions for all using (auth.uid() = user_id);

-- Investigations
create policy "Users can manage their own investigations"
  on public.investigations for all using (auth.uid() = user_id);

-- Sticky Notes
create policy "Users can manage sticky notes on their investigations"
  on public.sticky_notes for all using (
    exists (
      select 1 from public.investigations 
      where investigations.id = sticky_notes.investigation_id 
        and investigations.user_id = auth.uid()
    )
  );

-- Threads
create policy "Users can manage threads on their investigations"
  on public.threads for all using (
    exists (
      select 1 from public.investigations 
      where investigations.id = threads.investigation_id 
        and investigations.user_id = auth.uid()
    )
  );

-- DATABASE FUNCTIONS

-- 1. Vector Cosine Similarity Search
create or replace function public.match_specimens (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  requesting_user_id uuid
)
returns table (
  id uuid,
  title text,
  summary text,
  user_id uuid,
  similarity float
)
language sql stable security definer
as $$
  select
    specimens.id,
    specimens.title,
    specimens.summary,
    specimens.user_id,
    1 - (specimens.embedding <=> query_embedding) as similarity
  from public.specimens
  where 
    (specimens.is_public = true or specimens.user_id = requesting_user_id)
    and 1 - (specimens.embedding <=> query_embedding) > match_threshold
  order by specimens.embedding <=> query_embedding limit match_count;
$$;

-- 2. Cache Lookup Function
create or replace function public.lookup_concept_cache(query_key text)
returns jsonb
language plpgsql stable
as $$
declare
  result jsonb;
begin
  select generated_graph into result
  from public.concept_cache
  where concept_key = lower(trim(query_key));
  
  return result;
end;
$$;

-- 3. Museum Analytics Helper
create or replace function public.get_user_curiosity_metrics(target_user_id uuid)
returns jsonb
language plpgsql stable security definer
as $$
declare
  result jsonb;
begin
  select json_build_object(
    'total_specimens', count(s.id),
    'deepest_rabbit_hole', coalesce(max(s.max_depth), 0),
    'average_trail_length', coalesce(avg(t.total_steps), 0),
    'domain_breakdown', (
      select json_object_agg(domain_key, total_weight)
      from (
        select key as domain_key, sum(value::text::numeric) as total_weight
        from public.specimens spec,
        jsonb_each(spec.domain_distribution)
        where spec.user_id = target_user_id
        group by key
      ) as sub
    )
  ) into result
  from public.specimens s
  left join public.discovery_trails t on t.specimen_id = s.id
  where s.user_id = target_user_id;

  return result;
end;
$$;

-- 4. Auth Trigger for Profile Sync
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'curious_mind_' || substring(md5(random()::text) from 1 for 6)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Re-create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
