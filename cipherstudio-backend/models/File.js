import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["file", "folder"],
      required: true
    },
    path: {
      type: String,
      required: true
    },
    content: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

fileSchema.index({ projectId: 1, path: 1 }, { unique: true });

const File = mongoose.model("File", fileSchema);

export default File;
