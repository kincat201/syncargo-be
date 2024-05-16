import * as AWS from 'aws-sdk';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  private s3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    });
  }
  async uploadPDF(data: any) {
    try {
      const fileContainer = 'saas';
      const param = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${fileContainer}/${data.type}_${data.hashedFileName}`,
        Body: data.buffer,
        ACL: 'private',
        ContentType: 'application/pdf',
        ContentDisposition: 'inline',
      };

      console.log('generated key', param);
      await this.s3.upload(param).promise();
      return `${process.env.URL_S3}/${param.Key}`;
    } catch (error) {
      throw error;
    }
  }

  async uploadPhoto(data: any) {
    try {
      const { file, fileName, mimeType } = data;
      const allowedMimeTypes = [
        'image/png', // png
        'image/jpeg', // .jpg and .jpeg
      ];
      if (!allowedMimeTypes.includes(mimeType)) {
        throw new BadRequestException(
          'Only allows upload html, png, jpg, or jpeg extention',
        );
      }
      const fileContainer = 'saas';
      const param = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${fileContainer}/${fileName}`,
        Body: file.buffer,
        ACL: 'private',
        ContentType: mimeType,
        ContentDisposition: 'inline',
      };
      await this.s3.upload(param).promise();
      return `${process.env.URL_S3}/${fileContainer}/${fileName}`;
    } catch (error) {
      throw error;
    }
  }

  async uploadBlTemplate(upload) {
    try {
      const { mimeType, fileName, buffer } = upload;
      const allowedMimeTypes = [
        'image/png',
        'image/jpeg',
        'application/pdf',
        'text/html',
      ];

      if (!allowedMimeTypes.includes(mimeType))
        throw new BadRequestException(
          'Only Allows .pdf, .html, .htm, .png, .jpg, or jpeg extension',
        );

      const fileContainer = 'saas';
      const param = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${fileContainer}/${fileName}`,
        Body: buffer,
        ACL: 'private',
        ContentType: mimeType,
        ContentDisposition: 'inline',
      };
      await this.s3.upload(param).promise();

      return `${process.env.URL_S3}/${fileContainer}/${fileName}`;
    } catch (err) {
      throw err;
    }
  }

  // upload multiple files
  async uploadFiles(uploads: any): Promise<void> {
    try {
      for (const upload of uploads) {
        const { file, hashedFileName } = upload;
        const mimeType = file.mimetype;
        const fileContainer = 'saas';
        const param = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `${fileContainer}/${hashedFileName}`,
          Body: file.buffer,
          ACL: 'private',
          ContentType: mimeType,
          ContentDisposition: 'inline',
        };
        await this.s3.upload(param).promise();
      }
    } catch (error) {
      throw error;
    }
  }

  // delete multiple files
  async deleteFiles(fileNames: string[]): Promise<void> {
    try {
      for (const fileName of fileNames) {
        const fileContainer = 'saas';
        const param = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `${fileContainer}/${fileName}`,
        };
        await this.s3.deleteObject(param).promise();
      }
    } catch (error) {
      throw error;
    }
  }

  async downloadFile(name: string, res: any) {
    try {
      const extension = name.split('.').pop();

      let fileType: string;

      if (extension === 'doc') {
        fileType = 'application/msword';
      } else if (extension === 'docx') {
        fileType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (extension === 'pdf') {
        fileType = 'application/pdf';
      } else if (extension === 'jpg' || extension === 'jpeg') {
        fileType = 'image/jpeg';
      } else if (extension === 'png') {
        fileType = 'image/png';
      }

      res.set('content-type', fileType);
      const param = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `saas/${name}`,
      };
      const fileStream = await this.s3.getObject(param).createReadStream();
      return fileStream.pipe(res);
    } catch (error) {
      throw error;
    }
  }

  async downloadFiles(fileNames: string[]) {
    try {
      const bufferFiles = [];

      for (let fileName of fileNames) {
        const param = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `saas/${fileName}`,
        };

        const streamFile = await this.s3.getObject(param).createReadStream();
        bufferFiles.push(await this.streamToBuffer(streamFile));
      }

      return bufferFiles;
    } catch (error) {
      throw error;
    }
  }

  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const data = [];

      stream.on('data', (chunk) => {
        data.push(chunk);
      });

      stream.on('end', () => {
        resolve(Buffer.concat(data));
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  async uploadOcrDocument(ocrData : any) : Promise<any>{
    try {
      const { mimeType, fileName, buffer } = ocrData;
      const allowedMimeTypes = [
        'image/png',
        'image/jpeg',
        'application/pdf',
        'image/jpeg',
      ];

      if (!allowedMimeTypes.includes(mimeType))
        throw new BadRequestException(
          'OCR Only Allows .pdf, .png, .jpg, or jpeg extension',
        );

      const fileContainer = 'saas';
      const param = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${fileContainer}/${fileName}`,
        Body: buffer,
        ACL: 'private',
        ContentType: mimeType,
        ContentDisposition: 'inline',
      };
      await this.s3.upload(param).promise();

      return `${process.env.URL_S3}/${fileContainer}/${fileName}`;
    } catch (err) {
      throw err;
    }
  }
  
  async getFileBuffer(hashedFileName: string) {
    const param = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `saas/${hashedFileName}`,
    };

    const response = await this.s3.getObject(param).promise();

    return response.Body as Buffer;
  }
}
