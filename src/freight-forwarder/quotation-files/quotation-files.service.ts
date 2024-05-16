import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/s3/s3.service';
import { Connection, Repository, EntityManager } from 'typeorm';
import { QuotationFile } from 'src/entities/quotation-file.entity';
import { QuotationFileSource, FileStatus, RoleFF } from '../../enums/enum';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { RequestRemoveFileDto } from '../shipments/dtos/request-remove-file.dto';

@Injectable()
export class QuotationFilesService {
  constructor(
    private s3Service: S3Service,
    @InjectRepository(QuotationFile)
    private quotationFileRepo: Repository<QuotationFile>,
    private connection: Connection,
  ) {}

  async update(
    userId: number,
    companyId = null,
    rfqNumber: string,
    deletedFiles: string,
    uploads: any,
    source = QuotationFileSource.QUOTATION,
  ) {
    return await this.connection.transaction(async (entityManager) => {
      await this.s3Service.uploadFiles(uploads);

      const files = [];
      const fileContainer = 'saas';
      for (let upload of uploads) {
        const fileName = upload.hashedFileName;
        files.push({
          rfqNumber,
          fileContainer,
          fileName,
          originalName: upload.file.originalname,
          createdByUserId: userId,
          companyId,
          url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
          source,
          platform: 'FF',
        });
      }
      const newFiles = this.quotationFileRepo.create(files);
      const uploadedFiles = await entityManager.save(newFiles);

      let destroyedFiles;
      if (deletedFiles?.length) {
        const ids = JSON.parse(deletedFiles);
        const quotationFiles = await this.quotationFileRepo.findByIds(ids);

        const fileNames = [];
        for (let file of quotationFiles) {
          fileNames.push(file.fileName);
        }
        await this.s3Service.deleteFiles(fileNames);

        destroyedFiles = await entityManager.remove(quotationFiles);
      }

      if (!uploads.length) {
        return destroyedFiles;
      }
      return uploadedFiles;
    });
  }

  async requestRemoveFileFromChat(
    user: CurrentUserDto,
    rfqNumber: string,
    body: RequestRemoveFileDto,
    entityManager: any,
  ) {
    const deletedFiles = [];

    const quotationFiles = await entityManager
      .createQueryBuilder(QuotationFile, 'qf')
      .innerJoinAndSelect('qf.quotation', 'q')
      .where(`
        q.rfqNumber = :rfqNumber
        AND q.companyId = :companyId
        AND q.status = :status
        AND qf.status = :status
        AND qf.id IN (:fileIds)
        AND qf.source = :source
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        companyId: user.companyId,
        fileIds: body.attachmentIds,
        source: 'CHAT',
      })
      .getMany();

    for (let quotationFile of quotationFiles) {
      if (quotationFile.fileStatus !== FileStatus.ACTIVE) {
        throw new BadRequestException(
          `quotation file with id ${quotationFile.id} has already been request to be deleted or has been deleted`,
        );
      }
      if (user.role !== RoleFF.STAFF) {
        quotationFile.status = false;
        quotationFile.fileStatus = FileStatus.DELETED;
      } else {
        quotationFile.fileStatus = FileStatus.REQUEST_DELETE;
      }
      deletedFiles.push(await entityManager.save(quotationFile));
    }

    return deletedFiles;
  }

  async respondRemoveFileFromChat(
    attachmentIds: number[],
    rfqNumber: string,
    companyId: number,
    approved: boolean,
    entityManager: EntityManager,
  ) {
    if (attachmentIds?.length === 0) {
      return [];
    }
    const deletedFiles = [];
    const fileStatus = approved ? FileStatus.DELETED : FileStatus.ACTIVE;
    const quotationFiles = await entityManager
      .createQueryBuilder(QuotationFile, 'qf')
      .innerJoinAndSelect('qf.quotation', 'q')
      .where(`
        q.rfqNumber = :rfqNumber
        AND q.companyId = :companyId
        AND q.status = :status
        AND qf.status = :status
        AND qf.id IN (:fileIds)
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        companyId: companyId,
        fileIds: attachmentIds,
      })
      .getMany();

    for (const quotationFile of quotationFiles) {
      if (quotationFile.fileStatus !== FileStatus.REQUEST_DELETE) {
        throw new BadRequestException(
          `quotation file with id ${quotationFile.id} has been deleted or is not requested to be deleted`,
        );
      }
      quotationFile.status = !approved;
      quotationFile.fileStatus = fileStatus;

      deletedFiles.push(await entityManager.save(quotationFile));
    }
    return deletedFiles;
  }
}
