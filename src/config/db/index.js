const mongoose = require('mongoose');

async function connect() {
  try {
    await mongoose.connect(
      'mongodb+srv://gambon:Siliemnguyen4201pro@cluster0.elnkn.mongodb.net/job-board',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Connected')
  } catch (error) {
    console.log('Failed');
  }
}

module.exports = { connect };
