import {MigrationInterface, QueryRunner} from "typeorm";

// npm run typeorm migration:run
export class init1710490418239 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`insert into service(id, name, token) values(1, 'DagazQuest', 'XXXXXXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')`);

        await queryRunner.query(`insert into action_type(id, name) values(1, 'Folder')`);
        await queryRunner.query(`insert into action_type(id, name) values(2, 'Input String')`);
        await queryRunner.query(`insert into action_type(id, name) values(3, 'Output String')`);
        await queryRunner.query(`insert into action_type(id, name) values(4, 'Virtual Menu')`);
        await queryRunner.query(`insert into action_type(id, name) values(5, 'Menu')`);
        await queryRunner.query(`insert into action_type(id, name) values(6, 'Stored Procedure')`);
        await queryRunner.query(`insert into action_type(id, name) values(7, 'HTTP Request')`);
        await queryRunner.query(`insert into action_type(id, name) values(8, 'Text Quest')`);
        await queryRunner.query(`insert into action_type(id, name) values(9, 'Refresh Context')`);

        await queryRunner.query(`insert into param_type(id, name) values(1, 'USER')`);
        await queryRunner.query(`insert into param_type(id, name) values(2, 'SERVICE')`);
        await queryRunner.query(`insert into param_type(id, name) values(3, 'RESULT_CODE')`);
        await queryRunner.query(`insert into param_type(id, name) values(4, 'QUEST')`);
        await queryRunner.query(`insert into param_type(id, name) values(5, 'MENU')`);
        await queryRunner.query(`insert into param_type(id, name) values(6, 'QUEST_NAME')`);

        await queryRunner.query(`insert into delta_type(id, name) values(1, 'Победа')`);
        await queryRunner.query(`insert into delta_type(id, name) values(2, 'Смерть')`);
        await queryRunner.query(`insert into delta_type(id, name) values(3, 'Изменение параметра')`);

        await queryRunner.query(`insert into global_param(id, service_id, name, min_value, def_value) values(1, 1, 'Запусков', 0, 0)`);
        await queryRunner.query(`insert into global_param(id, service_id, name, min_value, def_value) values(2, 1, 'Побед', 0, 0)`);
        await queryRunner.query(`insert into global_param(id, service_id, name, min_value, max_value, def_value) values(3, 1, 'Кредитов', 0, 1000000, 10000)`);
        await queryRunner.query(`insert into global_param(id, service_id, name, min_value, def_value) values(4, 1, 'Смертей', 0, 0)`);
        await queryRunner.query(`insert into global_param(id, service_id, name, min_value, def_value) values(5, 1, 'Провалов', 0, 0)`);

        await queryRunner.query(`insert into command(id, service_id, name, priority, is_visible, order_num) values(1, 1, 'quest', 10, true, 1)`);
        await queryRunner.query(`insert into command(id, service_id, name, priority, is_visible, order_num) values(2, 1, 'lang', 50, true, 99)`);
        await queryRunner.query(`insert into command(id, service_id, name, priority, is_visible, order_num) values(3, 1, 'start', 50, false, 99)`);

        await queryRunner.query(`insert into command_param(command_id, param_id, order_num) values(1, 6, 1)`);
        await queryRunner.query(`insert into command_param(command_id, param_id, order_num) values(3, 5, 1)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, request, order_num) values(1001, 1, 6, 'checkQuest', 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, width, result_code, order_num) values(1002, 1, 1001, 5, 2, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(1003, 1, 1002, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(1004, 1, 1002, 1, 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(1005, 1, 1003, 6, 'cancelQuest', 1)`);
        await queryRunner.query(`insert into action(id, command_id, type_id, request, order_num) values(1006, 1, 6, 'getQuests', 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, width, param_id, result_code, order_num) values(1007, 1, 1006, 4, 3, 5, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, type_id, param_id, order_num) values(1008, 1, 8, 5, 4)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, width, order_num) values(2001, 2, 5, 2, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(2002, 2, 2001, 1, 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(2003, 2, 2002, 6, 'setLang', 1)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, order_num) values(2004, 2, 2001, 1, 2)`);
        await queryRunner.query(`insert into action(id, command_id, parent_id, type_id, request, order_num) values(2005, 2, 2004, 6, 'setLang', 1)`);
        await queryRunner.query(`insert into action(id, command_id, type_id, request, order_num) values(2006, 2, 6, 'refreshQuest', 2)`);
        await queryRunner.query(`insert into action(id, command_id, type_id, param_id, order_num) values(2007, 2, 9, 4, 2)`);

        await queryRunner.query(`insert into action(id, command_id, type_id, param_id, order_num) values(3001, 3, 8, 5, 1)`);

        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1001, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1001, 'pService', 2, 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1005, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1005, 'pService', 2, 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1006, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1006, 'pService', 2, 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(1006, 'pName', 6, 3)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(2003, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, default_value, order_num) values(2003, 'pLang', 'en', 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(2005, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, default_value, order_num) values(2005, 'pLang', 'ru', 2)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(2006, 'pUser', 1, 1)`);
        await queryRunner.query(`insert into request_param(action_id, name, param_id, order_num) values(2006, 'pService', 2, 2)`);

        await queryRunner.query(`insert into response_param(action_id, name, param_id, order_num) values(1001, 'result_code', 3, 1)`);
        await queryRunner.query(`insert into response_param(action_id, name, param_id, order_num) values(1001, 'quest', 4, 2)`);
        await queryRunner.query(`insert into response_param(action_id, name, param_id, order_num) values(1006, 'result_code', 3, 1)`);
        await queryRunner.query(`insert into response_param(action_id, name, param_id, order_num) values(1006, 'menu', 5, 2)`);
        await queryRunner.query(`insert into response_param(action_id, name, param_id, order_num) values(2006, 'result_code', 3, 1)`);
        await queryRunner.query(`insert into response_param(action_id, name, param_id, order_num) values(2006, 'id', 4, 2)`);

        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(1, 'en', 'Run quest')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(1, 'ru', 'Запустить квест')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(2, 'en', 'Choose an language')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(2, 'ru', 'Выбор языка')`);
        await queryRunner.query(`insert into localized_string(command_id, lang, value) values(3, 'en', 'Start quest')`);

        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1002, 'en', 'Cancel "{QUEST}" quest?')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1002, 'ru', 'Прервать квест "{QUEST}"?')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1003, 'en', 'Yes')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1003, 'ru', 'Да')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1004, 'en', 'No')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1004, 'ru', 'Нет')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1007, 'en', 'Choose an quest:')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(1007, 'ru', 'Выберите квест:')`);

        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2001, 'en', 'Choose an language')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2001, 'ru', 'Выберите язык')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2002, 'en', 'English')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2002, 'ru', 'Английский')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2004, 'en', 'Russian')`);
        await queryRunner.query(`insert into localized_string(action_id, lang, value) values(2004, 'ru', 'Русский')`);

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

        await queryRunner.query(`insert into session_type(id, name, min_users, max_users, index_param, start_param, param_count) values(1, 'Spock', 2, 2, 1, 2, 1)`);

        await queryRunner.query(`create sequence script_seq start with 1000`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(1, 1, 1, '15', '15.qm', 1, 'ru', 'Пятнашки', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(2, 1, 1, '15', '15_eng.qmm', 1, 'en', 'Codebox', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(3, 1, 1, 'logic', 'logic.qm', 1, 'ru', 'Логика', 100, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(4, 1, 1, 'logic', 'logic_eng.qmm', 1, 'en', 'Logic', 100, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, is_shared) values(5, 1, 1, 'rubik', 'rubik-2x2.qm', 1, 'ru', 'Рубик', false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, is_shared) values(6, 1, 1, 'rubik', 'rubik-2x2_eng.qm', 1, 'en', 'Rubik', false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(7, 1, 1, 'robots', 'robots.qm', 1, 'ru', 'Роботы', 500, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(8, 1, 1, 'robots', 'robots_eng.qmm', 1, 'en', 'Robots', 500, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(9, 1, 1, 'ski', 'ski.qm', 1, 'ru', 'Лыжи', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(10, 1, 1, 'ski', 'ski_eng.qmm', 1, 'en', 'Ski', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(11, 1, 1, 'glavred', 'glavred.qmm', 1, 'ru', 'Главред', 3000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(12, 1, 1, 'driver', 'driver.qmm', 1, 'ru', 'Дальнобойщик', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(13, 1, 1, 'driver', 'driver_eng.qmm', 1, 'en', 'Driver', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(14, 1, 1, 'citadels', 'citadels.qmm', 1, 'ru', 'Цитадели', 5000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(15, 1, 1, 'space_craft', 'space_craft.qmm', 1, 'ru', 'SpaceCraft', 5000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(16, 1, 1, 'colonization', 'colonization.qmm', 1, 'ru', 'Колонизация', 3000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(17, 1, 1, 'mancala', 'mancala.qmm', 1, 'ru', 'Манкала', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(18, 1, 1, 'lightoff', 'lightoff.qmm', 1, 'ru', 'Туши свет!', 2000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(19, 1, 1, 'rvk', 'rvk.qmm', 1, 'ru', 'РВК', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(20, 1, 1, 'gaidnet', 'gaidnet.qm', 1, 'ru', 'Гайднет', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(21, 1, 1, 'space_lines', 'space_lines.qmm', 1, 'ru', 'Космолинии', 2000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(22, 1, 1, 'space_lines', 'space_lines_eng.qmm', 1, 'en', 'SpaceLines', 2000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(23, 1, 1, 'pilot', 'pilot.qmm', 1, 'ru', 'Пилот', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(24, 1, 1, 'pilot', 'pilot_eng.qmm', 1, 'en', 'Pilot', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(25, 1, 1, 'depth', 'depth.qmm', 1, 'ru', 'Глубина', 2000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(26, 1, 1, 'depth', 'depth_eng.qmm', 1, 'en', 'Depth', 2000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(27, 1, 1, 'evil_genius', 'evil_genius.qmm', 1, 'ru', 'Злой гений', 3000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(28, 1, 1, 'proprolog', 'proprolog.qmm', 1, 'ru', 'ПроПролог', 3000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(29, 1, 1, 'hanoi', 'hanoi.qmm', 1, 'ru', 'Ханойские башни', 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(30, 1, 1, 'gs', 'gs.qmm', 1, 'ru', 'Горнолыжка', 2000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(31, 1, 1, 'muzon', 'muzon.qmm', 1, 'ru', 'Музон', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(32, 1, 1, 'muzon', 'muzon_eng.qmm', 1, 'en', 'Muzon', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(33, 1, 1, 'moi', 'moi.qmm', 1, 'ru', 'Иике-Баана', 5000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(34, 1, 1, 'doomino', 'doomino.qmm', 1, 'ru', 'Доомино', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(35, 1, 1, 'pachvarash', 'pachvarash.qmm', 1, 'ru', 'Пачвараш', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(36, 1, 1, 'pachvarash', 'pachvarash_eng.qmm', 1, 'en', 'Pachvarash', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(37, 1, 1, 'mafia', 'mafia.qmm', 1, 'ru', 'Мафия', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(38, 1, 1, 'foncers', 'foncers.qmm', 1, 'ru', 'Фонсеры', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(39, 1, 1, 'foncers', 'foncers_eng.qmm', 1, 'en', 'Foncers', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(40, 1, 1, 'edelweis', 'edelweis.qmm', 1, 'ru', 'Эдельвейс', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(41, 1, 1, 'edelweis', 'edelweis_eng.qmm', 1, 'en', 'Edelweiss', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(42, 1, 1, 'maze', 'maze.qmm', 1, 'ru', 'Лабиринт', 2000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(43, 1, 1, 'cube', 'univ28.qmm', 1, 'ru', 'Куб', 1000, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(44, 1, 1, 'svarokok', 'svarokok.qmm', 1, 'ru', 'Сварокок', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(45, 1, 1, 'svarokok', 'svarokok_eng.qmm', 1, 'en', 'Svarokok', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(46, 1, 1, 'prison', 'prison.qmm', 1, 'ru', 'Тюрьма', 0, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(47, 1, 1, 'prison', 'prison_eng.qmm', 1, 'en', 'Prison', 0, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(48, 1, 1, 'complex', 'complex.qmm', 1, 'ru', 'Комплекс', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(49, 1, 1, 'election', 'election.qmm', 1, 'ru', 'Выборы', 0, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(50, 1, 1, 'election', 'election_eng.qmm', 1, 'en', 'Election', 0, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(51, 1, 1, 'pizza', 'pizza.qmm', 1, 'ru', 'Пицца', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(52, 1, 1, 'pizza', 'pizza_eng.qmm', 1, 'en', 'Pizza', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(53, 1, 1, 'faruk', 'faruk.qmm', 1, 'ru', 'Фарюки', 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(54, 1, 1, 'provoda', 'provoda.qmm', 1, 'ru', 'Провода', 1000, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(55, 1, 1, 'bomber', 'bomber.qmm', 1, 'ru', 'Бомбер', 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(56, 1, 1, 'taxi', 'taxi.qmm', 1, 'ru', 'Такси', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(57, 1, 1, 'ministry', 'ministry.qmm', 1, 'ru', 'Министерство', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(58, 1, 1, 'ministry', 'ministry_eng.qmm', 1, 'en', 'Ministry', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(59, 1, 1, 't18', 't18.qmm', 1, 'ru', 'Телескоп', 1000, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(60, 1, 1, 'perudo', 'perudo.qmm', 1, 'ru', 'Перудо', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(61, 1, 1, 'gluki', 'gluki.qmm', 1, 'ru', 'Глюки', 1000, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(62, 1, 1, 'exam', 'exam.qmm', 1, 'ru', 'Экзамен', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(63, 1, 1, 'cybersport', 'cybersport.qmm', 1, 'ru', 'Киберспорт', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(64, 1, 1, 'llr', 'llr.qmm', 1, 'ru', 'Ваше Величество', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, is_shared) values(65, 1, 1, 'mm', 'mm.qmm', 1, 'ru', 'Быки и коровы', 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(66, 1, 1, 'ht', 'ht.qmm', 1, 'ru', 'Орлянка', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(67, 1, 1, 'domoclan', 'domoclan.qmm', 1, 'ru', 'Свидетели доминаторов', 1000, 1000, false)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, win_bonus, death_penalty, is_shared) values(68, 1, 1, 'diamond', 'diamond.qmm', 1, 'ru', 'Бриллиант', 1000, 1000, true)`);
        await queryRunner.query(`insert into script(id, service_id, user_id, commonname, filename, version, lang, name, is_shared, sessiontype_id) values(1001, 1, 1, 'spock', 'spock.qmm', 1, 'ru', 'Спок', false, 1)`);

        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 7, 25)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 8, 25)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 9, 21)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 10, 21)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 11, 19)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 12, 2)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 13, 2)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 14, 12)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 16, 43)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 19, 28)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 20, 24)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 21, 40)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 22, 40)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 23, 7)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 24, 7)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 25, 24)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 26, 24)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 27, 39)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 28, 34)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 33, 8)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 34, 1)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 37, 46)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 38, 28)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 39, 28)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 42, 1)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 46, 28)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 47, 28)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 51, 23)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 52, 23)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 53, 23)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 56, 24)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 57, 3)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 58, 3)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 59, 1)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 60, 4)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 64, 48)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 66, 18)`);
        await queryRunner.query(`insert into global_fixup(param_id, script_id, param_num) values(3, 67, 25)`);

        await queryRunner.query(`insert into text_type(id, name) values(1, 'Приветствие')`);
        await queryRunner.query(`insert into text_type(id, name) values(2, 'Поздравление')`);

        await queryRunner.query(`insert into info(service_id, ru, en, is_mandatory) values(1, 'Добро пожаловать на <b>DagazQuest</b> портал.<br>Для запуска квеста используйте команду <b>/quest</b>.', 'Welcome to the <b>DagazQuest</b> portal.<br>To start the quest, use the <b>/quest</b> command.', true)`);

        await queryRunner.query(`create sequence map_seq start with 1000`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`drop sequence map_seq`);
        await queryRunner.query(`delete from info`);
        await queryRunner.query(`delete from global_fixup`);
        await queryRunner.query(`delete from script`);
        await queryRunner.query(`drop sequence script_seq`);
        await queryRunner.query(`delete from session_type`);
        await queryRunner.query(`delete from macro_param`);
        await queryRunner.query(`delete from macro`);
        await queryRunner.query(`delete from localized_string`);
        await queryRunner.query(`delete from request_param`);
        await queryRunner.query(`delete from action`);
        await queryRunner.query(`delete from command_param`);
        await queryRunner.query(`delete from command`);
        await queryRunner.query(`delete from global_param`);
        await queryRunner.query(`delete from delta_type`);
        await queryRunner.query(`delete from param_type`);
        await queryRunner.query(`delete from action_type`);
        await queryRunner.query(`delete from service`);
    }
}
