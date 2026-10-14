-- My Training 2.0: replace the update RPC validation with POSIX regex.
-- Keeps existing rows and permissions. Apply via Supabase SQL Editor.
begin;
create or replace function public.training_update_if_revision(
 p_kind text, p_item_id text, p_expected_revision bigint, p_payload jsonb,
 p_delete boolean default false
)
returns table(applied boolean, current_revision bigint, conflict boolean)
language plpgsql security definer set search_path = ''
as $$
declare v_revision bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_kind <> 'workout' or p_item_id is null or length(p_item_id)>200
    or p_expected_revision is null or p_expected_revision<1
    or p_payload is null or jsonb_typeof(p_payload)<>'object'
    or p_payload->>'id' is distinct from p_item_id
    or (not p_delete and (
      coalesce((p_payload->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',false)=false
      or coalesce(p_payload->>'type','')=''
      or coalesce((p_payload->>'minutes') ~ '^[0-9]+([.][0-9]+)?$',false)=false
    ))
 then raise exception 'Invalid workout update' using errcode='22023'; end if;
 update public.training_items as t
 set payload=case when p_delete then t.payload else p_payload end,
     revision=t.revision+1,updated_at=now(),
     deleted_at=case when p_delete then now() else null end
 where t.user_id=auth.uid() and t.kind=p_kind and t.item_id=p_item_id
   and t.revision=p_expected_revision and t.deleted_at is null
 returning t.revision into v_revision;
 if found then return query select true,v_revision,false;return;end if;
 select t.revision into v_revision from public.training_items t
 where t.user_id=auth.uid() and t.kind=p_kind and t.item_id=p_item_id;
 return query select false,v_revision,(v_revision is not null);
end;
$$;
revoke all on function public.training_update_if_revision(text,text,bigint,jsonb,boolean) from public;
revoke all on function public.training_update_if_revision(text,text,bigint,jsonb,boolean) from anon;
grant execute on function public.training_update_if_revision(text,text,bigint,jsonb,boolean) to authenticated;
commit;
