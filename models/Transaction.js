const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["checkout", "checkin"],
      required: true,
    },
    documentPath: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    checkoutDate: {
      type: Date,
      default: null,
    },
    checkinDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);