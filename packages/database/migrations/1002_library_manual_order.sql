create table library_order_states (
  owner_id uuid not null references app_users(id) on delete cascade,
  resource_type text not null check (resource_type in ('song','rhyme_note','prompt')),
  row_version bigint not null default 0 check (row_version >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (owner_id,resource_type)
);

create table library_order_items (
  owner_id uuid not null,
  resource_type text not null,
  resource_id uuid not null,
  pin_group boolean not null,
  sort_rank bigint not null check (sort_rank > 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (owner_id,resource_type,resource_id),
  constraint library_order_items_state_fk foreign key (owner_id,resource_type)
    references library_order_states(owner_id,resource_type) on delete cascade,
  constraint library_order_items_resource_fk foreign key (resource_id,owner_id,resource_type)
    references resources(id,owner_id,type) on delete cascade,
  constraint library_order_items_group_rank unique (owner_id,resource_type,pin_group,sort_rank)
    deferrable initially immediate
);

create table library_order_move_requests (
  owner_id uuid not null,
  resource_type text not null,
  request_id uuid not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  item_id uuid not null,
  before_id uuid,
  after_id uuid,
  expected_version bigint not null check (expected_version >= 0),
  result_version bigint not null check (result_version >= 0),
  changed boolean not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (owner_id,resource_type,request_id),
  constraint library_order_move_requests_state_fk foreign key (owner_id,resource_type)
    references library_order_states(owner_id,resource_type) on delete cascade,
  constraint library_order_move_requests_item_fk foreign key (owner_id,resource_type,item_id)
    references library_order_items(owner_id,resource_type,resource_id) on delete cascade,
  constraint library_order_move_requests_before_fk foreign key (owner_id,resource_type,before_id)
    references library_order_items(owner_id,resource_type,resource_id) on delete cascade,
  constraint library_order_move_requests_after_fk foreign key (owner_id,resource_type,after_id)
    references library_order_items(owner_id,resource_type,resource_id) on delete cascade
);

create index library_order_items_sequence_idx
  on library_order_items(owner_id,resource_type,pin_group,sort_rank,resource_id);
create index library_order_move_requests_created_idx
  on library_order_move_requests(owner_id,resource_type,created_at desc);

insert into library_order_states(owner_id,resource_type)
select distinct owner_id,type from resources where type in ('song','rhyme_note','prompt');

insert into library_order_items(owner_id,resource_type,resource_id,pin_group,sort_rank)
select owner_id,type,id,is_pinned,
  row_number() over (
    partition by owner_id,type,is_pinned
    order by pin_order nulls last,updated_at desc,id desc
  ) * 1048576
from resources
where type in ('song','rhyme_note','prompt');

grant select,insert,update on library_order_states,library_order_items to lyricscloud_app;
grant select,insert on library_order_move_requests to lyricscloud_app;

alter table library_order_states enable row level security;
alter table library_order_states force row level security;
alter table library_order_items enable row level security;
alter table library_order_items force row level security;
alter table library_order_move_requests enable row level security;
alter table library_order_move_requests force row level security;

create policy library_order_states_owner_all on library_order_states for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy library_order_items_owner_all on library_order_items for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy library_order_move_requests_owner_select on library_order_move_requests for select to lyricscloud_app
  using (owner_id=app_current_user_id());
create policy library_order_move_requests_owner_insert on library_order_move_requests for insert to lyricscloud_app
  with check (owner_id=app_current_user_id());

comment on table library_order_states is 'Per-owner manual library sequence version used for optimistic concurrency.';
comment on table library_order_items is 'Server-owned sparse manual ranks separated by pin group.';
comment on table library_order_move_requests is 'Idempotency ledger for anchor-based manual moves; request payloads are stored only as hashes and ids.';
