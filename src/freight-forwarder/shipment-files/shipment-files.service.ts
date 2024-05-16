import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/s3/s3.service';
import { Repository, Connection, EntityManager } from 'typeorm';
import { ShipmentFile } from 'src/entities/shipment-file.entity';
import { FileStatus, RoleFF } from '../../enums/enum';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { RequestRemoveFileDto } from '../shipments/dtos/request-remove-file.dto';

@Injectable()
export class ShipmentFilesService {
  constructor(
    private s3Service: S3Service,
    @InjectRepository(ShipmentFile)
    private shipmentFileRepo: Repository<ShipmentFile>,
    private connection: Connection,
  ) {}

  async create(
    userId: number,
    rfqNumber: string,
    upload: any,
    aditionalInformation?: string,
  ) {
    await this.s3Service.uploadFiles([upload]);

    const fileContainer = 'saas';
    const fileName = upload.hashedFileName;
    const file = {
      rfqNumber,
      fileContainer,
      fileName,
      originalName: upload.file.originalname,
      createdByUserId: userId,
      aditionalInformation,
      url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
      platform: 'FF',
    };

    const newFile = this.shipmentFileRepo.create(file);
    return await this.shipmentFileRepo.save(newFile);
  }

  async delete(rfqNumber: string, fileId: number) {
    const file = await this.shipmentFileRepo.findOne({ id: fileId, rfqNumber });
    if (!file) {
      throw new NotFoundException('Shipment file not found');
    }

    if (file.fileName) {
      await this.s3Service.deleteFiles([file.fileName]);
    }

    await this.shipmentFileRepo.remove(file);

    return file;
  }

  async requestRemoveFile(
    user: CurrentUserDto,
    rfqNumber: string,
    body: RequestRemoveFileDto,
    entityManager: any,
  ) {
    const deletedFiles = [];

    const shipmentFiles = await entityManager
      .createQueryBuilder(ShipmentFile, 'sf')
      .innerJoinAndSelect('sf.shipment', 's')
      .innerJoinAndSelect('s.quotation', 'q')
      .where(`
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
        AND q.status = :status
        AND sf.status = :status
        AND sf.id IN (:fileIds)
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        companyId: user.companyId,
        fileIds: body.attachmentIds,
      })
      .getMany();

    for (let shipmentFile of shipmentFiles) {
      if (shipmentFile.fileStatus !== FileStatus.ACTIVE) {
        throw new BadRequestException(
          `shipment file with id ${shipmentFile.id} has already been request to be deleted or has been deleted`,
        );
      }
      if (user.role !== RoleFF.STAFF) {
        shipmentFile.status = false;
        shipmentFile.fileStatus = FileStatus.DELETED;
      } else {
        shipmentFile.fileStatus = FileStatus.REQUEST_DELETE;
      }
      deletedFiles.push(await entityManager.save(shipmentFile));
    }

    return deletedFiles;
  }

  async respondRemoveFile(
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
    const shipmentFiles = await entityManager
      .createQueryBuilder(ShipmentFile, 'sf')
      .innerJoinAndSelect('sf.shipment', 's')
      .innerJoinAndSelect('s.quotation', 'q')
      .where(`
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
        AND q.status = :status
        AND sf.status = :status
        AND sf.id IN (:fileIds)
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        companyId: companyId,
        fileIds: attachmentIds,
      })
      .getMany();

    for (const shipmentFile of shipmentFiles) {
      if (shipmentFile.fileStatus !== FileStatus.REQUEST_DELETE) {
        throw new BadRequestException(
          `shipment file with id ${shipmentFile.id} has been deleted or is not requested to be deleted`,
        );
      }
      shipmentFile.status = !approved;
      shipmentFile.fileStatus = fileStatus;

      deletedFiles.push(await entityManager.save(shipmentFile));
    }
    return deletedFiles;
  }
}
