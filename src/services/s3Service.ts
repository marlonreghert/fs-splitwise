import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pipeline } from "stream";
import { promisify } from "util";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import path from "path";

dotenv.config();
const streamPipeline = promisify(pipeline)

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export const generatePresignedUrl = async (fileKey: string) => {
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        ContentType: "text/csv",
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1-hour expiration

    return url;
};

// Function to download a file from S3
export const downloadFileFromS3 = async (bucket: string, key: string, tempFilePath: string) => {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
  
      const response = await s3Client.send(command);
  
      if (!response.Body) {
        throw new Error("No file body returned from S3.");
      }
  
      // Ensure Body is a Readable Stream
      const readableStream = response.Body as NodeJS.ReadableStream;
  
      await streamPipeline(readableStream, fs.createWriteStream(tempFilePath));
  
      console.log(`File downloaded successfully to: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      console.error("Error downloading file from S3:", error);
      throw error;
    }
  };