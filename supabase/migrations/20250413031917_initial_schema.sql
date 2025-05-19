-- Create usuarios table
create table public.usuarios (
    id uuid primary key default gen_random_uuid(),
    nombre text null,
    email text not null,
    plan text null default 'gratis'::text,
    país text null,
    es_activo boolean null default true,
    fecha_creacion timestamptz not null default timezone('utc'::text, now())
);
comment on table public.usuarios is 'Stores user profile information.';
alter table public.usuarios enable row level security;

-- Create capsulas table
create table public.capsulas (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid null references public.usuarios(id) on delete set null, -- Allow user deletion without deleting capsules? Or cascade? Set null for now.
    titulo text null,
    descripcion text null,
    tipo text null,
    fecha_creacion timestamptz null default timezone('utc'::text, now()), -- Using timestamptz based on usuarios table
    publica boolean null default true,
    enlace_publico text null,
    portada_url text null,
    anclada boolean null default false
);
comment on table public.capsulas is 'Represents content capsules created by users.';
alter table public.capsulas enable row level security;
create index idx_capsulas_usuario_id on public.capsulas(usuario_id);

-- Create recuerdos table
create table public.recuerdos (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid null references public.usuarios(id) on delete cascade, -- Cascade delete if user is deleted
    capsula_id uuid null references public.capsulas(id) on delete cascade, -- Cascade delete if capsule is deleted
    tipo text null,
    url_archivo text not null,
    nombre_archivo text null,
    fecha_subida timestamptz null default timezone('utc'::text, now()), -- Using timestamptz
    mejorado_por_ia boolean null default false,
    limpio_por_ia boolean null default false,
    tamaño bigint null,
    activo boolean null default true,
    ia_acceso boolean null default false,
    latitud numeric null,
    longitud numeric null,
    fecha_real date null,
    ubicacion_manual boolean null default false,
    descripcion text null,
    anclado boolean null default false,
    titulo_personalizado text null,
    es_favorito boolean null default false
);
comment on table public.recuerdos is 'Stores individual media files (photos, audio, video) associated with users and capsules.';
alter table public.recuerdos enable row level security;
create index idx_recuerdos_usuario_id on public.recuerdos(usuario_id);
create index idx_recuerdos_capsula_id on public.recuerdos(capsula_id);

-- Create capsule_invitations table (Needed before capsule_contributors if invitation_id FK exists)
create table public.capsule_invitations (
    id uuid primary key default gen_random_uuid(),
    capsule_id uuid not null references public.capsulas(id) on delete cascade,
    inviter_user_id uuid not null references public.usuarios(id) on delete cascade,
    invitee_email text null,
    share_token text not null default (uuid_generate_v4())::text,
    message text null,
    status text not null default 'pending'::text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    expires_at timestamptz null
);
comment on table public.capsule_invitations is 'Stores invitations to contribute to capsules.';
alter table public.capsule_invitations enable row level security;
create index idx_capsule_invitations_capsule_id on public.capsule_invitations(capsule_id);
create index idx_capsule_invitations_inviter_id on public.capsule_invitations(inviter_user_id);
create index idx_capsule_invitations_token on public.capsule_invitations(share_token);

-- Create capsule_contributors table
create table public.capsule_contributors (
    id uuid primary key default gen_random_uuid(),
    capsule_id uuid not null references public.capsulas(id) on delete cascade,
    user_id uuid not null references public.usuarios(id) on delete cascade,
    role text not null default 'contributor'::text,
    added_at timestamptz not null default timezone('utc'::text, now()),
    invitation_id uuid null references public.capsule_invitations(id) on delete set null, -- Set null if invitation is deleted
    is_visible boolean not null default true,
    unique (capsule_id, user_id) -- Ensure a user can only be a contributor once per capsule
);
comment on table public.capsule_contributors is 'Links users who can contribute to specific capsules.';
alter table public.capsule_contributors enable row level security;
create index idx_capsule_contributors_user_id on public.capsule_contributors(user_id);

-- Create mensajes_programados table
create table public.mensajes_programados (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid null references public.usuarios(id) on delete cascade,
    tipo text null,
    contenido_texto text null,
    id_archivo_asociado uuid null references public.recuerdos(id) on delete set null, -- Set null if recuerdo is deleted
    fecha_entrega timestamptz null, -- Using timestamptz
    nombre_destinatario text null,
    correo_destinatario text null,
    entregado boolean null default false,
    mensaje_personal text null
);
comment on table public.mensajes_programados is 'Stores scheduled messages (potentially legacy or different feature).';
alter table public.mensajes_programados enable row level security;
create index idx_mensajes_programados_usuario_id on public.mensajes_programados(usuario_id);

-- Create comentarios table
create table public.comentarios (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid null references public.usuarios(id) on delete cascade,
    capsula_id uuid null references public.capsulas(id) on delete cascade,
    recuerdo_id uuid null references public.recuerdos(id) on delete cascade,
    contenido text not null,
    fecha timestamptz null default timezone('utc'::text, now()) -- Using timestamptz
);
comment on table public.comentarios is 'Stores comments on capsules or recuerdos.';
alter table public.comentarios enable row level security;
create index idx_comentarios_capsula_id on public.comentarios(capsula_id);
create index idx_comentarios_recuerdo_id on public.comentarios(recuerdo_id);
create index idx_comentarios_usuario_id on public.comentarios(usuario_id);

-- Create contribuciones table
create table public.contribuciones (
    id uuid primary key default gen_random_uuid(),
    capsula_id uuid null references public.capsulas(id) on delete cascade,
    tipo text null,
    url_archivo text null,
    comentario text null,
    nombre_contribuyente text null,
    fecha timestamptz null default timezone('utc'::text, now()), -- Using timestamptz
    latitud numeric null,
    longitud numeric null,
    fuente text null
);
comment on table public.contribuciones is 'Stores contributions made to capsules (possibly by non-users?).';
alter table public.contribuciones enable row level security;
create index idx_contribuciones_capsula_id on public.contribuciones(capsula_id);

-- Create pedidos_fisicos table
create table public.pedidos_fisicos (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid null references public.usuarios(id) on delete set null, -- Keep order even if user deleted
    tipo_producto text null,
    archivo_usado uuid null references public.recuerdos(id) on delete set null, -- Keep order even if recuerdo deleted
    personalización_texto text null,
    dirección_envío text null,
    país text null,
    estado_envío text null default 'pendiente'::text,
    fecha_pedido timestamptz null default timezone('utc'::text, now()), -- Using timestamptz
    precio_total numeric null
);
comment on table public.pedidos_fisicos is 'Stores orders for physical products.';
alter table public.pedidos_fisicos enable row level security;
create index idx_pedidos_fisicos_usuario_id on public.pedidos_fisicos(usuario_id);

-- Create notificaciones table
create table public.notificaciones (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references public.usuarios(id) on delete cascade,
    tipo text not null,
    mensaje text not null,
    leida boolean not null default false,
    fecha_creacion timestamptz not null default timezone('utc'::text, now()),
    metadata jsonb null
);
comment on table public.notificaciones is 'Stores user notifications.';
alter table public.notificaciones enable row level security;
create index idx_notificaciones_usuario_id_leida on public.notificaciones(usuario_id, leida);
