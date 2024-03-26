import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class action_type {
    @PrimaryColumn()
    id: number;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;
}