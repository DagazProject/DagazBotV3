import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class server {
    @PrimaryColumn()
    id: number;

    @Column({ nullable: false,  type: "varchar", length: 300 })
    url: string;

    @Column({ nullable: false,  type: "varchar", length: 300 })
    api: string;

    @Column({ type: "integer", nullable: false })
    port: number;

    @Column({ nullable: true,  type: "varchar", length: 100 })
    login: string;

    @Column({ nullable: true,  type: "varchar", length: 100 })
    pass: string;
}