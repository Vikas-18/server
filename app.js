const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cors = require("cors");
const app = express();

const password = process.env.NODE_MAILER_PASSWORD;
const secretkey = process.env.SECRET_KEY;
const port = process.env.PORT;
const dbURL = process.env.DB_URL;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // e.g., 'smtp.gmail.com'
  port: 465,
  secure: true,
  auth: {
    user: "hostelchatbot544@gmail.com",
    pass: password,
  },
});

// Connect to MongoDB
mongoose
  .connect(dbURL /*atlas string */, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB", error);
  });

// Middleware to parse the request body
app.use(cors()); //cors principal so that frontend can connect with backend
app.use(express.json()); // Add this line to parse JSON data

/*


login post api


*/

// Define a schema
const userSchema = new mongoose.Schema({
  enrollmentNumber: Number,
  password: String,
});
const enrollementNumberSchema = new mongoose.Schema({
  enrollmentNumber: Number,
});
// // Create a model (collection)---> in database it will be saved as plural
const User = mongoose.model("User", userSchema);
const EnrollmentNumber = mongoose.model(
  "EnrollmentNumber",
  enrollementNumberSchema
);

// POST endpoint to insert data into MongoDB
app.post("/login", (req, res) => {
  const { enrollmentNumber, password } = req.body;

  // Check if the enrollmentNumber exists in the enrollmentnumber collection
  EnrollmentNumber.findOne({ enrollmentNumber })
    .then((existingEnrollmentNumber) => {
      if (!existingEnrollmentNumber) {
        return res.status(404).json({
          success: false,
          message: "Enrollment number does not exist.",
        });
      }

      // Check if the password exists in the UserPassword collection
      UserPassword.findOne({ password })
        .then((existingPassword) => {
          if (!existingPassword) {
            return res.status(401).json({
              success: false,
              message: "Incorrect password.",
            });
          }

          // Check if the user already exists
          User.findOne({ enrollmentNumber })
            .then((existingUser) => {
              if (existingUser) {
                return res.status(409).json({
                  success: false,
                  message: "User already exists.",
                });
              }

              // Create a new user instance
              const user = new User({ enrollmentNumber, password });

              // Save the user to MongoDB
              user
                .save()
                .then(() => {
                  // Generate a JWT token
                  const token = jwt.sign(
                    {
                      enrollmentNumber:
                        existingEnrollmentNumber.enrollmentNumber,
                    },
                    secretkey,
                    { expiresIn: "1h" }
                  );

                  res.json({
                    success: true,
                    message: "User logged in successfully.",
                    token: token,
                  });
                })
                .catch((error) => {
                  res
                    .status(500)
                    .json({ success: false, error: error.message });
                });
            })
            .catch((error) => {
              res.status(500).json({ success: false, error: error.message });
            });
        })
        .catch((error) => {
          res.status(500).json({ success: false, error: error.message });
        });
    })
    .catch((error) => {
      res.status(500).json({ success: false, error: error.message });
    });
});

/*


signup post api 


*/
const passwordSchema = new mongoose.Schema({
  email: String,
  password: String,
  cpassword: String,
});

// Create a model (collection)---> in database it will be saved as plural
const UserPassword = mongoose.model("UserPassword", passwordSchema);

// POST endpoint to insert data into MongoDB
app.post("/signup", (req, res) => {
  const { email, password, cpassword } = req.body;

  // Check if the user already exists
  UserPassword.findOne({ email })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists.",
        });
      }

      // Create a new user instance
      const user = new UserPassword({ email, password, cpassword });

      // Save the user to MongoDB
      user
        .save()
        .then(() => {
          // Send email to user
          const mailOptions = {
            from: "hostelchatbot544@gmail.com",
            to: email,
            subject: "Registration Confirmation",
            text: `Congratulations! You have successfully registered, Here is your Password:${password} `,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("Error sending email:", error);
            } else {
              console.log("Email sent:", info.response);
            }
          });

          res.json({ success: true, message: "User created successfully." });
        })
        .catch((error) => {
          res.status(500).json({ success: false, error: error.message });
        });
    })
    .catch((error) => {
      res.status(500).json({ success: false, error: error.message });
    });
});
/*

post api for complain registration

*/

const complainSchema = new mongoose.Schema({
  name: String,
  contact: Number,
  hostel: String,
  room: Number,
  problem: String,
  comment: String,
  completed: { type: Boolean, default: false }, // Added 'completed' field with default value
});

// Create a model (collection) --> in the database, it will be saved as plural
const complain = mongoose.model("complain", complainSchema);

app.post("/complain", (req, res) => {
  const { name, contact, hostel, room, problem, comment } = req.body;
  const complaint = new complain({
    name,
    contact,
    hostel,
    room,
    problem,
    comment,
  });
  complaint
    .save()
    .then((savedComplaint) => {
      res.json({
        success: true,
        message: "Complaint registered successfully.",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

/*

put api for persisting the state of checkbox

*/

app.put("/complain/:id", (req, res) => {
  const complainId = req.params.id;
  const { completed } = req.body;

  complain
    .findByIdAndUpdate(complainId, { completed }, { new: true })
    .then((updatedComplain) => {
      if (!updatedComplain) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      res.json({ success: true, message: "Complaint updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

/*

get api for showing the table content

*/

app.get("/complain", (req, res) => {
  const { searchQuery, sortBy } = req.query;
  const query = {};

  if (searchQuery) {
    query.problem = searchQuery;
  }

  let sortOptions = {};

  if (sortBy) {
    sortOptions = { problem: sortBy };
  }

  complain
    .find(query)
    .sort(sortOptions)
    .then((complains) => {
      res.json(complains);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

//server listening of port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
