import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class macro {
    @PrimaryColumn()
    id: number;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ nullable: false,  type: "varchar", length: 300 })
    result: string;
}
