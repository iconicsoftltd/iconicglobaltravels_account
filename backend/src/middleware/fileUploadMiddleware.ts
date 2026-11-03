import { NextFunction, Request, Response } from "express";
import uploader from "../utils/uploader";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.ms-word",
  "application/vnd.ms-office",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "application/vnd.ms-word.document.macroEnabled.12",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/csv",
  "text/csv",
  "text/plain",
  "application/rtf",
  "text/rtf",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "text/comma-separated-values",
  "application/xls",
  "application/xlsx",
  "application/doc",
  "application/docx",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
];

const fileUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const multerUploader = uploader({
    allowedFileTypes: allowedMimeTypes,
    errorMessage: "Only images, PDF, DOC, DOCX, XLS, XLSX and CSV files are allowed!",
    maxFileSize: 1024 * 1024 * 10,
  });

  multerUploader.any()(req, res, (err: any) => {
    if (err) {
      console.log(err);
      return res.status(400).json({
        name: "FileUploadError",
        message: "File upload error",
        statusCode: 400,
        error: "Bad Request",
        details: [
          {
            file: err.message,
          },
        ],
      });
    }

    next();
  });
};

export default fileUploadMiddleware;
