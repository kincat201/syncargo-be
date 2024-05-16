import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { OcrDocument } from './ocr-document.entity';

import { User } from './user.entity';

@Entity({ name : 'ocr_document_history'})

export class OcrDocumentHistory {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({
        name: 'activity',
        nullable: false,
    })
    activity: string;

    @Column({
        name : 'converted_data',
        nullable: true,
        type: 'json',
    })
    convertedData? : any;

    @Column({
        name: 'created_at',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt?: Date;

    @Column({
        name : 'ocr_document_id',
        nullable: false,
    })
    ocrDocumentId : number;

    @Column({
        name : 'created_by_user_id',
        nullable: true,
    })
    createdBy? : number;

    @Column({
        name: 'status',
        nullable: false,
        default: 1,
    })
    status?: number;

    // relationship
    @ManyToOne(
        () => OcrDocument,
        (ocrDocument) => ocrDocument.ocrDocumentHistory,
    )
    @JoinColumn([{ name: 'ocr_document_id', referencedColumnName: 'id' }])
    ocrDocument: OcrDocument;
    
    @ManyToOne(() => User, (user) => user.ocrDocumentHistory)
    @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
    user: User;
}
