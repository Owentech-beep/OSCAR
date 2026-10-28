import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { User } from "../models/User.js";
import { requireAuth, requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },
}).single("document");

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "documents",
  });
}

function serviceError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

async function loadAccount(req, res, next) {
  try {
    const account = await User.findById(req.session.user.id)
      .select("role active")
      .lean();

    if (
      !account?.active ||
      !["owner", "admin", "staff"].includes(account.role)
    ) {
      throw serviceError("Document access is not permitted.", 403);
    }

    res.locals.canManageDocuments =
      ["owner", "admin"].includes(account.role);

    next();
  } catch (error) {
    next(error);
  }
}

function requireDocumentManager(req, res, next) {
  if (!res.locals.canManageDocuments) {
    return next(
      serviceError("Only owners and admins can upload or delete documents.", 403),
    );
  }

  next();
}

function receiveUpload(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();

    return next(
      serviceError(
        error.code === "LIMIT_FILE_SIZE"
          ? "The file exceeds the 10 MB limit."
          : "Upload one PDF, PNG, or JPEG file.",
        error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
      ),
    );
  });
}

function inspectFile(file) {
  if (!file?.buffer?.length) {
    throw serviceError("Choose a non-empty file.", 400);
  }

  const name = file.originalname
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();

  if (!name || name.length > 180) {
    throw serviceError("Use a filename between 1 and 180 characters.", 400);
  }

  const bytes = file.buffer;
  let mimeType;

  if (
    /\.pdf$/i.test(name) &&
    bytes.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    mimeType = "application/pdf";
  } else if (
    /\.png$/i.test(name) &&
    bytes.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  ) {
    mimeType = "image/png";
  } else if (
    /\.jpe?g$/i.test(name) &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    mimeType = "image/jpeg";
  } else {
    throw serviceError(
      "Only PDF, PNG, and JPEG files with matching file contents are supported.",
      400,
    );
  }

  return { name, mimeType };
}

function parseId(value) {
  if (!/^[a-fA-F0-9]{24}$/.test(value)) {
    throw serviceError("Invalid document ID.", 400);
  }

  return new mongoose.Types.ObjectId(value);
}

async function findDocument(id) {
  const document = await bucket().find({ _id: id }).next();

  if (!document) {
    throw serviceError("Document not found.", 404);
  }

  return document;
}

router.get("/documents", requireAuth, loadAccount, async (req, res, next) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 100)
        : "";

    const requestedPage = Number(req.query.page);
    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? Math.min(requestedPage, 100000)
        : 1;

    const limit = 20;

    const filter = search
      ? {
          filename: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        }
      : {};

    const files = mongoose.connection.db.collection("documents.files");

    const [documents, total] = await Promise.all([
      files.find(filter)
        .sort({ uploadDate: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      files.countDocuments(filter),
    ]);

    res.setHeader("Cache-Control", "private, no-store");

    return res.render("documents/index", {
      title: "Documents",
      csrfToken: req.session.csrfToken,
      canManageDocuments: res.locals.canManageDocuments,
      documents,
      search,
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

router.use("/api/documents", requireApiAuth, loadAccount);

router.post(
  "/api/documents",
  requireDocumentManager,
  receiveUpload,
  async (req, res, next) => {
    let stream;

    try {
      const { name, mimeType } = inspectFile(req.file);

      stream = bucket().openUploadStream(name, {
        metadata: {
          mimeType,
          uploadedBy: req.session.user.id,
        },
      });

      await pipeline(Readable.from([req.file.buffer]), stream);

      return res.status(201).json({
        success: true,
        data: {
          id: stream.id.toString(),
          filename: name,
        },
      });
    } catch (error) {
      if (stream) {
        try {
          await stream.abort();
        } catch (cleanupError) {
          console.error("Document upload cleanup failed:", cleanupError.message);
        }
      }

      next(error);
    }
  },
);

router.get("/api/documents/:id/download", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const document = await findDocument(id);

    const safeName =
      document.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`,
    );
    res.setHeader("Content-Length", String(document.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    await pipeline(bucket().openDownloadStream(id), res);
  } catch (error) {
    if (res.headersSent || res.destroyed) {
      if (!res.destroyed) res.destroy(error);
      return;
    }

    res.removeHeader("Content-Disposition");
    res.removeHeader("Content-Length");
    next(error);
  }
});

router.delete(
  "/api/documents/:id",
  requireDocumentManager,
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      await findDocument(id);
      await bucket().delete(id);

      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// Errors from this router's API endpoints.
router.use((error, req, res, next) => {
  if (!req.originalUrl.startsWith("/api/documents")) {
    return next(error);
  }

  if (res.headersSent || res.destroyed) {
    return next(error);
  }

  const status = error.statusCode || 500;

  if (status >= 500) {
    console.error("Documents API error:", error);
  }

  return res.status(status).json({
    success: false,
    error: status >= 500
      ? "The document operation failed. Please refresh and try again."
      : error.message,
  });
});

export default router;