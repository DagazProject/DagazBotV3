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
               from   user_service b
               inner  join script a on (a.service_id = b.service_id and a.is_default)
               where  b.user_id = lId;
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
          delete from param_value 
          where context_id in ( select id from user_context where user_id = pUser and service_id = pService and not command_id is null );
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
          return json_object('{}');
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
          return json_object('{}');
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
              select x.id, x.action_id, b.type_id, b.param_id, c.service_id
              from ( select a.id, a.location_id as action_id, a.updated,
                            row_number() over (partition by a.user_id order by a.priority desc) as rn
                     from   user_context a
                     where  a.service_id = pService and not a.is_waiting
                     and    a.closed is null and not a.command_id is null ) x
              inner  join action b on (b.id = x.action_id)
              inner  join command c on (c.id = b.command_id)
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
          lType integer;
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
             select a.parent_id, a.order_num, b.type_id
             into   strict lParent, lOrder, lType
             from   action a
             left   join action b on (b.command_id = a.command_id and b.id = a.parent_id)
             where  a.id = lParent and a.command_id = lCommand;
             exit   when lType in (5, 6, 7);
             select x.id into lId
             from ( select a.id, row_number() over (order by a.order_num) as rn
                    from   action a
                    where  a.command_id = lCommand and coalesce(a.parent_id, 0) = coalesce(lParent, 0)
                    and    a.order_num > lOrder ) x
             where  x.rn = 1;
          end loop;
          if lId is null then
             delete from param_value where context_id = pContext;
             delete from user_context where id = pContext;
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
             inner  join action a on (a.command_id = c.command_id and a.id = c.location_id)
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
          lCommand integer;
          lId integer default pAction;
          lType integer;
        begin
          select a.command_id into strict lCommand
          from user_context a where a.id = pContext;
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
          where  context_id = pContext and param_id = pParam;
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
          inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
          inner  join action c on (c.parent_id = b.id)
          where  a.id = pContext and c.result_code = pResult;
          if not lId is null then
             update user_context set location_id = lId
             where id = pContext;
          else
             perform setNextAction(pContext);
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function saveQuestParamValue(
          pCtx in integer,
          pIx in integer,
          pValue in integer,
          pHidden in boolean
        ) returns integer
        as $$
        declare
          lId integer;
        begin
          select max(id) into lId 
          from param_value where context_id = pCtx and ix = pIx;
          if lId is null then
             insert into param_value(context_id, ix, value, hidden)
             values (pCtx, pIx, pValue, pHidden)
             returning id into lId;
          else
             update param_value set value = pValue, hidden = pHidden, updated = now()
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
                   and    a.lang = lLang and (a.is_shared or coalesce(pName, '') <> '')
                   and  ( coalesce(pName, a.commonname) = a.commonname or coalesce(pName, a.name) = a.name or coalesce(pName, a.filename) = a.filename )) z
            where  z.version = z.max_version
            order  by z.name
          loop
            if lMenu <> '' then lMenu := lMenu || ','; end if;
            lMenu := lMenu || x.id || ':' || x.name;
            lId := x.id;
            n := n + 1;
          end loop;
          if n = 0 then
             for x in
                 select z.id, z.name
                 from ( select a.id, a.name, a.version,
                               max(a.version) over (partition by a.commonname) as max_version
                        from   script a
                        where  a.service_id = pService and not a.is_default
                        and    a.lang = 'en' and (a.is_shared or coalesce(pName, '') <> '')
                        and  ( coalesce(pName, a.commonname) = a.commonname or coalesce(pName, a.name) = a.name or coalesce(pName, a.filename) = a.filename )) z
                  where  z.version = z.max_version
                  order  by z.name
             loop
                  if lMenu <> '' then lMenu := lMenu || ','; end if;
                  lMenu := lMenu || x.id || ':' || x.name;
                  lId := x.id;
                  n := n + 1;
             end loop;
          end if;
          if n = 0 then
             for x in
                select z.id, z.name
                from ( select a.id, a.name, a.version,
                              max(a.version) over (partition by a.commonname) as max_version
                       from   script a
                       where  a.service_id = pService and not a.is_default
                       and    a.lang = lLang and a.is_shared ) z
                where  z.version = z.max_version
                order  by z.name
              loop
                if lMenu <> '' then lMenu := lMenu || ','; end if;
                lMenu := lMenu || x.id || ':' || x.name;
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
                      when n = 0 then ''
                      when n = 1 then '' || lId
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
        await queryRunner.query(`create or replace function setGlobalValue(
          pUser in integer,
          pParam in integer,	
          pType in integer,
          pScript in integer,
          pValue in integer,
          pLimit in integer
        ) returns integer
        as $$
        declare
          lId integer default null;
          lValue integer default null;
          lMax integer default null;
          lMin integer default null;
          lOld integer default null;
        begin
          select min_value, max_value
          into strict lMin, lMax
          from global_param where id = pParam;
          select id, value into lId, lOld
          from global_value 
          where user_id = pUser and param_id = pParam
          and script_id is null;
          if pLimit is null then
             lValue := pValue;
          else
             select coalesce(max(value), 0) - pLimit into lValue
             from global_value where id = lId;
             if lValue <= 0 then
                lValue := pValue;
             else
                lValue := lValue + pValue;
             end if;
          end if;
          if lValue < lMin then lValue := lMin; end if;
          if lValue > lMax then lValue := lMax; end if;
          if lId is null then
             insert into global_value(param_id, user_id, value)
             values (pParam, pUser, lValue)
             returning id into lId;
          else
             update global_value set value = lValue
             where id = lId;
          end if;
          if lOld <> lValue and pScript is null then
             insert into global_log(value_id, type_id, script_id, delta_value)
             values (lId, pType, pScript, lValue - coalesce(lOld, 0));
          end if;
          return lValue;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function addGlobalValue(
          pUser in integer,
          pParam in integer,	
          pScript in integer,
          pValue in integer
        ) returns integer
        as $$
        declare
          lId integer default null;
          lValue integer default null;
          lDef integer default null;
          lMax integer default null;
          lMin integer default null;
        begin
          select min_value, max_value, def_value 
          into strict lMin, lMax, lDef
          from global_param where id = pParam;
          select id, value + pValue into lId, lValue
          from global_value 
          where user_id = pUser and param_id = pParam
          and coalesce(script_id, 0) = coalesce(pScript, 0);
          if lId is null then
             lValue := pValue;
          end if;          
          if lValue < lMin then lValue := lMin; end if;
          if lValue > lMax then lValue := lMax; end if;
          if lId is null then
             insert into global_value(param_id, user_id, script_id, value)
             values (pParam, pUser, pScript, lValue)
             returning id into lId;
          else
             update global_value set value = lValue
             where id = lId;
          end if;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function createQuestContext(
          pContext in integer,	
          pScript in integer,
          pLoc in bigint
        ) returns integer
        as $$
        declare
          lUser integer;
          lService integer;
          lPriority integer;
          lId integer default null;
        begin
          select user_id, service_id into strict lUser, lService
          from user_context where id = pContext;
          delete from param_value
          where context_id in ( select id from user_context where user_id = lUser and service_id = lService and not script_id is null );
          delete from user_context
          where user_id = lUser and service_id = lService
          and not script_id is null;
          select priority into strict lPriority
          from script where id = pScript;
          insert into user_context(user_id, service_id, script_id, location_id, priority)
          values (lUser, lService, pScript, pLoc, lPriority)
          returning id into lId;
          perform addGlobalValue(lUser, 1, pScript, 1);
          perform addGlobalValue(lUser, 1, null, 1);
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function closeContext(
          pContext in integer
        ) returns integer
        as $$
        declare
          lCn integer;
        begin
          select count(*) into lCn from user_context where id = pContext;
          delete from param_value where context_id = pContext;
          delete from user_context where id = pContext;
          return lCn;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function winQuest(
          pUser in integer,
          pScript in integer
        ) returns integer
        as $$
        declare
          lDef integer;
          lValue integer;
          lBonus integer;
        begin
          select def_value into strict lDef from global_param where id = 3;
          select win_bonus into strict lBonus from script where id = pScript;
          perform addGlobalValue(pUser, 2, pScript, 1);
          perform addGlobalValue(pUser, 2, null, 1);
          if not lBonus is null then
             select coalesce(max(value), lDef) + lBonus into lValue
             from global_value where user_id = pUser and param_id = 3 and script_id is null;
             lValue := setGlobalValue(pUser, 3, 1, pScript, lValue, null);
          end if;
          return lValue;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function failQuest(
          pUser in integer,
          pScript in integer
        ) returns integer
        as $$
        declare
          lDef integer;
          lValue integer;
        begin
          select def_value into strict lDef from global_param where id = 3;
          select coalesce(max(value), lDef) into lValue
          from global_value where user_id = pUser and param_id = 3 and script_id is null;
          perform addGlobalValue(pUser, 5, pScript, 1);
          perform addGlobalValue(pUser, 5, null, 1);
          return lValue;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function deathQuest(
          pUser in integer,
          pScript in integer
        ) returns integer
        as $$
        declare
          lDef integer;
          lValue integer;
          lBonus integer;
        begin
          select def_value into strict lDef from global_param where id = 3;
          select death_penalty into strict lBonus from script where id = pScript;
          perform addGlobalValue(pUser, 4, pScript, 1);
          perform addGlobalValue(pUser, 4, null, 1);
          if not lBonus is null then
             select coalesce(max(value), lDef) - lBonus into lValue
             from global_value where user_id = pUser and param_id = 3 and script_id is null;
             lValue := setGlobalValue(pUser, 3, 1, pScript, lValue, null);
          end if;
          return lValue;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function uploadScript(
          pUser in integer,
          pService in integer,
          pName in text,
          pFilename in text,
          pParam in integer
        ) returns integer
        as $$
        declare
          lLang text;
          lUser integer;
          lService integer;
          lId integer;
        begin
          select lang, id into strict lLang, lUser
          from users where user_id = pUser;
          select id into strict lService 
          from user_service where user_id = lUser and service_id = pService;
          insert into script(id, service_id, user_id, filename, name, lang, commonname)
          values (nextval('script_seq'), pService, pUser, pFilename, pName, lLang, pName)
          returning id into lId;
          if not pParam is null then
             insert into global_fixup(param_id, script_id, param_num)
             values (3, lId, pParam);
          end if;
          update user_service set is_developer = true
          where id = lService;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function uploadImage(
          pUser in integer,
          pService in integer,
          pName in text,
          pFilename in text
        ) returns integer
        as $$
        declare
          lUser integer;
          lService integer;
          lId integer;
          lVersion integer;
        begin
          select id into strict lUser
          from users where user_id = pUser;
          select id into strict lService 
          from user_service where user_id = lUser and service_id = pService;
          select coalesce(max(a.version), 0) + 1 into lVersion
          from   image a
          where  a.name = pName and a.user_id = lUser;
          insert into image(service_id, filename, name, user_id, version)
          values (lService, pFilename, pName, lUser, lVersion)
          returning id into lId;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function questText(
          pScript in integer,
          pType in integer,
          pText in text
        ) returns integer
        as $$
        declare
          lId integer;
        begin
          insert into quest_text(type_id, script_id, value)
          values (pType, pScript, pText)
          returning id into lId;
          return lId;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function joinToSession(
          pContext in integer
        ) returns setof json
        as $$
        declare
          lUser integer;
          lService integer;
          lScript integer;
          lSession integer default null;
          lType integer;
          lNum integer;
          x record;
        begin
          select a.user_id, a.service_id, a.script_id into strict lUser, lService, lScript
          from user_context a where a.id = pContext;
          select a.sessiontype_id into strict lType
          from script a where  a.id = lScript;
          for x in
              select a.id as session_id
              from   session a
              inner  join script b on (b.id = a.script_id)
              inner  join session_type c on (c.id = a.sessiontype_id)
              inner  join script d on (d.commonname = b.commonname and d.version = b.version)
              left   join user_session e on (e.session_id = a.id and e.user_id = lUser)
              where  a.service_id = lService and a.curr_users < c.max_users
              and    d.id = lScript and e.id is null
              limit  1
          loop
              select id into strict lSession 
              from session where id = x.session_id for update;
          end loop;
          if lSession is null then
             insert into session(sessiontype_id, service_id, script_id)
             values (lType, lService, lScript)
             returning id into lSession;
          end if;
          update user_context set session_id = lSession where id = pContext;
          update session set curr_users = curr_users + 1 where id = lSession;
          select a.curr_users into strict lNum from session a where a.id = lSession;
          insert into user_session(user_id, session_id, user_num)
          values (lUser, lSession, lNum);
          for x in
              select lSession as id, lNum as user_num,
                     a.index_param, a.start_param, a.param_count
              from   session_type a
              where  a.id = lType
          loop
              return next row_to_json(x);
          end loop;
          return;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create or replace function addSessionParams(
          pContext in integer,
          pParams in text
        ) returns setof json
        as $$
        declare
          lSession integer;
          lUser integer;
          lSlot integer;
          lId integer;
          lCnt integer;
          x record;
          ix integer default 1;
        begin
          select a.user_id, b.id, b.slot_index, b.curr_users
          into   strict lUser, lSession, lSlot, lCnt
          from   user_context a
          inner  join session b on (b.id = a.session_id)
          where  a.id = pContext;
          for x in
              select a.value::integer as v
              from json_array_elements_text(pParams::json) a
          loop
              select max(id) into lId
              from   session_param a
              where  a.session_id = lSession and a.user_id = lUser 
              and    a.slot_index = lSlot and a.param_index = ix;
              if lId is null then
                 insert into session_param(session_id, user_id, slot_index, param_index, param_value)
                 values (lSession, lUser, lSlot, ix, x.v);
              else
                 update session_param set param_value = x.v
                 where id = lId;
              end if;
              ix := ix + 1;
          end loop;
          select lCnt - count(distinct a.user_id) into lCnt
          from   session_param a
          where  a.session_id = lSession and a.slot_index = lSlot;
          if lCnt = 0 then
             update session set slot_index = slot_index + 1
             where id = lSession;
          end if;
          for x in
              select lSlot as slot,
                     lCnt as left_users
          loop
              return next row_to_json(x);
          end loop;
          return;
        end;
        $$ language plpgsql VOLATILE`);
        await queryRunner.query(`create view context_vw as
        select a.id, b.filename, coalesce(u.firstname, u.username) as username,
               a.location_id, u.id as user_id, b.id as script_id,
               a.service_id
        from   user_context a
        inner  join users u on (u.id = a.user_id)
        inner  join script b on (b.id = a.script_id)`);
       await queryRunner.query(`create view context_action_vw as
       select a.id as ctx, b.param_id, a.hide_id,
              a.user_id, a.service_id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       where  a.is_waiting`);
       await queryRunner.query(`create view waiting_vw as
       select b.id as ctx, p.param_id, b.hide_id, 
              b.user_id, b.service_id, a.id as action_id
       from   action a
       inner  join user_context b on (b.command_id = a.command_id and b.location_id = a.parent_id and b.is_waiting)
       inner  join action p on (p.id = a.parent_id)`);
       await queryRunner.query(`create view user_service_vw as
       select a.is_developer, b.lang,
              a.user_id, a.service_id
       from   user_service a
       inner  join users b on (b.id = a.user_id)`);
       await queryRunner.query(`create view command_param_vw as
       select b.id, b.name, b.default_value, a.order_num,
              row_number() over (order by a.order_num) as rn,
              a.command_id
       from   command_param a
       inner  join param_type b on (b.id = a.param_id)`);
       await queryRunner.query(`create view caption_vw as
       select coalesce(c.value, d.value) as value, u.chat_id, b.param_id,
              coalesce(c.lang, d.lang) as lang, coalesce(b.width, 1) as width, a.id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       inner  join users u on (u.id = a.user_id)
       left   join localized_string c on (c.action_id = b.id and c.lang = u.lang)
       inner  join localized_string d on (d.action_id = b.id and d.lang = 'en')`);
       await queryRunner.query(`create view request_vw as
       select a.user_id, a.service_id, b.request, b.request_type, a.id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)`);
       await queryRunner.query(`create view sp_param_vw as
       select d.id, c.name, coalesce(coalesce(e.value, d.default_value), c.default_value) as value, c.order_num,
              row_number() over (order by c.order_num) as rn, a.id as ctx_id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       inner  join request_param c on (action_id = b.id)
       left   join param_type d on (d.id = c.param_id)
       left   join param_value e on (e.param_id = d.id and e.context_id = a.id)`);
       await queryRunner.query(`create view sp_result_vw as
       select c.name, c.param_id, a.id
       from   user_context a
       inner  join action b on (b.command_id = a.command_id and b.id = a.location_id)
       inner  join response_param c on (action_id = b.id)`);
       await queryRunner.query(`create view user_ctx_vw as
       select b.id, b.user_id, coalesce(b.firstname, b.username) as name, b.chat_id, a.id as ctx_id
       from   user_context a
       inner  join users b on (b.id = a.user_id)`);
       await queryRunner.query(`create view message_vw as
       select b.message_id, c.chat_id, a.message_id as id
       from   client_message a
       inner  join message b on (b.id = a.parent_id)
       inner  join users c on (c.id = b.user_id)`);
       await queryRunner.query(`create view scheduled_vw as
       select a.command_id, a.timeout, b.service_id
       from   task a
       inner  join command b on (b.id = a.command_id)`);
       await queryRunner.query(`create view credits_vw as
       select b.value, a.user_id
       from   users a 
       inner  join global_value b on (b.user_id = a.id and b.param_id = 3)`);
       await queryRunner.query(`create view session_vw as
       select b.user_num, coalesce(d.firstname, d.username) as name, a.id
       from   session a
       inner  join user_session b on (b.session_id = a.id)
       inner  join session_type c on (c.id = a.sessiontype_id and a.curr_users >= c.min_users and a.curr_users <= c.max_users)
       inner  join users d on (d.id = b.user_id)`);
       await queryRunner.query(`create view completed_session_vw as
       select a.id
       from   session a
       inner  join session_type c on (c.id = a.sessiontype_id and a.curr_users >= c.min_users and a.curr_users <= c.max_users)`);
       await queryRunner.query(`create view session_param_vw as
       select b.user_num, a.param_index, a.param_value,
              a.session_id, a.slot_index
       from   session_param a
       inner  join user_session b on (b.session_id = a.session_id and b.user_id = a.user_id)`);
       await queryRunner.query(`create view decorate_vw as
       select b.filename || ':' || a.location_id as loc, a.user_id
       from   user_context a
       inner  join script b on (b.id = a.script_id)`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`drop view decorate_vw`);
      await queryRunner.query(`drop view session_param_vw`);
      await queryRunner.query(`drop view completed_session_vw`);
      await queryRunner.query(`drop view session_vw`);
      await queryRunner.query(`drop view credits_vw`);
      await queryRunner.query(`drop view scheduled_vw`);
      await queryRunner.query(`drop view message_vw`);
      await queryRunner.query(`drop view user_ctx_vw`);
      await queryRunner.query(`drop view sp_result_vw`);
      await queryRunner.query(`drop view sp_param_vw`);
      await queryRunner.query(`drop view request_vw`);
      await queryRunner.query(`drop view caption_vw`);
      await queryRunner.query(`drop view command_param_vw`);
      await queryRunner.query(`drop view user_service_vw`);
      await queryRunner.query(`drop view waiting_vw`);
      await queryRunner.query(`drop view context_action_vw`);
      await queryRunner.query(`drop view context_vw`);
      await queryRunner.query(`drop function updateAccount(integer, bigint, text, bigint, text, text, text)`);
      await queryRunner.query(`drop function saveMessage(bigint, integer, integer, text, text, bigint)`);
      await queryRunner.query(`drop function addCommand(integer, integer, integer)`);
      await queryRunner.query(`drop function startCommand(integer)`);
      await queryRunner.query(`drop function cancelContexts(integer, integer)`);
      await queryRunner.query(`drop function setLang(integer, text)`);
      await queryRunner.query(`drop function startCommands(integer)`);
      await queryRunner.query(`drop function getActions(integer)`);
      await queryRunner.query(`drop function setFirstAction(integer, integer)`);
      await queryRunner.query(`drop function setNextAction(integer)`);
      await queryRunner.query(`drop function waitValue(integer, bigint, boolean)`);
      await queryRunner.query(`drop function setWaitingParam(integer,text)`);
      await queryRunner.query(`drop function chooseItem(integer, integer)`);
      await queryRunner.query(`drop function setParamValue(integer, integer, text)`);
      await queryRunner.query(`drop function setResultAction(integer, text)`);
      await queryRunner.query(`drop function saveQuestParamValue(integer, integer, integer, boolean)`);
      await queryRunner.query(`drop function saveQuestLocation(integer, integer)`);
      await queryRunner.query(`drop function checkQuest(integer, integer)`);
      await queryRunner.query(`drop function cancelQuest(integer, integer)`);
      await queryRunner.query(`drop function getQuests(integer, integer, text)`);
      await queryRunner.query(`drop function refreshQuest(integer, integer)`);
      await queryRunner.query(`drop function setGlobalValue(integer, integer,	integer, integer, integer, integer)`);
      await queryRunner.query(`drop function addGlobalValue(integer, integer, integer, integer)`);
      await queryRunner.query(`drop function createQuestContext(integer, integer, bigint)`);
      await queryRunner.query(`drop function closeContext(integer)`);
      await queryRunner.query(`drop function winQuest(integer, integer)`);
      await queryRunner.query(`drop function failQuest(integer, integer)`);
      await queryRunner.query(`drop function deathQuest(integer, integer)`);
      await queryRunner.query(`drop function uploadScript(integer, integer, text, text, integer)`);
      await queryRunner.query(`drop function uploadImage(integer, integer, text)`);
      await queryRunner.query(`drop function questText(integer, integer, text)`);
      await queryRunner.query(`drop function joinToSession(integer)`);
      await queryRunner.query(`drop function addSessionParams(integer, text)`);
    }
}
