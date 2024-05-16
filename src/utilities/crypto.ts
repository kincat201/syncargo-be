import { 
  scryptSync, 
  randomBytes, 
  createCipheriv, 
  createDecipheriv 
} from 'crypto';

export class Crypto {
  private algorithm;
  private password;
  private key;
  private iv;

  constructor() {
    this.algorithm = 'aes-256-ctr';
    this.password = 'Password used to generate key';
    this.key = scryptSync(this.password, 'salt', 32);
    this.iv = process.env.CRYPTO_SALT;
  }

  encrypt(decryptedData: string | object): string {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);

    let encryptedData = ''
    if (typeof decryptedData === 'string') {
      encryptedData = cipher.update(decryptedData, 'utf8', 'hex');
    } else {
      encryptedData = cipher.update(JSON.stringify(decryptedData), 'utf8', 'hex');
    }

    encryptedData += cipher.final('hex')
    
    return encryptedData
  }

  decrypt(encryptedData: string): string {
    const decipher = createDecipheriv(this.algorithm, this.key, this.iv);

    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    
    return decryptedData;
  }
}