const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, "Please add a campus email"],
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: [true, "Please add a password hash"]
    },
    university: {
      type: String,
      required: [true, "Please add a university"],
      trim: true
    },
    studentId: {
      type: String,
      trim: true
    },
    degree: {
      type: String,
      default: "Not specified",
      trim: true
    },
    yearOfStudy: {
      type: String,
      enum: ["1st", "2nd", "3rd", "4th", "postgrad", "1st Year", "2nd Year", "3rd Year", "4th Year", "Postgrad"],
      default: "1st Year",
      alias: "year",
      trim: true
    },
    campus: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.virtual("username").get(function getUsername() {
  return this.name;
});

module.exports = mongoose.model("User", userSchema);
