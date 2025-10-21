import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    collaborators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    name: {
      type: String,
      required: true,
      trim: true
    },
    provider: {
      type: String,
      enum: ["github", null],
      default: null
    },
    remoteUrl: {
      type: String,
      default: null
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
