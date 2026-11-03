import { NextFunction, Request, Response } from "express";
import path from "path";
import config from "../../config";

export const fileUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    //@ts-ignore
    const uploadedFiles = (req?.files as any[]) || [];

    const normalizedFiles = uploadedFiles.map((file: any) => {
      const fileName = file?.filename || file?.originalname || "uploaded-file";
      const originalName = file?.originalname || file?.filename || "uploaded-file";
      const fileUrl = file?.secure_url || file?.url || (file?.path ? `/uploads/${path.basename(file.path)}` : "");

      return {
        fileName,
        originalName,
        mimeType: file?.mimetype || "application/octet-stream",
        fileSize: file?.size || 0,
        fileUrl,
      };
    });

    res.status(200).send({
      success: true,
      data: normalizedFiles.length === 1 ? normalizedFiles[0] : normalizedFiles,
    });
  } catch (err) {
    next(err);
  }
};