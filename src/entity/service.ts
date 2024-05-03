import { Column, Entity, Index, PrimaryColumn, Unique } from "typeorm";

@Entity()
export class service {
    @PrimaryColumn()
    id: number;

    @Index()
    @Unique(["username"])
    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ nullable: false,  type: "text" })
    token: string;

    @Column({ nullable: false,  type: "boolean", default: true })
    enabled: boolean;

    @Column({ nullable: false,  type: "boolean", default: false })
    default_developer: boolean;
}