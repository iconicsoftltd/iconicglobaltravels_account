import fs from "fs";
import multer from "multer";
import path from "path";
import config from "../config";
import { IUploadFile } from "../types/interface";

const DEFAULT_ALLOWED_FILE_TYPES = [
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
  "application/octet-stream",
];
const DEFAULT_MAX_FILE_SIZE = 1024 * 1024 * 10;

const allowedExtensions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "docm",
  "dot",
  "dotx",
  "xls",
  "xlsx",
  "xlsm",
  "csv",
  "txt",
  "rtf",
  "odt",
  "ods",
  "ppt",
  "pptx",
  "zip",
];

const uploadDirectory = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const uploader = ({
  allowedFileTypes = DEFAULT_ALLOWED_FILE_TYPES,
  errorMessage = "Invalid file type",
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
}: IUploadFile) => {
  const fileExtension = (fileName: string = "") =>
    path.extname(fileName).toLowerCase().replace(".", "");

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDirectory);
    },
    filename: (_req, file, cb) => {
      const cleanName = (file.originalname || "upload").replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "_");
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeName = `${cleanName || "upload"}-${Date.now()}-${Math.round(Math.random() * 100000)}${ext}`;
      cb(null, safeName);
    },
  });

  const fileFilter = (req: any, file: any, cb: any) => {
    const mimeAllowed = allowedFileTypes.includes(file.mimetype);
    const extensionAllowed = allowedExtensions.includes(fileExtension(file.originalname || file.filename || ""));
    if (mimeAllowed || extensionAllowed) {
      cb(null, true);
      return;
    }
    cb(new Error(errorMessage));
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
    },
  });
};

export default uploader;
