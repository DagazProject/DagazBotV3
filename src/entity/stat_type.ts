import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class stat_type {
    @PrimaryColumn()
    id: number;

    @Column({ type: "varchar", length: 100, nullable: false })
    name: string;
}