import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class black_list {
    @PrimaryColumn()
    chat_id: number;
}