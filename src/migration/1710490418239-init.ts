import {MigrationInterface, QueryRunner} from "typeorm";

// npm run typeorm migration:run
export class init1710490418239 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`insert into service(id, name, token) values(1, 'test', 'XXXXXXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')`);

        await queryRunner.query(`insert into action_type(id, name) values(1, 'Folder')`);
        await queryRunner.query(`insert into action_type(id, name) values(2, 'Input String')`);
        await queryRunner.query(`insert into action_type(id, name) values(3, 'Output String')`);
        await queryRunner.query(`insert into action_type(id, name) values(4, 'Virtual Menu')`);
        await queryRunner.query(`insert into action_type(id, name) values(5, 'Menu')`);
        await queryRunner.query(`insert into action_type(id, name) values(6, 'Stored Procedure')`);
        await queryRunner.query(`insert into action_type(id, name) values(7, 'HTTP Request')`);
        await queryRunner.query(`insert into action_type(id, name) values(8, 'Text Quest')`);
        await queryRunner.query(`insert into action_type(id, name) values(9, 'Refresh Menu')`);

        await queryRunner.query(`insert into param_type(id, name) values(1, 'USER')`);
        await queryRunner.query(`insert into param_type(id, name) values(2, 'SERVICE')`);
        await queryRunner.query(`insert into param_type(id, name) values(3, 'RESULT_CODE')`);
        await queryRunner.query(`insert into param_type(id, name) values(4, 'QUEST')`);
        await queryRunner.query(`insert into param_type(id, name) values(5, 'MENU')`);
        await queryRunner.query(`insert into param_type(id, name) values(6, 'QUEST_NAME')`);

        await queryRunner.query(`insert into command(id, name, priority, order_num) values(1, 'quest', 10, 1)`);
        await queryRunner.query(`insert into command(id, name, priority, order_num) values(2, 'lang', 50, 99)`);

        await queryRunner.query(`insert into command_param(id, command_id, param_id, order_num) values(1, 1, 6, 1)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, request, order_num) values(1001, 1, 6, 'checkQuest', 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, width, result_code, order_num) values(1002, 1, 1001, 5, 2, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(1003, 1, 1002, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(1004, 1, 1002, 1, 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(1005, 1, 1003, 6, 'cancelQuest', 1)`);
        await queryRunner.query(`insert into action(id, command_id, type_id, request, order_num) values(1006, 1, 6, 'getQuests', 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, width, param_id, result_code, order_num) values(1007, 1, 1006, 4, 3, 5, 0, 1)`);
        await queryRunner.query(`insert into action(id, command_id, type_id, param_id, order_num) values(1008, 1, 8, 5, 4)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, width, order_num) values(2001, 2, 5, 2, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(2002, 2, 2001, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(2003, 2, 2002, 6, 'setLang', 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(2004, 2, 2001, 1, 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(2005, 2, 2004, 6, 'setLang', 1)`);

        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1001, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1001, 'pService', 2, 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1005, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1005, 'pService', 2, 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1006, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1006, 'pService', 2, 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1006, 'pName', 6, 3)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(2002, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, default_value, order_num) values(2002, 'pLang', 'en', 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(2004, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, default_value, order_num) values(2004, 'pLang', 'ru', 2)`);

        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(1, 'en', 'Run quest')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(1, 'ru', 'Р—Р°РїСѓСЃС‚РёС‚СЊ РєРІРµСЃС‚')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(2, 'en', 'Choose an language')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(2, 'ru', 'Р’С‹Р±РѕСЂ СЏР·С‹РєР°')`);

        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1002, 'en', 'Cancel "{QUEST}" quest?')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1002, 'ru', 'РџСЂРµСЂРІР°С‚СЊ РєРІРµСЃС‚ "{QUEST}"?')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1003, 'en', 'Yes')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1003, 'ru', 'Р”Р°')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1004, 'en', 'No')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1004, 'ru', 'РќРµС‚')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1007, 'en', 'Choose an quest:')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1007, 'ru', 'Р’С‹Р±РµСЂРёС‚Рµ РєРІРµСЃС‚:')`);

        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2001, 'en', 'Choose an language')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2001, 'ru', 'Р’С‹Р±РµСЂРёС‚Рµ СЏР·С‹Рє')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2002, 'en', 'English')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2002, 'ru', 'РђРЅРіР»РёР№СЃРєРёР№')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2004, 'en', 'Russian')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2004, 'ru', 'Р СѓСЃСЃРєРёР№')`);

        await queryRunner.query(`insert into macro(id, name, result) values(1, 'abs', '(((x)>0)*(x)-((x)<0)*(x))')`);
        await queryRunner.query(`insert into macro(id, name, result) values(2, 'max', '(((a)>(b))*(a)+((a)<=(b))*(b))`);
        await queryRunner.query(`insert into macro(id, name, result) values(3, 'min', '(((a)>(b))*(b)+((a)<=(b))*(a))`);
        await queryRunner.query(`insert into macro(id, name, result) values(4, 'max', '(#max(#max((a),(b)),(c)))`);
        await queryRunner.query(`insert into macro(id, name, result) values(5, 'min', '(#min(#min((a),(b)),(c)))`);

        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(1, 'x', 1)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(2, 'a', 1)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(2, 'b', 2)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(3, 'a', 1)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(3, 'b', 2)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(4, 'a', 1)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(4, 'b', 2)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(4, 'c', 3)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(5, 'a', 1)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(5, 'b', 2)`);
        await queryRunner.query(`insert into macro_param(macro_id, name, order_num) values(5, 'c', 3)`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`delete from macro_param`);
        await queryRunner.query(`delete from macro`);
        await queryRunner.query(`delete from localized_string`);
        await queryRunner.query(`delete from request_param`);
        await queryRunner.query(`delete from action`);
        await queryRunner.query(`delete from command_param`);
        await queryRunner.query(`delete from command`);
        await queryRunner.query(`delete from param_type`);
        await queryRunner.query(`delete from action_type`);
        await queryRunner.query(`delete from service`);
    }
}
