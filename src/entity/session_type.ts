import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class session_type {
    @PrimaryColumn()
    id: number;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ type: "integer", nullable: false })
    min_users: number;

    @Column({ type: "integer", nullable: false })
    max_users: number;

    @Column({ type: "integer", nullable: false })
    index_param: number;

    @Column({ type: "integer", nullable: false })
    start_param: number;

    @Column({ type: "integer", nullable: false })
    param_count: number;
}