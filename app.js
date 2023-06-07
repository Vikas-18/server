const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cors = require("cors");
const app = express();

const password = process.env.NODE_MAILER_PASSWORD;
const secretkey = process.env.SECRET_KEY;
const port = process.env.PORT || 5000;
const dbURL = process.env.DB_URL;
const key1 = process.env.KEY_H;
const key2 = process.env.KEY_I;
const key3 = process.env.KEY_P;
const key4 = process.env.KEY_SN;
const key5 = process.env.KEY_MN;
const key6 = process.env.KEY_C;
const key7 = process.env.KEY_ML;
const key8 = process.env.KEY_K;
const key9 = process.env.KEY_SR;

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
          // Create a new user instance
          const user = new User({ enrollmentNumber, password });

          // Save the user to MongoDB
          user
            .save()
            .then(() => {
              // Generate a JWT token
              const token = jwt.sign(
                {
                  enrollmentNumber: existingEnrollmentNumber.enrollmentNumber,
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

      // Check if the password already exists
      UserPassword.findOne({ password })
        .then((existingPassword) => {
          if (existingPassword) {
            return res.status(409).json({
              success: false,
              message: "Password already exists.",
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

              res.json({
                success: true,
                message: "User created successfully.",
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

post api for complain registration

*/

const complainSchema = new mongoose.Schema({
  name: String,
  email: String,
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
  const { name, email, contact, hostel, room, problem, comment } = req.body;
  const complaint = new complain({
    name,
    email,
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

      // Send email if the problem is marked as resolved
      if (completed) {
        sendEmail(updatedComplain);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

const sendEmail = (complain) => {
  // Compose the email message
  const mailOptions = {
    from: "hostelchatbot544@gmail.com",
    to: complain.email,
    subject: "Complaint Resolution",
    text: `Dear ${complain.name},\n\nYour complaint regarding ${complain.problem} has been resolved. Thank you for bringing it to our attention.\n\nBest regards,\nThe Warden`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

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

/*

post api for hostel wise search

*/

app.post("/admin", (req, res) => {
  const { key } = req.body;

  let hostel1;
  if (key === key1) hostel1 = "Hostel-Mahanadi";
  else if (key === key2) hostel1 = "Hostel-Indrawati";
  else if (key === key3) hostel1 = "PG Hostel";
  else if (key === key4) hostel1 = "Seonath";
  else if (key === key5) hostel1 = "Hostel-Mainput";
  else if (key === key6) hostel1 = "Hostel-Chitrakot";
  else if (key === key7) hostel1 = "Hostel-Malhar";
  else if (key === key8) hostel1 = "Hostel-Kotumsar";
  else if (key === key9) hostel1 = "Hostel-Sirpur";

  if (hostel1) {
    complain
      .find({ hostel: hostel1 })
      .then((complains) => {
        res.status(200).json({ complains });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      });
  } else {
    res.status(400).json({ error: "Invalid Key" });
  }
});

/*

get api for hostel wise search 

*/
app.get("/admin/:key", (req, res) => {
  const { key } = req.params;

  let hostel1;
  if (key === key1) hostel1 = "Hostel-Mahanadi";
  else if (key === key2) hostel1 = "Hostel-Indrawati";
  else if (key === key3) hostel1 = "PG Hostel";
  else if (key === key4) hostel1 = "Seonath";
  else if (key === key5) hostel1 = "Hostel-Mainput";
  else if (key === key6) hostel1 = "Hostel-Chitrakot";
  else if (key === key7) hostel1 = "Hostel-Malhar";
  else if (key === key8) hostel1 = "Hostel-Kotumsar";
  else if (key === key9) hostel1 = "Hostel-Sirpur";

  if (hostel1) {
    complain
      .find({ hostel: hostel1 })
      .then((complains) => {
        res.status(200).json({ complains });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
      });
  } else {
    res.status(400).json({ error: "Invalid Key" });
  }
});

//server listening of port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
