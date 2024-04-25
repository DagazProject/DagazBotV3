import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";

@Entity()
export class param_type {
    @PrimaryColumn()
    id: number;

    @Index()
    @Unique(["name"])
    @Column({ type: "varchar", length: 100, nullable: false })
    name: string;

    @Column({ nullable: true,  type: "text" })
    default_value: string;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_hidden: boolean;
}