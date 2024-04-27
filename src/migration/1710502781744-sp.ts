import {MigrationInterface, QueryRunner} from "typeorm";

export class sp1710502781744 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`create or replace function updateAccount(
            pService in integer,
            pUid in bigint,
            pName in text,
            pChat in bigint,
            pFirst in text,
            pLast in text,
            pLang in text
          ) returns integer
          as $$
          declare
            lId integer default null;
            lCn integer;
          begin
            select id into lId from users where user_id = pUid;
            if lId is null then
               insert into users(username, firstname, lastname, user_id, chat_id, lang)
               values (pName, pFirst, pLast, pUid, pChat, pLang)
               returning id into lId;
            else
               update users set username = pName, firstname = pFirst, lastname = pLast, updated = now()
               where user_id = pUid;
            end if;
            select count(*) into strict lCn
            from user_service where user_id = lId and service_id = pService;
            if lCn = 0 then
               insert into user_service(user_id, service_id, is_developer)
               select lId, pService, a.default_developer
               from   service a
               where  a.id = pService;
               insert into user_context(user_id, service_id, script_id, priority)
               select lId, pService, a.id, a.priority
               from   script a
               inner  join user_service b on (b.id = a.service_id and b.service_id = pService)
               where  b.user_id = lId and a.is_default;
               insert into user_context(user_id, service_id, command_id, priority)
               select lId, pService, a.id, a.priority
               from   command a
               where  a.is_default and coalesce(a.service_id, pService) = pService;
            end if;
            return lId;
          end;
          $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function saveMessage(
          pMessage in bigint,
          pUser in integer,
          pService in integer,
          pLang in text,
          pData in text,
          pReply in bigint
        ) returns integer
        as $$
        declare
          lId integer default null;
        begin
          insert into message(user_id, service_id, lang, message_id, data, reply_for)
          values (pUser, pService, pLang, pMessage, pData, pReply)
          returning id into lId;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function addCommand(
          pUser in integer,
          pService in integer,
          pCommand in integer
        ) returns integer
        as $$
        declare
          lId integer default null;
        begin
          delete from user_context where user_id = pUser and service_id = pService and not command_id is null;
          insert into user_context(user_id, service_id, command_id)
          values (pUser, pService, pCommand)
          returning id into lId;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function startCommand(
          pContext in integer
        ) returns integer
        as $$
        declare
          lId integer;
        begin
          select x.id into strict lId
          from ( select b.id, row_number() over (order by b.order_num) as rn
                 from   user_context a
                 inner  join action b on (b.command_id = a.command_id and b.parent_id is null)
                 where  a.location_id is null and a.id = pContext) x
          where  x.rn = 1;
          update user_context set location_id = lId
          where id = pContext;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function cancelContexts(
          pUser in integer,
          pService in integer
        ) returns json
        as $$
        begin
          delete from param_value
          where context_id in (select id from user_context where user_id = pUser and service_id = pService);
          delete from user_context where user_id = pUser and service_id = pService 
          and command_id in (select id from command where not is_default);
          delete from user_context where user_id = pUser and service_id = pService 
          and script_id in (select id from script where not is_default);
          return json_object();
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function setLang(
          pUser in integer,
          pLang in text
        ) returns json
        as $$
        begin
          update users set lang = pLang
          where id = pUser;
          return json_object();
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function startCommands(
          pService in integer
        ) returns integer
        as $$
        declare
          r record;
          lCn integer default 0;
        begin
          for r in
              select a.id as context_id, c.id as action_id
              from   user_context a
              inner  join command b on (b.id = a.command_id)
              inner  join action c on (c.command_id = b.id and c.order_num = 1 and c.parent_id is null)
              where  a.service_id = pService
              and    a.closed is null and a.location_id is null
          loop
              update user_context set location_id = r.action_id
              where id = r.context_id;
              lCn := lCn + 1;
          end loop;
          return lCn;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function getActions(
          pService in integer
        ) returns setof json
        as $$
        declare
          r record;
        begin
          for r in
              select x.id, x.action_id, b.type_id
              from ( select a.id, a.location_id as action_id, a.updated,
                            row_number() over (partition by a.user_id order by a.priority desc) as rn
                     from   user_context a
                     where  a.service_id = pService and not a.is_waiting
                     and    a.closed is null and not a.command_id is null ) x
              inner  join action b on (b.id = x.action_id)
              where  x.rn = 1
              order  by x.updated
          loop
              return next row_to_json(r);
          end loop;
          return;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function setFirstAction(
          pContext in integer,
          pAction in integer
        ) returns integer
        as $$
        declare
          lId integer default null;
        begin
          select x.id into strict lId
          from ( select a.id, row_number() over (order by a.order_num) as rn
                 from   action a
                 where  a.parent_id = pAction ) x
          where  x.rn = 1;
          update user_context set location_id = lId
          where id = pContext;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function setNextAction(
          pContext in integer
        ) returns integer
        as $$
        declare
          lId integer default null;
          lCommand integer;
          lParent integer;
          lOrder integer;
        begin
          select a.command_id, b.parent_id, b.order_num
          into strict lCommand, lParent, lOrder
          from   user_context a
          inner  join action b on(b.command_id = a.command_id and b.id = a.location_id)
          where  a.id = pContext;
          select x.id into lId
          from ( select a.id, row_number() over (order by a.order_num) as rn
                 from   action a
                 where  a.command_id = lCommand and coalesce(a.parent_id, 0) = coalesce(lParent, 0)
                 and    a.order_num > lOrder ) x
          where  x.rn = 1;
          while lId is null and not lParent is null loop
             select a.parent_id, a.order_num
             into   strict lParent, lOrder
             from   action a
             where  a.id = lParent and a.command_id = lCommand;
             select x.id into lId
             from ( select a.id, row_number() over (order by a.order_num) as rn
                    from   action a
                    where  a.command_id = lCommand and coalesce(a.parent_id, 0) = coalesce(lParent, 0)
                    and    a.order_num > lOrder ) x
             where  x.rn = 1;
          end loop;
          if lId is null then
             update user_context set closed = now() where id = pContext;
             delete from user_context
             where command_id in (select id from command where not is_default)
             and closed;
          else
             update user_context set location_id = lId
             where id = pContext;
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function waitValue(
          pContext in integer,
          pMsg in bigint,
          pHidden in boolean
        ) returns integer
        as $$
        declare
          lHidden boolean default false;
        begin
          if not pHidden then
             select coalesce(p.is_hidden, false)
             into   strict lHidden
             from   user_context c 
             inner  join action a on (a.command_id = c.command_id and a.id = c.locations_id)
             left   join param_type p on (p.id = a.param_id)
             where  c.id = pContext;
          end if;
          if pHidden or lHidden then
             update user_context set is_waiting = true, hide_id = pMsg
             where id = pContext;
          else
             update user_context set is_waiting = true
             where id = pContext;
          end if;
          return 1;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function setWaitingParam(
          pContext in integer,
          pValue in text
        ) returns integer
        as $$
        declare
          lParam integer default null;
          lId integer default null;
        begin
          select b.param_id into lParam
          from   user_context a
          inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
          where  a.id = pContext and a.is_waiting;
          if not lParam is null then
             select id into lId
             from   param_value
             where  context_id = pContext and param_id = lParam;
             if lId is null then
                insert into param_value(context_id, param_id, value)
                values (pContext, lParam, pValue)
                returning id into lId;
             else
                update param_value set value = pValue, updated = now()
                where context_id = pContext and param_id = lParam;
             end if;
          end if;
          update user_context set is_waiting = false, hide_id = null
          where id = pContext;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function chooseItem(
          pContext in integer,
          pAction in integer
        ) returns integer
        as $$
        declare
          lId integer default pAction;
          lType integer;
        begin
          loop
             select x.id, x.type_id into lId, lType
             from ( select a.id, a.type_id, row_number() over (order by a.order_num) as rn
                    from   action a
                    where  a.command_id = lCommand and a.parent_id = lId ) x
             where  x.rn = 1;
             exit when not lId is null and lType <> 1; 
          end loop;
          update user_context set location_id = lId, is_waiting = false, hide_id = null
          where id = pContext;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function setParamValue(
          pContext in integer,
          pParam in integer,
          pValue in text
        ) returns integer
        as $$
        declare
          lId integer default null;
        begin
          select id into lId from param_value
          where  context_id = pContext and param_id = lParam;
          if lId is null then
             insert into param_value(context_id, param_id, value)
             values (pContext, pParam, pValue)
             returning id into lId;
          else
             update param_value set value = pValue, updated = now()
             where context_id = pContext and param_id = pParam;
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function setResultAction(
          pContext in integer,
          pResult in text
        ) returns integer
        as $$
        declare
          lId integer default null;
        begin
          select c.id into lId
          from   user_context a
          inner  join action b on (b.command_id = a.command_id and b.id = a.locations_id)
          inner  join action c on (c.parent_id = b.id)
          where  a.id = pContext and c.result_code = pResult;
          if not lId is null then
             update user_context set location_id = lId
             where id = pContext;
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function saveQuestParamValue(
          pCtx in integer,
          pIx in integer,
          pValue in integer
        ) returns integer
        as $$
        declare
          lId integer;
        begin
          select max(id) into lId 
          from param_value where context_id = pCtx and ix = pIx;
          if lId is null then
             insert into param_value(context_id, ix, value)
             values (pCtx, pIx, pValue)
             returning id into lId;
          else
             update param_value set value = pValue, updated = now()
             where id = lId;
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function saveQuestParamHidden(
          pCtx in integer,
          pIx in integer,
          pHidden in boolean
        ) returns integer
        as $$
        declare
          lId integer;
        begin
          select max(id) into lId 
          from param_value where context_id = pCtx and ix = pIx;
          if not lId is null then
             update param_value set hidden = pHidden, updated = now()
             where id = lId;
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function saveQuestLocation(
          pCtx in integer,
          pLoc in integer
        ) returns integer
        as $$
        begin
          update user_context set location_id = pLoc
          where id = pCtx;
          return pLoc;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function checkQuest(
          pUser in integer,
          pService in integer
        ) returns json
        as $$
        declare
          x record;
          r json default null;
        begin
          for x in
              select 1 as result_code, b.name as quest
              from   user_context a
              inner  join script b on (b.id = a.script_id and not b.is_default)
              where  a.user_id = pUser and a.service_id = pService and a.closed is null
              order  by a.created desc
              limit  1
          loop
            r := row_to_json(x);
          end loop;
          return r;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function cancelQuest(
          pUser in integer,
          pService in integer
        ) returns json
        as $$
        declare
          x record;
          r json default null;
        begin
          for x in
              select a.id
              from   user_context a
              inner  join script b on (b.id = a.script_id and not b.is_default)
              where  a.user_id = pUser and a.service_id = pService and a.closed is null
              order  by a.created desc
              limit  1
          loop
            update user_context set closed = now() where id = x.id;
            r := row_to_json(x);
          end loop;
          return r;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function getQuests(
          pUser in integer,
          pService in integer,
          pName in text
        ) returns json
        as $$
        declare
          x record;
          r json default null;
          n integer default 0;
          lLang text default null;
          lMenu text default '';
          lId integer default null;
        begin
          select lang into lLang from users where id = pUser;
          for x in
            select z.id, z.name
            from ( select a.id, a.name, a.version,
                          max(a.version) over (partition by a.commonname) as max_version
                   from   script a
                   where  a.service_id = pService and not a.is_default
                   and    a.lang = lLang and a.is_shared
                   and  ( coalesce(pName, a.commonname) = a.commonname or coalesce(pName, a.name) = a.name or coalesce(pName, a.filename) = a.filename )) z
            where  z.version = z.max_version
            order  by z.name
          loop
            if lMenu <> '' then lMenu := lMenu || ','; end if;
            lMenu := lMenu || x.id || ':' + x.name;
            lId := x.id;
            n := n + 1;
          end loop;
          if n = 0 then
             for x in
                select z.id, z.name
                from ( select a.id, a.name, a.version,
                              max(a.version) over (partition by a.commonname) as version
                       from   script a
                       where  a.service_id = pService and not a.is_default
                       and    a.lang = 'en' and a.is_shared
                       and  ( coalesce(pName, a.commonname) = a.commonname or coalesce(pName, a.name) = a.name or coalesce(pName, a.filename) = a.filename )) z
                where  z.version = z.max_version
                order  by z.name
              loop
                if lMenu <> '' then lMenu := lMenu || ','; end if;
                lMenu := lMenu || x.id || ':' + x.name;
                lId := x.id;
                n := n + 1;
              end loop;
          end if;
          for x in
            select case
                      when n > 1 then 1
                      else 0
                   end as result_code,
                   case
                      when n == 0 then ''
                      when n == 1 then '' || lId
                      else lMenu
                   end as menu
          loop
            r := row_to_json(x);
          end loop;
          return r;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function refreshQuest(
          pUser in integer,
          pService in integer
        ) returns json
        as $$
        declare
          x record;
          r json default null;
          lOld integer default null;
          lNew integer default null;
          lName text;
          lVersion integer;
          lLang text default null;
        begin
          select lang into lLang from users where id = pUser;
          select b.id, b.commonname, b.version
          into   lOld, lName, lVersion
          from   user_context a
          inner  join script b on (b.id = a.script_id and not b.is_default)
          where  a.user_id = pUser and a.service_id = pService and a.closed is null
          order  by a.created desc
          limit  1;
          if not lId is null then
             select a.id into lNew
             from   script a
             where  a.service_id = pService and not a.is_default
             and    a.lang = lLang and a.is_shared
             and    a.common_name = lName and a.version = lVersion;
          end if;
          for x in
              select case
                       when lNew is null then 0
                       else 1
                     end as result_code,
                     coalesce(lNew, lOld) as id
          loop
            r := row_to_json(x);
          end loop;
          return r;
        end;
        $$ language plpgsql VOLATILE`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`drop function updateAccount(integer, bigint, text, bigint, text, text, text)`);
      await queryRunner.query(`drop function saveMessage(bigint, integer, integer, text, text, bigint)`);
      await queryRunner.query(`drop function function addCommand(integer, integer, integer)`);
      await queryRunner.query(`drop function function startCommand(integer)`);
      await queryRunner.query(`drop function function cancelContexts(integer, integer)`);
      await queryRunner.query(`drop function function setLang(integer, text)`);
      await queryRunner.query(`drop function function startCommands(integer)`);
      await queryRunner.query(`drop function function getActions(integer)`);
      await queryRunner.query(`drop function function setFirstAction(integer, integer)`);
      await queryRunner.query(`drop function function setNextAction(integer)`);
      await queryRunner.query(`drop function function waitValue(integer, bigint, boolean)`);
      await queryRunner.query(`drop function function setWaitingParam(integer,text)`);
      await queryRunner.query(`drop function function chooseItem(integer, integer)`);
      await queryRunner.query(`drop function function setParamValue(integer, integer, text)`);
      await queryRunner.query(`drop function function setResultAction(integer, text)`);
      await queryRunner.query(`drop function function saveQuestParamValue(integer, integer, integer)`);
      await queryRunner.query(`drop function function saveQuestParamHidden(integer, integer, boolean)`);
      await queryRunner.query(`drop function function saveQuestLocation(integer, integer)`);
      await queryRunner.query(`drop function function checkQuest(integer, integer)`);
      await queryRunner.query(`drop function function cancelQuest(integer, integer)`);
      await queryRunner.query(`drop function function getQuests(integer, integer, text)`);
      await queryRunner.query(`drop function function refreshQuest(integer, integer)`);
    }
}
