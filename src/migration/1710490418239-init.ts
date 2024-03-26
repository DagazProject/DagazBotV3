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

        await queryRunner.query(`insert into command(id, name, priority, order_num) values(1, 'cancel', 100, 100)`);
        await queryRunner.query(`insert into command(id, name, priority, order_num) values(2, 'lang', 99, 99)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, width, order_num) values(1001, 1, 5, 2, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(1002, 1, 1001, 1, 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(1003, 1, 1001, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(1004, 1, 1003, 6, 'cancelContexts', 1)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, width, order_num) values(2001, 2, 5, 2, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(2002, 2, 2001, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(2003, 1, 2002, 6, 'setLang', 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(2004, 2, 2001, 1, 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(2005, 1, 2004, 6, 'setLang', 1)`);

        await queryRunner.query(`insert into request_param(action_id, name, order_num) values(1004, 'pUser', 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, order_num) values(1004, 'pService', 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, order_num) values(2002, 'pUser', 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, default_value, order_num) values(2002, 'pLang', 'en', 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, order_num) values(2004, 'pUser', 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, default_value, order_num) values(2004, 'pLang', 'ru', 2)`);

        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(1, 'en', 'Cancel scripts')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(1, 'ru', 'Прервать скрипты')`);

        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1001, 'en', 'Cancel scripts?')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1001, 'ru', 'Прервать скрипты?')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1002, 'en', 'No')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1002, 'ru', 'Нет')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1003, 'en', 'Yes')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1003, 'ru', 'Да')`);

        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2001, 'en', 'Choose an language')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2001, 'ru', 'Выберите язык')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2002, 'en', 'English')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2002, 'ru', 'Английский')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2004, 'en', 'Russian')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2004, 'ru', 'Русский')`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`delete from localized_string`);
        await queryRunner.query(`delete from request_param`);
        await queryRunner.query(`delete from action`);
        await queryRunner.query(`delete from command`);
        await queryRunner.query(`delete from action_type`);
        await queryRunner.query(`delete from service`);
    }
}
