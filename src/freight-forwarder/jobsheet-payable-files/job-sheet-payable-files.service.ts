import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/s3/s3.service';
import { Connection, Repository } from 'typeorm';
import { JobSheetPayableFile } from '../../entities/job-sheet-payable-files.entity';

@Injectable()
export class JobSheetPayableFilesService {
  constructor(
    private s3Service: S3Service,
    @InjectRepository(JobSheetPayableFile) private jobSheetPayableFileRepo: Repository<JobSheetPayableFile>,
    private connection: Connection,
  ) {}

  async update(
    userId: number,
    jobSheetPayableId: number,
    deletedFiles: string,
    uploads: any,
  ) {
    return await this.connection.transaction(async (entityManager) => {
      await this.s3Service.uploadFiles(uploads);

      const files = [];
      const fileContainer = 'saas';
      for (let upload of uploads) {
        const fileName = upload.hashedFileName;
        files.push({
          jobSheetPayableId,
          fileContainer,
          fileName,
          originalName: upload.file.originalname,
          createdByUserId: userId,
          url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
        });
      }
      const newFiles = this.jobSheetPayableFileRepo.create(files);
      const uploadedFiles = await entityManager.save(newFiles);

      let destroyedFiles;
      if (deletedFiles?.length) {
        const ids = JSON.parse(deletedFiles);
        const jobSheetPayableFiles = await this.jobSheetPayableFileRepo.findByIds(ids);

        const fileNames = [];
        for (let file of jobSheetPayableFiles) {
          fileNames.push(file.fileName);
        }
        await this.s3Service.deleteFiles(fileNames);

        destroyedFiles = await entityManager.remove(jobSheetPayableFiles);
      }

      if (!uploads.length) {
        return destroyedFiles;
      }
      return uploadedFiles;
    });
  }
}
